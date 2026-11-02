import type { EnergyTodayPoint } from "../hooks/useEnergyToday";

/** One moment on today's power curve, in ms and watts. */
export interface PowerPoint {
  t: number;
  production: number | null;
  consumption: number | null;
}

export type PowerSeries = "production" | "consumption";

/**
 * Today's curve as it is drawn: the quarter hours before `now` (the
 * statistics trail by up to a quarter hour), then now itself at the live
 * values, so both lines end at the present.
 */
export function curvePoints(raw: EnergyTodayPoint[], now: PowerPoint): PowerPoint[] {
  return [
    ...raw.map((p) => ({ ...p, t: Date.parse(p.time) })).filter((p) => p.t < now.t),
    now,
  ];
}

/** The highest value on either line, and at least `floor` W. */
export function curveMax(points: PowerPoint[], floor = 1000): number {
  return Math.max(
    floor,
    ...points.flatMap((p) => [p.production ?? 0, p.consumption ?? 0]),
  );
}

/** One line as an SVG path; a null lifts the pen, so a gap stays a gap. */
export function curvePath(
  points: PowerPoint[],
  key: PowerSeries,
  xOf: (t: number) => number,
  yOf: (w: number) => number,
): string {
  let d = "";
  let pen = false;
  for (const p of points) {
    const v = p[key];
    if (v == null) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${xOf(p.t).toFixed(1)},${yOf(v).toFixed(1)}`;
    pen = true;
  }
  return d;
}

/** The wash under a line: each of its runs closed down to the baseline. */
export function curveWash(path: string, baseY: number): string {
  return path
    .split("M")
    .filter(Boolean)
    .map((run) => {
      const coords = run.split("L");
      const first = coords[0].split(",")[0];
      const last = coords[coords.length - 1].split(",")[0];
      return `M${first},${baseY}L${run}L${last},${baseY}Z`;
    })
    .join("");
}

/** The point with the most solar on it, or null when there was none. */
export function curvePeak(points: PowerPoint[]): PowerPoint | null {
  return points.reduce<PowerPoint | null>(
    (best, p) =>
      p.production != null && p.production > (best?.production ?? 0) ? p : best,
    null,
  );
}
