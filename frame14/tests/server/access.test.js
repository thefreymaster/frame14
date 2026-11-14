import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import express from "express";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// 0.168.0: who is signed in. access.js reads the token Cloudflare Access
// adds to a request; here a local server stands in for the team's keys page,
// and the "team" is a real RSA key pair, so every signature is really checked.

const ISSUER = "https://e2e.cloudflareaccess.com";

function keyPair(kid) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  return { kid, privateKey, jwk: { ...publicKey.export({ format: "jwk" }), kid, alg: "RS256", use: "sig" } };
}

const b64 = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");

/** A token as Access issues one, signed by `key`. */
function token(key, claims = {}, head = {}) {
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64({ alg: "RS256", kid: key.kid, typ: "JWT", ...head })}.${b64({
    iss: ISSUER,
    aud: ["app-aud"],
    email: "Evan@Example.com",
    type: "app",
    sub: "user-1",
    iat: now,
    nbf: now,
    exp: now + 3600,
    ...claims,
  })}`;
  return `${body}.${crypto.sign("RSA-SHA256", Buffer.from(body), key.privateKey).toString("base64url")}`;
}

const team = keyPair("key-1");
const rotated = keyPair("key-2");
const stranger = keyPair("key-1"); // Another key under the team's key id.

let certs;
let certsUrl;
let served = [team.jwk];
let fetches = 0;
let status = 200;

beforeAll(async () => {
  certs = http.createServer((_req, res) => {
    fetches += 1;
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify({ keys: served }));
  });
  await new Promise((done) => certs.listen(0, "127.0.0.1", done));
  certsUrl = `http://127.0.0.1:${certs.address().port}/cdn-cgi/access/certs`;
});

afterAll(() => new Promise((done) => certs.close(done)));

let dir;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "frame14-people-"));
  process.env.FRAME14_DATA_DIR = dir;
  served = [team.jwk];
  fetches = 0;
  status = 200;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.FRAME14_DATA_DIR;
  delete process.env.CLOUDFLARE_ACCESS_TEAM;
  fs.rmSync(dir, { recursive: true, force: true });
});

/** Fresh modules, as after a restart. */
async function load() {
  vi.resetModules();
  return { ...(await import("../../access.js")), ...(await import("../../people.js")) };
}

describe("the team a token must come from", () => {
  it("is a team's name or its cloudflareaccess.com address, in any form", async () => {
    const { accessIssuer } = await load();
    for (const form of ["e2e", " E2E ", "e2e.cloudflareaccess.com", "https://e2e.cloudflareaccess.com", "https://e2e.cloudflareaccess.com/cdn-cgi/access/certs"]) {
      expect(accessIssuer(form), form).toBe(ISSUER);
    }
    for (const not of ["", null, undefined, "evil.example.com", "e2e.cloudflareaccess.com.evil.example", "a b", "https://"]) {
      expect(accessIssuer(not), String(not)).toBe("");
    }
  });

  it("names nobody, and asks Cloudflare nothing, without one", async () => {
    const { startAccess } = await load();
    const access = startAccess({ team: "", certsUrl });
    expect(access.enabled).toBe(false);
    expect(await access.identify({ "cf-access-jwt-assertion": token(team) })).toBeNull();
    expect(fetches).toBe(0);
    // A value that is no team says so in the log, and is off too.
    const wrong = startAccess({ team: "evil.example.com", certsUrl });
    expect(wrong.enabled).toBe(false);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("cloudflare_access_team"));
  });
});

describe("reading who a request is from", () => {
  it("names the bearer of a token the team signed, from the header or the browser's cookie", async () => {
    const { startAccess } = await load();
    const access = startAccess({ team: "e2e", certsUrl });
    expect(access.enabled).toBe(true);
    // The email as one address: lower case.
    expect(await access.identify({ "cf-access-jwt-assertion": token(team) })).toEqual({ email: "evan@example.com" });
    const liz = token(team, { email: "liz@example.com" });
    expect(await access.identify({ cookie: `theme=dark; CF_Authorization=${liz}; other=1` })).toEqual({ email: "liz@example.com" });
    // The header is Access's own word; it wins over a cookie.
    expect(await access.identify({ "cf-access-jwt-assertion": token(team), cookie: `CF_Authorization=${liz}` })).toEqual({ email: "evan@example.com" });
  });

  it("names nobody for a request with no token", async () => {
    const { startAccess } = await load();
    const access = startAccess({ team: "e2e", certsUrl });
    for (const headers of [{}, { cookie: "theme=dark" }, { cookie: "CF_Authorization=" }, { "cf-access-jwt-assertion": "" }, undefined]) {
      expect(await access.identify(headers)).toBeNull();
    }
    expect(fetches).toBe(0);
  });

  it("isn't taken in by a token the team didn't sign, or one that isn't good now", async () => {
    const { startAccess } = await load();
    const access = startAccess({ team: "e2e", certsUrl });
    const good = token(team);
    const [head, body, signature] = good.split(".");
    const now = Math.floor(Date.now() / 1000);
    const forged = {
      "another key under the team's key id": token(stranger),
      "a body changed after signing": `${head}.${b64({ iss: ISSUER, email: "mallory@example.com", exp: now + 3600 })}.${signature}`,
      "another team's token": token(team, { iss: "https://other.cloudflareaccess.com" }),
      "an expired one": token(team, { exp: now - 3600 }),
      "one not good yet": token(team, { nbf: now + 3600 }),
      "one with no expiry": token(team, { exp: undefined }),
      "an unsigned one": `${b64({ alg: "none", kid: "key-1" })}.${body}.`,
      "one signed some other way": token(team, {}, { alg: "HS256" }),
      "a key the team doesn't have": token(keyPair("key-9")),
      "a service token, which has no email": token(team, { email: undefined, common_name: "abc.access" }),
      "an email that isn't one": token(team, { email: "not an address" }),
      "two parts": `${head}.${body}`,
      "not a token": "hello",
      "an enormous one": "a".repeat(9000),
    };
    for (const [what, value] of Object.entries(forged)) {
      expect(await access.identify({ "cf-access-jwt-assertion": value }), what).toBeNull();
    }
    // And the real one still reads.
    expect(await access.identify({ "cf-access-jwt-assertion": good })).toEqual({ email: "evan@example.com" });
  });

  it("stops naming the bearer of a token once it has expired", async () => {
    const { startAccess } = await load();
    let now = Date.now();
    const access = startAccess({ team: "e2e", certsUrl, now: () => now });
    const short = token(team, { exp: Math.floor(now / 1000) + 600 });
    expect(await access.identify({ "cf-access-jwt-assertion": short })).toEqual({ email: "evan@example.com" });
    now += 20 * 60 * 1000;
    expect(await access.identify({ "cf-access-jwt-assertion": short })).toBeNull();
  });
});

describe("the team's keys", () => {
  it("are fetched once, however many requests come", async () => {
    const { startAccess } = await load();
    const access = startAccess({ team: "e2e", certsUrl });
    const tokens = ["a", "b", "c", "d"].map((n) => token(team, { email: `${n}@example.com` }));
    const users = await Promise.all(tokens.map((t) => access.identify({ "cf-access-jwt-assertion": t })));
    expect(users.map((u) => u?.email)).toEqual(["a@example.com", "b@example.com", "c@example.com", "d@example.com"]);
    await access.identify({ "cf-access-jwt-assertion": tokens[0] });
    expect(fetches).toBe(1);
  });

  it("are fetched again for a key not seen before, as after a rotation, but not for every unknown one", async () => {
    const { startAccess, KEYS_RETRY_MS } = await load();
    let now = Date.now();
    const access = startAccess({ team: "e2e", certsUrl, now: () => now });
    expect(await access.identify({ "cf-access-jwt-assertion": token(team) })).not.toBeNull();
    expect(fetches).toBe(1);
    // Cloudflare rotates: a token under the new key isn't known yet, and a
    // minute hasn't passed since the keys were asked for.
    served = [rotated.jwk];
    const fresh = token(rotated, { email: "liz@example.com" });
    expect(await access.identify({ "cf-access-jwt-assertion": fresh })).toBeNull();
    expect(fetches).toBe(1);
    now += KEYS_RETRY_MS;
    expect(await access.identify({ "cf-access-jwt-assertion": fresh })).toEqual({ email: "liz@example.com" });
    expect(fetches).toBe(2);
    // The key that was rotated out signs nothing new.
    expect(await access.identify({ "cf-access-jwt-assertion": token(team, { email: "old@example.com" }) })).toBeNull();
  });

  it("failing to arrive names nobody rather than throwing, and is tried again later", async () => {
    const { startAccess, KEYS_RETRY_MS } = await load();
    let now = Date.now();
    status = 503;
    const access = startAccess({ team: "e2e", certsUrl, now: () => now });
    const t = token(team);
    expect(await access.identify({ "cf-access-jwt-assertion": t })).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("couldn't fetch the team's keys"), expect.any(String));
    status = 200;
    now += KEYS_RETRY_MS;
    expect(await access.identify({ "cf-access-jwt-assertion": t })).toEqual({ email: "evan@example.com" });
    // An address nothing listens at is the same: nobody, no rejection.
    const lost = startAccess({ team: "e2e", certsUrl: "http://127.0.0.1:1/certs" });
    expect(await lost.identify({ "cf-access-jwt-assertion": t })).toBeNull();
  });
});

describe("who is signed in", () => {
  it("lists a person by device, here now while a page of theirs is open", async () => {
    const { startPeople } = await load();
    let now = Date.parse("2026-11-14T15:00:00Z");
    const onChange = vi.fn();
    const people = startPeople({ now: () => now, onChange });
    expect(people.list()).toEqual([]);
    people.arrive("s1", "evan@example.com", "iPhone");
    expect(people.list()).toEqual([
      { email: "evan@example.com", device: "iPhone", online: true, lastSeen: "2026-11-14T15:00:00.000Z" },
    ]);
    expect(onChange).toHaveBeenCalledTimes(1);
    // A second page on the same kind of device is the same row, and it is
    // here until both have gone.
    people.arrive("s2", "evan@example.com", "iPhone");
    expect(people.list()).toHaveLength(1);
    people.leave("s1");
    expect(people.list()[0].online).toBe(true);
    now += 5 * 60 * 1000;
    people.leave("s2");
    expect(people.list()).toEqual([
      { email: "evan@example.com", device: "iPhone", online: false, lastSeen: "2026-11-14T15:05:00.000Z" },
    ]);
    expect(onChange).toHaveBeenCalledTimes(4);
    // A socket that never arrived — nobody Access named — changes nothing.
    people.leave("unknown");
    expect(onChange).toHaveBeenCalledTimes(4);
  });

  it("puts those here now first, by name, then the rest, the latest first", async () => {
    const { startPeople } = await load();
    let now = Date.parse("2026-11-14T15:00:00Z");
    const people = startPeople({ now: () => now });
    people.arrive("a", "zoe@example.com", "Mac");
    people.leave("a");
    now += 60_000;
    people.arrive("b", "liz@example.com", "iPad");
    people.leave("b");
    now += 60_000;
    people.arrive("c", "liz@example.com", "iPhone");
    people.arrive("d", "evan@example.com", "Windows PC");
    // A kind of device nobody listed is a Browser; nobody is nobody.
    people.arrive("e", "evan@example.com", "<b>Toaster</b>");
    people.arrive("f", "", "Mac");
    people.arrive("g", undefined, "Mac");
    expect(people.list().map((p) => `${p.email} ${p.device} ${p.online}`)).toEqual([
      "evan@example.com Browser true",
      "evan@example.com Windows PC true",
      "liz@example.com iPhone true",
      "liz@example.com iPad false",
      "zoe@example.com Mac false",
    ]);
  });

  it("is kept across a restart, where nobody is here until they come back", async () => {
    const first = (await load()).startPeople({ now: () => Date.parse("2026-11-14T15:00:00Z") });
    first.arrive("s1", "evan@example.com", "Mac");
    const second = (await load()).startPeople({ now: () => Date.parse("2026-11-14T16:00:00Z") });
    expect(second.list()).toEqual([
      { email: "evan@example.com", device: "Mac", online: false, lastSeen: "2026-11-14T15:00:00.000Z" },
    ]);
    second.arrive("s9", "evan@example.com", "Mac");
    expect(second.list()).toEqual([
      { email: "evan@example.com", device: "Mac", online: true, lastSeen: "2026-11-14T16:00:00.000Z" },
    ]);
  });

  it("forgets a device not seen in a month, and keeps no more than its limit", async () => {
    const { startPeople, PEOPLE_MAX_AGE_MS, MAX_PEOPLE } = await load();
    let now = Date.parse("2026-10-01T12:00:00Z");
    const people = startPeople({ now: () => now });
    people.arrive("old", "old@example.com", "Mac");
    people.leave("old");
    people.arrive("still", "still@example.com", "Mac");
    now += PEOPLE_MAX_AGE_MS + 60_000;
    // The one that left is forgotten; the one whose page is still open isn't.
    expect(people.list().map((p) => p.email)).toEqual(["still@example.com"]);
    for (let i = 0; i < MAX_PEOPLE + 5; i += 1) {
      now += 1000;
      people.arrive(`s${i}`, `p${i}@example.com`, "iPhone");
      people.leave(`s${i}`);
    }
    const list = people.list();
    expect(list).toHaveLength(MAX_PEOPLE);
    expect(list[0].email).toBe("still@example.com");
    expect(list[1].email).toBe(`p${MAX_PEOPLE + 4}@example.com`);
    expect(list.map((p) => p.email)).not.toContain("p0@example.com");
  });

  it("starts from nobody when its file is damaged", async () => {
    fs.writeFileSync(path.join(dir, "people.json"), "{not json");
    expect((await load()).startPeople().list()).toEqual([]);
    fs.writeFileSync(
      path.join(dir, "people.json"),
      JSON.stringify({ people: [{ email: "a@example.com", device: "Fridge", lastSeen: Date.now() }, { email: 4 }, null, { email: "b@example.com", device: "Mac", lastSeen: Date.now() }] }),
    );
    expect((await load()).startPeople().list().map((p) => p.email)).toEqual(["b@example.com"]);
  });

  it("takes the kinds of device a page calls itself, name for name", async () => {
    const { DEVICES, deviceOf } = await load();
    const { DEVICE_NAMES } = await import("../../src/lib/deviceName");
    expect([...DEVICES]).toEqual([...DEVICE_NAMES]);
    for (const name of DEVICE_NAMES) expect(deviceOf(name)).toBe(name);
    for (const other of ["Toaster", "", undefined, null, 4, {}]) expect(deviceOf(other)).toBe("Browser");
  });

  it("puts a named caller's email on a log line, and nothing for anyone else", async () => {
    const { calledBy } = await load();
    expect(calledBy({ email: "evan@example.com" })).toEqual(["by evan@example.com"]);
    for (const nobody of [undefined, null, {}, { email: "" }]) expect(calledBy(nobody)).toEqual([]);
  });
});

describe("GET /api/account", () => {
  async function app({ team }) {
    const { startAccess, startPeople } = await load();
    const { default: accountRouter } = await import("../../routes/account.js");
    const a = express();
    a.locals.access = startAccess({ team, certsUrl });
    a.locals.people = startPeople();
    a.use("/api/account", accountRouter);
    return a;
  }

  it("says who the caller is and who is signed in, and is never cached", async () => {
    const a = await app({ team: "e2e" });
    a.locals.people.arrive("s1", "liz@example.com", "iPad");
    const res = await request(a).get("/api/account").set("Cf-Access-Jwt-Assertion", token(team));
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body).toEqual({
      enabled: true,
      user: { email: "evan@example.com" },
      people: [{ email: "liz@example.com", device: "iPad", online: true, lastSeen: expect.any(String) }],
    });
  });

  it("answers a caller Access didn't sign in all the same, with nobody in it", async () => {
    const a = await app({ team: "e2e" });
    a.locals.people.arrive("s1", "liz@example.com", "iPad");
    for (const req of [request(a).get("/api/account"), request(a).get("/api/account").set("Cf-Access-Jwt-Assertion", token(stranger))]) {
      const res = await req;
      // Not refused: the house's own network isn't using Access, and works.
      expect(res.status).toBe(200);
      // The names are for those who came through Access.
      expect(res.body).toEqual({ enabled: true, user: null, people: [] });
    }
  });

  it("is off without a team: nobody is named and nobody listed", async () => {
    const a = await app({ team: "" });
    a.locals.people.arrive("s1", "liz@example.com", "iPad");
    const res = await request(a).get("/api/account").set("Cf-Access-Jwt-Assertion", token(team));
    expect(res.body).toEqual({ enabled: false, user: null, people: [] });
    expect(fetches).toBe(0);
  });
});

describe("the add-on's option", () => {
  it("turns the naming on from cloudflare_access_team", async () => {
    expect((await load()).ACCESS_ENABLED).toBe(false);
    process.env.CLOUDFLARE_ACCESS_TEAM = "e2e";
    const on = await load();
    expect(on.ACCESS_ENABLED).toBe(true);
    expect(on.startAccess().issuer).toBe(ISSUER);
  });
});
