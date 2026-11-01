import type { HomeFan } from "../hooks/useHomeData";
import type { ArcScale } from "./thermostatArc";

/** A fan's speeds: quarters, as the house's fans step. */
export const FAN_STEP = 25;

/**
 * The fan dial's arc (FanControls on ThermostatDial): 0 to 100%, a drag
 * landing on a quarter, a tick every 5% so the arc reads as a scale rather
 * than five marks.
 */
export const FAN_SCALE: ArcScale = { min: 0, max: 100, step: FAN_STEP, tick: 5 };

/** A percentage on the fan's steps, within 0–100. */
export function snapFanSpeed(pct: number): number {
  return Math.max(0, Math.min(100, Math.round(pct / FAN_STEP) * FAN_STEP));
}

/**
 * The speed a fan is running at, as its dial shows it: the percentage
 * snapped; full for a fan that is on without one; 0 for a fan that is off,
 * whatever percentage the entity still carries (some keep the last speed set
 * — the tile reads 0% for those too).
 */
export function fanSpeedOf(fan: Pick<HomeFan, "state" | "percentage">): number {
  if (fan.state !== "on") return 0;
  return snapFanSpeed(fan.percentage ?? 100);
}

/** "sleep_mode" → "Sleep mode": a preset as Home Assistant names it, for people. */
export function presetLabel(preset: string | null): string | null {
  if (!preset) return null;
  const words = preset.replace(/_/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : null;
}
