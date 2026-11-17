import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./screen.js";

/**
 * Who is signed in (0.168.0): the people Cloudflare Access named (access.js),
 * by the device each is on — Settings' Account card lists them.
 *
 * A page's socket is its presence: while one of a person's devices has a
 * socket open, that device is here now (`online`); when the last one closes,
 * it was last seen then. A person on two iPhones is one row — a device is
 * its kind, which the page says of itself as it connects (src/lib/deviceName:
 * only the browser can tell an iPad from a Mac), held to the kinds listed
 * here. Kept in people.json beside the screen's file (screen.js's DATA_DIR),
 * so a restart — an add-on update — doesn't forget who was here yesterday;
 * a device not seen in PEOPLE_MAX_AGE_MS is dropped, and never more than
 * MAX_PEOPLE are kept.
 *
 * A row may be given an alias (0.173.0, the user: "let us set an alias") —
 * "Office MacBook" where the page could only say Mac. It is kept here, not
 * on the device that set it ("It should propagate across all devices so not
 * just saved to that local device"), so everyone signed in reads the same
 * one. An alias is its row's, a person on a kind of device — two Macs of one
 * person's are one row and wear one alias — and it outlives the row: a
 * device forgotten after a month away comes back under the alias it had.
 *
 * A device Access didn't name (the house's own network, the frame) is never
 * in the list.
 */

const FILE = path.join(DATA_DIR, "people.json");

/** The kinds of device a page may say it is; anything else is a Browser. */
export const DEVICES = Object.freeze([
  "iPhone",
  "iPad",
  "Mac",
  "Windows PC",
  "Android phone",
  "Android tablet",
  "Chromebook",
  "Linux PC",
  "Frame",
  "Browser",
]);
export const MAX_PEOPLE = 50;
export const PEOPLE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** An alias is at most this long (the page's field too: lib/deviceAlias). */
export const ALIAS_MAX = 40;
/** Aliases kept at most: beyond it those of devices no longer listed go, the oldest first. */
export const MAX_ALIASES = 200;

export const deviceOf = (v) => (DEVICES.includes(v) ? v : "Browser");

// What an alias may not hold: a control character, or one that turns the
// text's direction round (it would turn the rest of its row round too).
const NOT_ALIAS = /[\p{Cc}\u202A-\u202E\u2066-\u2069]/u;

/**
 * An alias as it is kept: trimmed, each run of white space one space. ""
 * for none — null or nothing but spaces, which takes a row's alias away —
 * and null for what is no alias: not text, a control character in it, or
 * longer than ALIAS_MAX.
 */
export function aliasOf(value) {
  if (value === null) return "";
  if (typeof value !== "string") return null;
  const alias = value.replace(/\s+/g, " ").trim();
  if (NOT_ALIAS.test(alias) || [...alias].length > ALIAS_MAX) return null;
  return alias;
}

/**
 * Who asked, for a log line: `["by <email>"]`, or nothing when the caller
 * isn't named — spread into the console call after what was asked.
 */
export const calledBy = (user) =>
  typeof user?.email === "string" && user.email ? [`by ${user.email}`] : [];

const keyOf = (email, device) => `${email}|${device}`;

function load() {
  let saved = null;
  try {
    saved = JSON.parse(fs.readFileSync(FILE, "utf-8"));
  } catch {
    // Nobody yet.
  }
  const seen = new Map();
  const aliases = new Map();
  for (const a of Array.isArray(saved?.aliases) ? saved.aliases : []) {
    if (typeof a?.email !== "string" || !a.email || !DEVICES.includes(a.device)) {
      continue;
    }
    const alias = aliasOf(a.alias);
    if (alias) aliases.set(keyOf(a.email, a.device), alias);
  }
  for (const p of Array.isArray(saved?.people) ? saved.people : []) {
    if (
      typeof p?.email !== "string" ||
      !p.email ||
      !DEVICES.includes(p.device) ||
      !Number.isFinite(p.lastSeen)
    ) {
      continue;
    }
    seen.set(keyOf(p.email, p.device), {
      email: p.email,
      device: p.device,
      lastSeen: p.lastSeen,
    });
  }
  return { seen, aliases };
}

/**
 * The people. `arrive(id, email, device)` when a named person's socket
 * connects and `leave(id)` when it closes (a socket that never arrived is
 * ignored); `list()` is `[{ email, device, online, lastSeen }]` — those here
 * now first, by name, then the rest, the latest first; `lastSeen` an ISO
 * time, and `alias` on a row that has one. `setAlias(email, device, alias)`
 * gives a listed row its alias — one `aliasOf` passed; "" takes it away —
 * and is false for a row nobody is in. `onChange()` is called after each
 * arrival and departure, and each alias that changes.
 */
export function startPeople({ now = Date.now, onChange } = {}) {
  const { seen, aliases } = load();
  /** socket id → the person-and-device it is. */
  const live = new Map();

  const online = () => new Set(live.values());

  function prune() {
    const here = online();
    const oldest = now() - PEOPLE_MAX_AGE_MS;
    for (const [key, p] of seen) {
      if (p.lastSeen < oldest && !here.has(key)) seen.delete(key);
    }
    if (seen.size > MAX_PEOPLE) {
      const keep = [...seen.entries()]
        .sort(
          ([ka, a], [kb, b]) =>
            Number(here.has(kb)) - Number(here.has(ka)) || b.lastSeen - a.lastSeen,
        )
        .slice(0, MAX_PEOPLE);
      seen.clear();
      for (const [key, p] of keep) seen.set(key, p);
    }
    // An alias outlives its row, but not without end: past the limit, those
    // of devices no longer listed go, the longest kept first (the listed are
    // MAX_PEOPLE at most, so that is always enough).
    for (const key of aliases.keys()) {
      if (aliases.size <= MAX_ALIASES) break;
      if (!seen.has(key)) aliases.delete(key);
    }
  }

  /** The aliases as they are saved: `[{ email, device, alias }]`, the oldest first. */
  function savedAliases() {
    return [...aliases.entries()].map(([key, alias]) => {
      // A device's name has no "|" in it, whatever an address has.
      const at = key.lastIndexOf("|");
      return { email: key.slice(0, at), device: key.slice(at + 1), alias };
    });
  }

  function save() {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(
        FILE,
        JSON.stringify({ people: [...seen.values()], aliases: savedAliases() }),
      );
    } catch (err) {
      console.error(`[people] couldn't save ${FILE}:`, err.message);
    }
  }

  function changed() {
    prune();
    save();
    onChange?.();
  }

  return {
    arrive(id, email, device) {
      if (typeof email !== "string" || !email) return;
      const kind = deviceOf(device);
      const key = keyOf(email, kind);
      live.set(id, key);
      seen.set(key, { email, device: kind, lastSeen: now() });
      changed();
    },
    leave(id) {
      const key = live.get(id);
      if (!key) return;
      live.delete(id);
      const person = seen.get(key);
      if (person) person.lastSeen = now();
      changed();
    },
    setAlias(email, device, alias) {
      prune();
      const key = keyOf(email, device);
      if (!seen.has(key)) return false;
      if ((aliases.get(key) ?? "") === alias) return true;
      // Set again, it is the newest: the last to go past the limit.
      aliases.delete(key);
      if (alias) aliases.set(key, alias);
      changed();
      return true;
    },
    list() {
      prune();
      const here = online();
      return [...seen.entries()]
        .map(([key, p]) => ({
          email: p.email,
          device: p.device,
          ...(aliases.has(key) && { alias: aliases.get(key) }),
          online: here.has(key),
          lastSeen: new Date(p.lastSeen).toISOString(),
        }))
        .sort(
          (a, b) =>
            Number(b.online) - Number(a.online) ||
            (a.online
              ? a.email.localeCompare(b.email) || a.device.localeCompare(b.device)
              : b.lastSeen.localeCompare(a.lastSeen) ||
                a.email.localeCompare(b.email)),
        );
    },
  };
}
