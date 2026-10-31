import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The frames' screen (0.129; brightness and dark hours 0.131): what the
 * add-on last asked for — on or off, and the brightness — carried out by
 * Fully Kiosk Browser on each frame (routes/screen.js sends `screen` and
 * `brightness`, src/components/ScreenListener acts on them), and what the
 * add-on runs itself, so it happens whether or not a remote is open: the
 * schedule, the hours the screen is on, and the dark hours, when the screen
 * is at its darkest. The brightness is the level the slider last set (or,
 * until it is used, the one a frame reported on arrival); outside the dark
 * hours that is the frames' level, inside them DARK_BRIGHTNESS. All of it
 * lives in a file: FRAME14_DATA_DIR when set (the tests), the add-on's
 * /data, else .data beside this file.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR =
  process.env.FRAME14_DATA_DIR ||
  (fs.existsSync("/data") ? "/data" : path.join(__dirname, ".data"));
const FILE = path.join(DATA_DIR, "screen.json");

// The hours are checked this often, so no minute is skipped.
const TICK_MS = 20_000;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_SCHEDULE = Object.freeze({
  enabled: false,
  on: "06:30",
  off: "23:00",
});
export const DEFAULT_DARK = Object.freeze({
  enabled: false,
  from: "21:00",
  to: "06:30",
});
/** Fully's brightness scale. */
export const MAX_BRIGHTNESS = 255;
/** The dark hours' level: the panel's lowest backlight, not off. */
export const DARK_BRIGHTNESS = 0;

/**
 * A pair of hours from a request body — `enabled`, and the `start` and `end`
 * keys as HH:MM, not the same — or null.
 */
function normaliseHours(input, start, end) {
  if (!input || typeof input !== "object") return null;
  const { enabled } = input;
  const from = input[start];
  const to = input[end];
  if (typeof enabled !== "boolean") return null;
  if (typeof from !== "string" || !TIME.test(from)) return null;
  if (typeof to !== "string" || !TIME.test(to)) return null;
  if (from === to) return null;
  return { enabled, [start]: from, [end]: to };
}

/** A schedule — enabled, on and off as HH:MM, and not the same — or null. */
export function normaliseSchedule(input) {
  return normaliseHours(input, "on", "off");
}

/** Dark hours — enabled, from and to as HH:MM, and not the same — or null. */
export function normaliseDark(input) {
  return normaliseHours(input, "from", "to");
}

/** A brightness — a whole number from 0 to 255, as a number or a string of digits — or null. */
export function normaliseBrightness(input) {
  const n = typeof input === "string" && /^\d+$/.test(input) ? Number(input) : input;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > MAX_BRIGHTNESS) return null;
  return n;
}

/** HH:MM of `at`, local time (the add-on's TZ is Home Assistant's). */
export function clock(at) {
  const hh = String(at.getHours()).padStart(2, "0");
  const mm = String(at.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Whether `at` is from `start` up to `end`, across midnight when `end` is the earlier time of day. */
export function between(start, end, at = new Date()) {
  const now = clock(at);
  return start < end ? now >= start && now < end : now >= start || now < end;
}

/** Whether the schedule has the screen on at `at`. */
export function scheduledOn(schedule, at = new Date()) {
  return between(schedule.on, schedule.off, at);
}

/** Whether the dark hours are on and `at` is inside them. */
export function inDarkHours(dark, at = new Date()) {
  return dark.enabled && between(dark.from, dark.to, at);
}

function load() {
  let parsed = null;
  try {
    parsed = JSON.parse(fs.readFileSync(FILE, "utf-8"));
  } catch {
    // Nothing saved yet.
  }
  // 0.129 saved the schedule by itself.
  const saved = normaliseSchedule(parsed)
    ? { schedule: parsed }
    : parsed && typeof parsed === "object"
      ? parsed
      : {};
  return {
    schedule: normaliseSchedule(saved.schedule) ?? { ...DEFAULT_SCHEDULE },
    brightness: normaliseBrightness(saved.brightness),
    dark: normaliseDark(saved.dark) ?? { ...DEFAULT_DARK },
  };
}

function save(data) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(data));
  } catch (err) {
    console.error(`[screen] couldn't save ${FILE}:`, err.message);
  }
}

/**
 * Runs the frames' screen. `state()` is what a client or a route reads;
 * `set(state)` turns the screen on or off now; `setBrightness(level)` sets
 * the level now and keeps it; `setSchedule(schedule)` and `setDark(dark)`
 * save and apply the hours; `report(level)` takes a frame's own brightness
 * as the level while none has been set; `tick()` is the minute check (every
 * TICK_MS; the tests call it through the timers); `stop()` ends it.
 */
export function startScreen(io) {
  let state = "on";
  let { schedule, brightness, dark } = load();
  let lastMinute = null;

  const snapshot = () => ({ state, schedule, brightness, dark });
  const persist = () => save({ schedule, brightness, dark });
  const tell = () => io.emit("screen_state", snapshot());

  // The level the frames should be at: the dark hours' inside them, else
  // the one set — null while none is known.
  function levelAt(at = new Date()) {
    return inDarkHours(dark, at) ? DARK_BRIGHTNESS : brightness;
  }

  function dim(level, why) {
    console.log(`[screen] brightness ${level} (${why})`);
    io.emit("brightness", level);
  }

  function set(next, why) {
    state = next;
    console.log(`[screen] ${next} (${why})`);
    io.emit("screen", next);
    // A screen coming on gets the level for now, so a wake in the dark
    // hours comes up dark and one in the day at the level set.
    if (next === "on") {
      const level = levelAt();
      if (level !== null) dim(level, why);
    }
    tell();
  }

  // The on, off, dark-from and dark-to times are edges, once a minute each.
  // Between them a frame keeps whatever it was last told, so a switch
  // flipped or a slider moved by hand holds until the next edge.
  function tick(at = new Date()) {
    const minute = clock(at);
    if (minute === lastMinute) return;
    lastMinute = minute;
    if (schedule.enabled) {
      if (minute === schedule.on) set("on", "schedule");
      else if (minute === schedule.off) set("off", "schedule");
    }
    if (dark.enabled) {
      if (minute === dark.from) dim(DARK_BRIGHTNESS, "dark hours");
      else if (minute === dark.to && brightness !== null) dim(brightness, "dark hours over");
    }
  }

  const timer = setInterval(() => tick(), TICK_MS);
  timer.unref?.();

  return {
    state: snapshot,
    set: (next) => set(next, "asked"),
    setSchedule(next) {
      schedule = next;
      persist();
      // A schedule just set says where the screen should be right now.
      if (schedule.enabled) set(scheduledOn(schedule) ? "on" : "off", "schedule saved");
      else tell();
      return snapshot();
    },
    // What is set is what shows, dark hours or not: the slider is live.
    setBrightness(level) {
      brightness = level;
      persist();
      dim(level, "asked");
      tell();
      return snapshot();
    },
    // Dark hours just set say what the level should be right now: dark
    // inside them, the one set outside (and once they are turned off).
    setDark(next) {
      dark = next;
      persist();
      const level = levelAt();
      if (level !== null) dim(level, "dark hours saved");
      tell();
      return snapshot();
    },
    // A frame says what its screen is at as it arrives: taken as the level
    // while none has been set here — outside the dark hours, inside which
    // it would be the dark level.
    report(level) {
      const n = normaliseBrightness(level);
      if (n === null || brightness !== null || inDarkHours(dark)) return;
      brightness = n;
      persist();
      console.log(`[screen] brightness ${n} (a frame reported it)`);
      tell();
    },
    tick,
    stop: () => clearInterval(timer),
  };
}
