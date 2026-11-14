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

export const deviceOf = (v) => (DEVICES.includes(v) ? v : "Browser");

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
  return seen;
}

/**
 * The people. `arrive(id, email, device)` when a named person's socket
 * connects and `leave(id)` when it closes (a socket that never arrived is
 * ignored); `list()` is `[{ email, device, online, lastSeen }]` — those here
 * now first, by name, then the rest, the latest first; `lastSeen` an ISO
 * time. `onChange()` is called after each arrival and departure.
 */
export function startPeople({ now = Date.now, onChange } = {}) {
  const seen = load();
  /** socket id → the person-and-device it is. */
  const live = new Map();

  const online = () => new Set(live.values());

  function prune() {
    const here = online();
    const oldest = now() - PEOPLE_MAX_AGE_MS;
    for (const [key, p] of seen) {
      if (p.lastSeen < oldest && !here.has(key)) seen.delete(key);
    }
    if (seen.size <= MAX_PEOPLE) return;
    const keep = [...seen.entries()]
      .sort(
        ([ka, a], [kb, b]) =>
          Number(here.has(kb)) - Number(here.has(ka)) || b.lastSeen - a.lastSeen,
      )
      .slice(0, MAX_PEOPLE);
    seen.clear();
    for (const [key, p] of keep) seen.set(key, p);
  }

  function save() {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(FILE, JSON.stringify({ people: [...seen.values()] }));
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
    list() {
      prune();
      const here = online();
      return [...seen.entries()]
        .map(([key, p]) => ({
          email: p.email,
          device: p.device,
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
