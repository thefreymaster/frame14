type Point = [number, number];

/** How many hours either side an hour's value is evened out over. */
const REACH = 2;

/**
 * The values evened out, so the forecast's whole degrees read as a trend
 * rather than a staircase of shelves: each the mean of the hours around it,
 * weighted down linearly to REACH hours either side (fewer near a run's ends,
 * so the first and last values stay as they are). Symmetric, so a steady rise
 * or fall is kept exactly. A null stays a null and ends a run.
 */
export function smoothValues(values: (number | null | undefined)[]): (number | null)[] {
  const out = values.map((v) => v ?? null);
  let start = 0;
  for (let end = 0; end <= values.length; end++) {
    if (end < values.length && values[end] != null) continue;
    for (let i = start; i < end; i++) {
      const reach = Math.min(REACH, i - start, end - 1 - i);
      let sum = 0;
      let weights = 0;
      for (let k = -reach; k <= reach; k++) {
        const weight = reach + 1 - Math.abs(k);
        sum += weight * values[i + k]!;
        weights += weight;
      }
      out[i] = sum / weights;
    }
    start = end + 1;
  }
  return out;
}

/**
 * A smooth line through a series of evenly spaced values: the values evened
 * out (smoothValues), then drawn as a uniform cubic B-spline with them as its
 * control points, so it has no corners. It starts on each run's first value
 * and ends on its last (the end points are tripled), stays within the values'
 * range (both steps only average, so no high or low the data doesn't have)
 * and passes each hour at `smoothLineAt`. A null lifts the pen, so a gap
 * stays a gap.
 */
export function smoothLinePath(
  values: (number | null | undefined)[],
  xOf: (i: number) => number,
  yOf: (v: number) => number,
): string {
  let d = "";
  let run: Point[] = [];
  const flush = () => {
    if (run.length > 0) d += runPath(run);
    run = [];
  };
  smoothValues(values).forEach((v, i) => {
    if (v == null) flush();
    else run.push([xOf(i), yOf(v)]);
  });
  flush();
  return d;
}

/** Where the smooth line passes hour `i`: the evened-out value there, a sixth
 *  of the way to each neighbour's (a run's ends exactly). Null where there's
 *  no value. */
export function smoothLineAt(
  values: (number | null | undefined)[],
  i: number,
): number | null {
  const smooth = smoothValues(values);
  const v = smooth[i];
  if (v == null) return null;
  const before = smooth[i - 1];
  const after = smooth[i + 1];
  return before == null || after == null ? v : (before + 4 * v + after) / 6;
}

const fmt = ([x, y]: Point) => `${x.toFixed(1)},${y.toFixed(1)}`;
/** A point made axis by axis. */
const along = (f: (axis: 0 | 1) => number): Point => [f(0), f(1)];

/** One run as Bézier segments, one per span of the spline's control points. */
function runPath(points: Point[]): string {
  const first = points[0];
  let d = `M${fmt(first)}`;
  if (points.length === 1) return d;
  const last = points[points.length - 1];
  const q = [first, first, ...points, last, last];
  for (let j = 1; j + 2 < q.length; j++) {
    const [a, b, c] = [q[j], q[j + 1], q[j + 2]];
    const c1 = along((k) => (2 * a[k] + b[k]) / 3);
    const c2 = along((k) => (a[k] + 2 * b[k]) / 3);
    const end = along((k) => (a[k] + 4 * b[k] + c[k]) / 6);
    d += `C${fmt(c1)} ${fmt(c2)} ${fmt(end)}`;
  }
  return d;
}
