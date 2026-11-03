import { describe, expect, it } from "vitest";
import {
  curveMax,
  curvePath,
  curvePeak,
  curvePoints,
  curveWash,
  type PowerPoint,
} from "../../src/lib/powerCurve";

const t0 = Date.parse("2026-10-29T12:00:00Z");
const quarter = 15 * 60e3;
const raw = (i: number, production: number | null, consumption: number | null) => ({
  time: new Date(t0 + i * quarter).toISOString(),
  production,
  consumption,
});

describe("curvePoints", () => {
  it("keeps the quarter hours before now and ends at now's live values", () => {
    const now: PowerPoint = { t: t0 + 2.5 * quarter, production: 900, consumption: 1200 };
    const points = curvePoints([raw(0, 100, 500), raw(1, 200, 600), raw(2, 300, 700), raw(3, 400, 800)], now);
    expect(points.map((p) => p.production)).toEqual([100, 200, 300, 900]);
    expect(points.at(-1)).toBe(now);
  });

  it("drops a quarter stamped at or after now", () => {
    const now: PowerPoint = { t: t0 + quarter, production: 1, consumption: 1 };
    expect(curvePoints([raw(0, 1, 1), raw(1, 2, 2)], now)).toHaveLength(2);
  });
});

describe("curveMax", () => {
  it("is the highest of either line, and at least the floor", () => {
    const points: PowerPoint[] = [
      { t: 1, production: 500, consumption: 2500 },
      { t: 2, production: 3000, consumption: null },
    ];
    expect(curveMax(points)).toBe(3000);
    expect(curveMax([{ t: 1, production: 10, consumption: 20 }])).toBe(1000);
    expect(curveMax([], 50)).toBe(50);
  });
});

describe("curvePath", () => {
  const xOf = (t: number) => t;
  const yOf = (w: number) => 100 - w / 10;

  it("draws one line, lifting the pen over a null", () => {
    const points: PowerPoint[] = [
      { t: 0, production: 100, consumption: 0 },
      { t: 1, production: 200, consumption: 0 },
      { t: 2, production: null, consumption: 0 },
      { t: 3, production: 300, consumption: 0 },
    ];
    expect(curvePath(points, "production", xOf, yOf)).toBe("M0.0,90.0L1.0,80.0M3.0,70.0");
  });

  it("is empty with nothing to draw", () => {
    expect(curvePath([{ t: 0, production: null, consumption: null }], "consumption", xOf, yOf)).toBe("");
  });
});

describe("curveWash", () => {
  it("closes each run down to the baseline", () => {
    expect(curveWash("M0.0,90.0L1.0,80.0M3.0,70.0", 100)).toBe(
      "M0.0,100L0.0,90.0L1.0,80.0L1.0,100ZM3.0,100L3.0,70.0L3.0,100Z",
    );
  });

  it("is empty for an empty path", () => {
    expect(curveWash("", 100)).toBe("");
  });
});

describe("curvePeak", () => {
  it("is the point with the most solar, or nothing when there was none", () => {
    const points: PowerPoint[] = [
      { t: 1, production: 100, consumption: 0 },
      { t: 2, production: 900, consumption: 0 },
      { t: 3, production: 400, consumption: 0 },
    ];
    expect(curvePeak(points)?.t).toBe(2);
    expect(curvePeak([{ t: 1, production: 0, consumption: 5 }])).toBeNull();
    expect(curvePeak([{ t: 1, production: null, consumption: 5 }])).toBeNull();
  });
});
