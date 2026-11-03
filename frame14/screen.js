import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The frames' screen (0.129; brightness and dark hours 0.131; the room's
 * light 0.137): what the add-on last asked for — on or off, and the
 * brightness — carried out by Fully Kiosk Browser on each frame
 * (routes/screen.js sends `screen` and `brightness`,
 * src/components/ScreenListener acts on them), and what the add-on runs
 * itself, so it happens whether or not a remote is open: the schedule, the
 * hours the screen is on, the dark hours, when the screen is at its darkest,
 * and — with `auto` on — the brightness from the room's light, which a frame
 * reads off the tablet's light sensor and reports (`lux_report`, every ten
 * seconds): levelForLux puts the lux on a log curve between auto's `min` and
 * `max`, and a new level goes out when it is AUTO_STEP off the last, so a
 * passing shadow doesn't flicker the screen. The brightness is the level the
 * slider last set (or, until it is used, the one a frame reported on
 * arrival), or the room's; outside the dark hours that is the frames' level,
 * inside them DARK_BRIGHTNESS. Moving the slider turns `auto` off. All of it
 * lives in a file: FRAME14_DATA_DIR when set (the tests), the add-on's
 * /data, else .data beside this file.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR =
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
/** Brightness from the room's light: off, and the range it moves in. */
export const DEFAULT_AUTO = Object.freeze({
  enabled: false,
  min: 25,
  max: 255,
});
/** The room's light at which the brightness is at auto's `max` (a bright room, lux). */
export const LUX_FULL = 1000;
/** A new level from the room's light goes out only this far from the last. */
export const AUTO_STEP = 10;

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
  const n =
    typeof input === "string" && /^\d+$/.test(input) ? Number(input) : input;
  if (
    typeof n !== "number" ||
    !Number.isInteger(n) ||
    n < 0 ||
    n > MAX_BRIGHTNESS
  )
    return null;
  return n;
}

/**
 * Brightness from the room's light — `enabled`, and `min` and `max` levels
 * (0–255, min below max) — or null.
 */
export function normaliseAuto(input) {
  if (!input || typeof input !== "object") return null;
  const { enabled } = input;
  const min = normaliseBrightness(input.min);
  const max = normaliseBrightness(input.max);
  if (
    typeof enabled !== "boolean" ||
    min === null ||
    max === null ||
    min >= max
  )
    return null;
  return { enabled, min, max };
}

/** A light reading — a number of lux, not negative — rounded, or null. */
export function normaliseLux(input) {
  const n =
    typeof input === "string" && input.trim() !== "" ? Number(input) : input;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

/**
 * The level for a room's light: auto's `min` in the dark, `max` from LUX_FULL
 * up, and between them on a log curve, as the eye reads light — a tenth of
 * LUX_FULL is two thirds of the way.
 */
export function levelForLux(lux, auto) {
  const share = Math.min(
    1,
    Math.log10(1 + Math.max(0, lux)) / Math.log10(1 + LUX_FULL),
  );
  return Math.round(auto.min + (auto.max - auto.min) * share);
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
    auto: normaliseAuto(saved.auto) ?? { ...DEFAULT_AUTO },
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
 * save and apply the hours; `setAuto(auto)` saves the room-light setting and
 * applies its level now; `reportLux(lux)` takes a frame's reading of the
 * room and, with auto on, sets the level from it; `report(level)` takes a
 * frame's own brightness as the level while none has been set; `tick()` is
 * the minute check (every TICK_MS; the tests call it through the timers);
 * `stop()` ends it.
 */
export function startScreen(io) {
  let state = "on";
  let { schedule, brightness, dark, auto } = load();
  // The room's light as a frame last reported it; not kept across restarts.
  let lux = null;
  let lastMinute = null;

  const snapshot = () => ({ state, schedule, brightness, dark, auto, lux });
  const persist = () => save({ schedule, brightness, dark, auto });
  const tell = () => io.emit("screen_state", snapshot());

  // The level the frames should be at: the dark hours' inside them, else
  // the room's while auto is on and a frame has reported it, else the one
  // set — null while none is known.
  function levelAt(at = new Date()) {
    if (inDarkHours(dark, at)) return DARK_BRIGHTNESS;
    if (auto.enabled && lux !== null) return levelForLux(lux, auto);
    return brightness;
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
      else if (minute === dark.to) {
        // The level for now: the room's while auto is on (0.137), else the one set.
        const level = levelAt(at);
        if (level !== null) dim(level, "dark hours over");
      }
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
      if (schedule.enabled)
        set(scheduledOn(schedule) ? "on" : "off", "schedule saved");
      else tell();
      return snapshot();
    },
    // What is set is what shows, dark hours or not: the slider is live. A
    // level set by hand is the end of the room's say (0.137).
    setBrightness(level) {
      brightness = level;
      if (auto.enabled) auto = { ...auto, enabled: false };
      persist();
      dim(level, "asked");
      tell();
      return snapshot();
    },
    // The room-light setting just saved says what the level should be right
    // now — the room's, when a frame has reported it and it isn't the dark
    // hours; the slider's level stays otherwise.
    setAuto(next) {
      auto = next;
      const level = levelAt();
      if (
        auto.enabled &&
        level !== null &&
        level !== brightness &&
        !inDarkHours(dark)
      ) {
        brightness = level;
        dim(level, "room light");
      }
      persist();
      tell();
      return snapshot();
    },
    // A frame's reading of the room (lux), every ten seconds: kept for the
    // card, and with auto on — outside the dark hours — the level it calls
    // for goes out when it is AUTO_STEP off the last, so a passing shadow
    // doesn't flicker the screen.
    reportLux(value) {
      const n = normaliseLux(value);
      if (n === null) return;
      lux = n;
      if (auto.enabled && !inDarkHours(dark)) {
        const level = levelForLux(lux, auto);
        if (brightness === null || Math.abs(level - brightness) >= AUTO_STEP) {
          brightness = level;
          persist();
          dim(level, `room light ${lux} lx`);
        }
      }
      tell();
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
