import { useSyncExternalStore } from "react";
import { socket } from "./socket";

// The frames' screen (0.129): the state the add-on last asked for and the
// hours it is on, as the server has them (screen.js) — sent as
// `screen_state` on connect and after every change, so every device's
// Settings page shows the same. A frame acts on the `screen` command
// itself (components/ScreenListener); this is the setting's side.

export type ScreenPower = "on" | "off";

export interface ScreenSchedule {
  enabled: boolean;
  /** When the screen turns on, HH:MM. */
  on: string;
  /** When it turns off, HH:MM; earlier than `on` for hours across midnight. */
  off: string;
}

export interface ScreenState {
  state: ScreenPower;
  schedule: ScreenSchedule;
}

export const DEFAULT_SCREEN: ScreenState = {
  state: "on",
  schedule: { enabled: false, on: "06:30", off: "23:00" },
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
 * Save the schedule (PUT /api/screen/schedule). Shown at once, so a change
 * made while the last one is still on its way builds on it rather than on
 * what the server had; then the server's answer is applied. Resolves with
 * that answer, or null when the server refused it (the two times the same,
 * or not HH:MM) or couldn't be reached — the schedule from before is back.
 */
export async function saveScreenSchedule(
  schedule: ScreenSchedule,
): Promise<ScreenState | null> {
  const before = current.schedule;
  apply({ ...current, schedule });
  try {
    const res = await fetch("/api/screen/schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(schedule),
    });
    const next = res.ok ? ((await res.json()) as unknown) : null;
    if (!isScreenState(next)) {
      apply({ ...current, schedule: before });
      return null;
    }
    apply(next);
    return next;
  } catch {
    apply({ ...current, schedule: before });
    return null;
  }
}

function isScreenState(v: unknown): v is ScreenState {
  if (!v || typeof v !== "object") return false;
  const { state, schedule } = v as Partial<ScreenState>;
  return (
    (state === "on" || state === "off") &&
    !!schedule &&
    typeof schedule.enabled === "boolean" &&
    typeof schedule.on === "string" &&
    typeof schedule.off === "string"
  );
}

socket.on("screen_state", (v: unknown) => {
  if (isScreenState(v)) apply(v);
});
