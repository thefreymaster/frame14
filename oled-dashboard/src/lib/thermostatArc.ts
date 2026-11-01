/**
 * Geometry of the Nest-style arc: a 120° sweep across the top of a 100x100
 * viewBox, one tick per step of whatever scale it is given — the thermostat's
 * 60° to 85°, a degree a tick (THERMOSTAT_SCALE, the default), or a fan's 0 to
 * 100% (FanControls' scale: a tick every 5%, a speed every 25%). Drawn by
 * components/ThermostatDial.tsx.
 */
export type ArcScale = {
  min: number;
  max: number;
  /** What a drag lands on: `min` plus a multiple of this. */
  step: number;
  /** The tick spacing, when finer than the step; the step itself by default. */
  tick?: number;
};

export const THERMOSTAT_SCALE: ArcScale = { min: 60, max: 85, step: 1 };
export const ARC_MIN_TEMP = THERMOSTAT_SCALE.min;
export const ARC_MAX_TEMP = THERMOSTAT_SCALE.max;
const ARC_RADIUS = 44;
const ARC_CENTER = 50;
const ARC_ANGLE_START = (-Math.PI * 5) / 6;
const ARC_ANGLE_END = -Math.PI / 6;
const ARC_ANGLE_SPAN = ARC_ANGLE_END - ARC_ANGLE_START;

function polar(t: number) {
  const angle = ARC_ANGLE_START + t * ARC_ANGLE_SPAN;
  return {
    x: ARC_CENTER + ARC_RADIUS * Math.cos(angle),
    y: ARC_CENTER + ARC_RADIUS * Math.sin(angle),
  };
}

function clamp(value: number, scale: ArcScale) {
  return Math.max(scale.min, Math.min(scale.max, value));
}

export function tFromPoint(px: number, py: number) {
  const dx = px - ARC_CENTER;
  const dy = py - ARC_CENTER;
  if (dy > 0) return px < ARC_CENTER ? 0 : 1;
  const angle = Math.atan2(dy, dx);
  const t = (angle - ARC_ANGLE_START) / ARC_ANGLE_SPAN;
  return Math.max(0, Math.min(1, t));
}

/** The value at `t` along the arc, on the scale's steps and within its range. */
export function tToValue(t: number, scale: ArcScale = THERMOSTAT_SCALE) {
  const raw = scale.min + t * (scale.max - scale.min);
  const steps = Math.round((raw - scale.min) / scale.step);
  return clamp(scale.min + steps * scale.step, scale);
}

export function valueToT(value: number, scale: ArcScale = THERMOSTAT_SCALE) {
  return (clamp(value, scale) - scale.min) / (scale.max - scale.min);
}

export function arcPath(t0: number, t1: number) {
  const p0 = polar(t0);
  const p1 = polar(t1);
  return `M ${p0.x} ${p0.y} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${p1.x} ${p1.y}`;
}

export type TickLine = {
  value: number;
  active: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

/** A tick per `scale.tick` (or step) from min to max, the one at `activeValue` marked. */
export function buildTicks(
  activeValue: number | null | undefined,
  scale: ArcScale = THERMOSTAT_SCALE,
): TickLine[] {
  const spacing = scale.tick ?? scale.step;
  const count = Math.round((scale.max - scale.min) / spacing);
  const lines: TickLine[] = [];
  for (let i = 0; i <= count; i += 1) {
    const value = scale.min + i * spacing;
    const angle = ARC_ANGLE_START + valueToT(value, scale) * ARC_ANGLE_SPAN;
    const active = value === activeValue;
    const rInner = active ? 35 : 37;
    const rOuter = active ? 43 : 41;
    lines.push({
      value,
      active,
      x1: ARC_CENTER + rInner * Math.cos(angle),
      y1: ARC_CENTER + rInner * Math.sin(angle),
      x2: ARC_CENTER + rOuter * Math.cos(angle),
      y2: ARC_CENTER + rOuter * Math.sin(angle),
    });
  }
  return lines;
}
