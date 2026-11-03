import { useSyncExternalStore } from "react";
import { socket } from "./socket";

// The frames' screen (0.129; brightness and dark hours 0.131; the room's
// light 0.137): the state and the brightness the add-on last asked for, the
// hours the screen is on, the dark hours and the brightness-from-the-room
// setting with the room's light as a frame last read it, as the server has
// them (screen.js) — sent as `screen_state` on connect and after every
// change, so every device's Settings page shows the same. A frame acts on
// the `screen` and `brightness` commands itself, and reads the light sensor
// (components/ScreenListener); this is the setting's side.

export type ScreenPower = "on" | "off";

export interface ScreenSchedule {
  enabled: boolean;
  /** When the screen turns on, HH:MM. */
  on: string;
  /** When it turns off, HH:MM; earlier than `on` for hours across midnight. */
  off: string;
}

export interface DarkHours {
  enabled: boolean;
  /** When the screen goes to its darkest, HH:MM. */
  from: string;
  /** When the brightness set comes back, HH:MM; earlier than `from` across midnight. */
  to: string;
}

/** Brightness from the room's light (0.137): on or off, and the range it moves in. */
export interface AutoBrightness {
  enabled: boolean;
  /** The level in the dark, 0–255. */
  min: number;
  /** The level in a bright room, 0–255, above `min`. */
  max: number;
}

export interface ScreenState {
  state: ScreenPower;
  schedule: ScreenSchedule;
  /** The level set, 0–255 — null until the slider is used or a frame reports its own. */
  brightness: number | null;
  dark: DarkHours;
  auto: AutoBrightness;
  /** The room's light as a frame last reported it, lux — null until one has. */
  lux: number | null;
}

/** Fully's brightness scale. */
export const MAX_BRIGHTNESS = 255;

export const DEFAULT_SCREEN: ScreenState = {
  state: "on",
  schedule: { enabled: false, on: "06:30", off: "23:00" },
  brightness: null,
  dark: { enabled: false, from: "21:00", to: "06:30" },
  auto: { enabled: false, min: 25, max: 255 },
  lux: null,
};

let current: ScreenState = DEFAULT_SCREEN;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  return current;
}

function apply(next: ScreenState) {
  current = next;
  listeners.forEach((cb) => cb());
}

/** The frames' screen as the server has it. */
export function useScreen(): ScreenState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Turn the frames' screen on or off now — GET /api/screen/:state, the same
 * call a Home Assistant automation makes. Shown at once; the server's
 * `screen_state` confirms it.
 */
export async function setScreen(state: ScreenPower): Promise<boolean> {
  apply({ ...current, state });
  try {
    const res = await fetch(`/api/screen/${state}`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Set the frames' brightness now — GET /api/screen/brightness/:level, 0 to
 * 255, kept by the server as the level the dark hours give back. Shown at
 * once; the server's `screen_state` confirms it.
 */
export async function setScreenBrightness(level: number): Promise<boolean> {
  apply({ ...current, brightness: level });
  try {
    const res = await fetch(`/api/screen/brightness/${level}`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Save a setting (PUT): a pair of hours, or the room-light setting. Shown at
 * once, so a change made while the last one is still on its way builds on
 * it rather than on what the server had; then the server's answer is
 * applied. Resolves with that answer, or null when the server refused it
 * (the two times the same, or not HH:MM; a range with min not below max) or
 * couldn't be reached — the setting from before is back.
 */
async function saveSetting<K extends "schedule" | "dark" | "auto">(
  url: string,
  key: K,
  setting: ScreenState[K],
): Promise<ScreenState | null> {
  const before = current[key];
  const patch = (value: ScreenState[K]) => ({
    ...current,
    ...({ [key]: value } as Pick<ScreenState, K>),
  });
  apply(patch(setting));
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(setting),
    });
    const next = res.ok ? ((await res.json()) as unknown) : null;
    if (!isScreenState(next)) {
      apply(patch(before));
      return null;
    }
    apply(next);
    return next;
  } catch {
    apply(patch(before));
    return null;
  }
}

/** Save the schedule, the hours the screen is on (PUT /api/screen/schedule). */
export function saveScreenSchedule(
  schedule: ScreenSchedule,
): Promise<ScreenState | null> {
  return saveSetting("/api/screen/schedule", "schedule", schedule);
}

/** Save the dark hours, when the screen is at its darkest (PUT /api/screen/dark). */
export function saveDarkHours(dark: DarkHours): Promise<ScreenState | null> {
  return saveSetting("/api/screen/dark", "dark", dark);
}

/** Save the brightness-from-the-room setting and its range (PUT /api/screen/auto, 0.137). */
export function saveAutoBrightness(
  auto: AutoBrightness,
): Promise<ScreenState | null> {
  return saveSetting("/api/screen/auto", "auto", auto);
}

function isHours(v: unknown, start: string, end: string): boolean {
  if (!v || typeof v !== "object") return false;
  const hours = v as Record<string, unknown>;
  return (
    typeof hours.enabled === "boolean" &&
    typeof hours[start] === "string" &&
    typeof hours[end] === "string"
  );
}

function isAuto(v: unknown): v is AutoBrightness {
  if (!v || typeof v !== "object") return false;
  const { enabled, min, max } = v as Partial<AutoBrightness>;
  return (
    typeof enabled === "boolean" &&
    typeof min === "number" &&
    typeof max === "number"
  );
}

function isScreenState(v: unknown): v is ScreenState {
  if (!v || typeof v !== "object") return false;
  const { state, schedule, brightness, dark, auto, lux } =
    v as Partial<ScreenState>;
  return (
    (state === "on" || state === "off") &&
    isHours(schedule, "on", "off") &&
    (brightness === null || typeof brightness === "number") &&
    isHours(dark, "from", "to") &&
    isAuto(auto) &&
    (lux === null || typeof lux === "number")
  );
}

socket.on("screen_state", (v: unknown) => {
  if (isScreenState(v)) apply(v);
});
