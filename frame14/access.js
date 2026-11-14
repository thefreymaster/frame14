import crypto from "node:crypto";
import { ACCESS_TEAM } from "./config.js";

/**
 * Who a request is from, when Cloudflare Access let it in (0.168.0, the
 * user: "so I can tell who is logged in", the name "from access").
 *
 * Access signs in everyone who opens the add-on at its public address, and
 * adds a token to every request it passes on — the `Cf-Access-Jwt-Assertion`
 * header, and the browser's `CF_Authorization` cookie: a JWT signed with the
 * team's key, carrying the person's email. With `cloudflare_access_team` set
 * this reads it: the signature against the team's published keys
 * (`<team>.cloudflareaccess.com/cdn-cgi/access/certs`, fetched on the first
 * token and again when one names a key not yet seen — they rotate), the
 * issuer, the dates, and then the email.
 *
 * It names people; it guards nothing. A request with no token — every device
 * on the house's own network, the frame, Home Assistant's rest_command — is
 * simply nobody, and is served as before: this is not a login. The token is
 * checked all the same, since a header is anyone's to write on that network
 * and a name nobody vouches for would be worth nothing. Only the team is
 * pinned, not the one application: a token Access issued for another of the
 * team's apps still says truthfully who its bearer is, which is all that is
 * asked here. A service token's JWT has no email and names nobody.
 *
 * Nothing here throws or rejects: a token that can't be read, or keys that
 * can't be fetched, is nobody.
 */

const TEAM_HOST = /^[a-z0-9-]+\.cloudflareaccess\.com$/;
const EMAIL = /^[^\s@]+@[^\s@]+$/;
/** An unknown key id asks Cloudflare for the keys again at most this often. */
export const KEYS_RETRY_MS = 60_000;
const FETCH_TIMEOUT_MS = 5_000;
/** Clocks differ: a token is good this long past its dates (seconds). */
const SKEW_S = 60;
const MAX_TOKEN_LENGTH = 8192;
/** Tokens already checked, so a page's requests verify one signature. */
const MAX_REMEMBERED = 200;

/**
 * The team's address as the tokens' issuer: `https://<team>.cloudflareaccess.com`
 * from the team's name or that address in any form; "" when it is neither.
 */
export function accessIssuer(team) {
  const name = String(team ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (!name) return "";
  const host = name.includes(".") ? name : `${name}.cloudflareaccess.com`;
  return TEAM_HOST.test(host) ? `https://${host}` : "";
}

/** Whether people are named at all: `cloudflare_access_team` names a team. */
export const ACCESS_ENABLED = Boolean(accessIssuer(ACCESS_TEAM));

/** The token Access put on a request: its header, else the browser's cookie. */
export function accessToken(headers) {
  const header = headers?.["cf-access-jwt-assertion"];
  if (typeof header === "string" && header) return header;
  const cookies = headers?.cookie;
  if (typeof cookies !== "string") return null;
  for (const pair of cookies.split(";")) {
    const at = pair.indexOf("=");
    if (at > 0 && pair.slice(0, at).trim() === "CF_Authorization") {
      return pair.slice(at + 1).trim() || null;
    }
  }
  return null;
}

const decode = (part) =>
  JSON.parse(Buffer.from(part, "base64url").toString("utf-8"));

/**
 * `identify(headers)` resolves to `{ email }` for a request Access signed in,
 * else null; `enabled` is whether a team is configured. `certsUrl`
 * (FRAME14_ACCESS_CERTS_URL) is where the keys are fetched instead of the
 * team's own address — the tests' stub.
 */
export function startAccess({
  team = ACCESS_TEAM,
  certsUrl = process.env.FRAME14_ACCESS_CERTS_URL,
  now = Date.now,
} = {}) {
  const issuer = accessIssuer(team);
  if (team && !issuer) {
    console.warn(
      `[access] cloudflare_access_team "${team}" is neither a team's name nor its cloudflareaccess.com address — nobody will be named`,
    );
  }
  const keysUrl = certsUrl || `${issuer}/cdn-cgi/access/certs`;
  let keys = new Map();
  let askedAt = -Infinity;
  let asking = null;
  const remembered = new Map();

  async function fetchKeys() {
    askedAt = now();
    try {
      const res = await fetch(keysUrl, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`it answered ${res.status}`);
      const body = await res.json();
      const next = new Map();
      for (const jwk of Array.isArray(body?.keys) ? body.keys : []) {
        if (typeof jwk?.kid !== "string" || jwk.kty !== "RSA") continue;
        try {
          next.set(jwk.kid, crypto.createPublicKey({ key: jwk, format: "jwk" }));
        } catch {
          // Not a key: the rest still count.
        }
      }
      // An answer with no keys in it keeps the ones already held.
      if (next.size > 0) keys = next;
    } catch (err) {
      console.warn(`[access] couldn't fetch the team's keys from ${keysUrl}:`, err.message);
    } finally {
      asking = null;
    }
  }

  /** The team's key with this id; the keys are fetched when it isn't held. */
  async function keyFor(kid) {
    if (!keys.has(kid) && now() - askedAt >= KEYS_RETRY_MS) {
      await (asking ??= fetchKeys());
    } else if (asking) {
      await asking;
    }
    return keys.get(kid) ?? null;
  }

  function remember(token, user, exp) {
    if (remembered.size >= MAX_REMEMBERED) {
      remembered.delete(remembered.keys().next().value);
    }
    remembered.set(token, { user, exp });
  }

  async function identify(headers) {
    if (!issuer) return null;
    try {
      const token = accessToken(headers);
      if (!token || token.length > MAX_TOKEN_LENGTH) return null;
      const seconds = now() / 1000;
      const known = remembered.get(token);
      if (known) {
        if (known.exp + SKEW_S > seconds) return known.user;
        remembered.delete(token);
        return null;
      }
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const head = decode(parts[0]);
      if (head?.alg !== "RS256" || typeof head.kid !== "string") return null;
      const key = await keyFor(head.kid);
      if (!key) return null;
      const signed = crypto.verify(
        "RSA-SHA256",
        Buffer.from(`${parts[0]}.${parts[1]}`),
        key,
        Buffer.from(parts[2], "base64url"),
      );
      if (!signed) return null;
      const claims = decode(parts[1]);
      if (claims?.iss !== issuer) return null;
      if (typeof claims.exp !== "number" || claims.exp + SKEW_S <= seconds) return null;
      if (typeof claims.nbf === "number" && claims.nbf - SKEW_S > seconds) return null;
      const email =
        typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
      if (email.length > 254 || !EMAIL.test(email)) return null;
      const user = Object.freeze({ email });
      remember(token, user, claims.exp);
      return user;
    } catch {
      return null;
    }
  }

  return { enabled: Boolean(issuer), issuer, identify };
}
