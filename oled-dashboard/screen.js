import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The frames' screen (0.129): the state the add-on last asked for — on or
 * off, carried out by Fully Kiosk Browser on each frame (routes/screen.js
 * sends `screen`, src/components/ScreenListener acts on it) — and the
 * schedule, the hours the screen is on, which the add-on keeps and runs
 * itself, so the switch-off at night happens whether or not a remote is
 * open. The schedule lives in a file: FRAME14_DATA_DIR when set (the
 * tests), the add-on's /data, else .data beside this file.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR =
  process.env.FRAME14_DATA_DIR ||
  (fs.existsSync("/data") ? "/data" : path.join(__dirname, ".data"));
const FILE = path.join(DATA_DIR, "screen.json");

// The schedule is checked this often, so no minute is skipped.
const TICK_MS = 20_000;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_SCHEDULE = Object.freeze({
  enabled: false,
  on: "06:30",
  off: "23:00",
});

/** A schedule from a request body — enabled, on and off as HH:MM, and not the same — or null. */
export function normaliseSchedule(input) {
  if (!input || typeof input !== "object") return null;
  const { enabled, on, off } = input;
  if (typeof enabled !== "boolean") return null;
  if (typeof on !== "string" || !TIME.test(on)) return null;
  if (typeof off !== "string" || !TIME.test(off)) return null;
  if (on === off) return null;
  return { enabled, on, off };
}

/** HH:MM of `at`, local time (the add-on's TZ is Home Assistant's). */
export function clock(at) {
  const hh = String(at.getHours()).padStart(2, "0");
  const mm = String(at.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Whether the schedule has the screen on at `at`: from `on` up to `off`,
 * across midnight when `off` is the earlier time of day.
 */
export function scheduledOn(schedule, at = new Date()) {
  const now = clock(at);
  const { on, off } = schedule;
  return on < off ? now >= on && now < off : now >= on || now < off;
}

function load() {
  try {
    const saved = normaliseSchedule(JSON.parse(fs.readFileSync(FILE, "utf-8")));
    return saved ?? { ...DEFAULT_SCHEDULE };
  } catch {
    return { ...DEFAULT_SCHEDULE };
  }
}

function save(schedule) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(schedule));
  } catch (err) {
    console.error(`[screen] couldn't save ${FILE}:`, err.message);
  }
}

/**
 * Runs the frames' screen. `state()` is what a client or a route reads,
 * `set(state)` turns the screen on or off now, `setSchedule(schedule)`
 * saves and applies a schedule, `tick()` is the minute check (every
 * TICK_MS; the tests call it through the timers), `stop()` ends it.
 */
export function startScreen(io) {
  let state = "on";
  let schedule = load();
  let lastMinute = null;

  const snapshot = () => ({ state, schedule });

  function set(next, why) {
    state = next;
    console.log(`[screen] ${next} (${why})`);
    io.emit("screen", next);
    io.emit("screen_state", snapshot());
  }

  // The on and off times are edges, once a minute each. Between them a
  // frame keeps whatever it was last told, so a switch flipped by hand
  // holds until the next edge.
  function tick(at = new Date()) {
    const minute = clock(at);
    if (minute === lastMinute) return;
    lastMinute = minute;
    if (!schedule.enabled) return;
    if (minute === schedule.on) set("on", "schedule");
    else if (minute === schedule.off) set("off", "schedule");
  }

  const timer = setInterval(() => tick(), TICK_MS);
  timer.unref?.();

  return {
    state: snapshot,
    set: (next) => set(next, "asked"),
    setSchedule(next) {
      schedule = next;
      save(schedule);
      // A schedule just set says where the screen should be right now.
      if (schedule.enabled) set(scheduledOn(schedule) ? "on" : "off", "schedule saved");
      else io.emit("screen_state", snapshot());
      return snapshot();
    },
    tick,
    stop: () => clearInterval(timer),
  };
}
