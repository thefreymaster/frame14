/**
 * Geometry of the Nest-style thermostat arc: a 120° sweep across the top of a
 * 100x100 viewBox, one tick per degree from 60° to 85°. Drawn by the climate
 * dialog's dial (components/ThermostatDial.tsx).
 */
export const ARC_MIN_TEMP = 60;
export const ARC_MAX_TEMP = 85;
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

export function tFromPoint(px: number, py: number) {
  const dx = px - ARC_CENTER;
  const dy = py - ARC_CENTER;
  if (dy > 0) return px < ARC_CENTER ? 0 : 1;
  const angle = Math.atan2(dy, dx);
  const t = (angle - ARC_ANGLE_START) / ARC_ANGLE_SPAN;
  return Math.max(0, Math.min(1, t));
}

export function tToTemp(t: number) {
  return Math.round(ARC_MIN_TEMP + t * (ARC_MAX_TEMP - ARC_MIN_TEMP));
}

function tempToT(v: number) {
  const clamped = Math.max(ARC_MIN_TEMP, Math.min(ARC_MAX_TEMP, v));
  return (clamped - ARC_MIN_TEMP) / (ARC_MAX_TEMP - ARC_MIN_TEMP);
}

export function arcPath(t0: number, t1: number) {
  const p0 = polar(t0);
  const p1 = polar(t1);
  return `M ${p0.x} ${p0.y} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${p1.x} ${p1.y}`;
}

export type TickLine = {
  temp: number;
  active: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export function buildTicks(activeTemp: number | null | undefined): TickLine[] {
  const lines: TickLine[] = [];
  for (let temp = ARC_MIN_TEMP; temp <= ARC_MAX_TEMP; temp += 1) {
    const tt = tempToT(temp);
    const angle = ARC_ANGLE_START + tt * ARC_ANGLE_SPAN;
    const active = temp === activeTemp;
    const rInner = active ? 35 : 37;
    const rOuter = active ? 43 : 41;
    lines.push({
      temp,
      active,
      x1: ARC_CENTER + rInner * Math.cos(angle),
      y1: ARC_CENTER + rInner * Math.sin(angle),
      x2: ARC_CENTER + rOuter * Math.cos(angle),
      y2: ARC_CENTER + rOuter * Math.sin(angle),
    });
  }
  return lines;
}
