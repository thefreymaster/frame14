import { describe, expect, it } from "vitest";
import { smoothLineAt, smoothLinePath, smoothValues } from "../../src/lib/smoothLine";

// 0.163.1: the hourly chart's temperature is a smooth line — the forecast's
// whole degrees drew a staircase of flats and corners ("I want the trend to
// not be ridged").

/** The hours' temperatures a rainy evening's forecast gave: whole degrees. */
const STAIRS = [66, 65, 65, 65, 64, 64, 64, 64, 64, 63, 62, 61, 60, 59, 58, 57, 57, 56, 55, 56, 56, 57, 57, 57];

const xOf = (i: number) => i * 10;
const yOf = (v: number) => 100 - v;

type Point = [number, number];

/** A path's runs, each its start and its cubic segments (control, control,
 *  end); throws on any other command. */
function runsOf(d: string): { start: Point; segments: Point[][] }[] {
  const nums = (s: string) => s.trim().split(/[ ,]+/).map(Number);
  const pairs = (n: number[]) => n.flatMap((v, i) => (i % 2 ? [] : [[v, n[i + 1]] as Point]));
  return d
    .split("M")
    .filter(Boolean)
    .map((run) => {
      const [start, ...curves] = run.split("C");
      expect(start).not.toMatch(/[A-Za-z]/);
      const segments = curves.map((c) => pairs(nums(c)));
      for (const s of segments) expect(s).toHaveLength(3);
      return { start: pairs(nums(start))[0], segments };
    });
}

describe("smoothLinePath", () => {
  it("is curves alone, with no corner where one meets the next", () => {
    const [run] = runsOf(smoothLinePath(STAIRS, xOf, yOf));
    expect(run.segments.length).toBeGreaterThan(STAIRS.length - 1);
    // At every join the last control point, the join and the next control
    // point lie on one line, the join halfway: the tangent carries through.
    for (let j = 1; j < run.segments.length; j++) {
      const [, before, join] = run.segments[j - 1];
      const [after] = run.segments[j];
      expect(join[0]).toBeCloseTo((before[0] + after[0]) / 2, 0);
      expect(join[1]).toBeCloseTo((before[1] + after[1]) / 2, 0);
    }
  });

  it("starts on the first value and ends on the last", () => {
    const [run] = runsOf(smoothLinePath(STAIRS, xOf, yOf));
    expect(run.start).toEqual([xOf(0), yOf(66)]);
    expect(run.segments.at(-1)!.at(-1)).toEqual([xOf(STAIRS.length - 1), yOf(57)]);
  });

  it("goes no higher or lower than the values", () => {
    const [run] = runsOf(smoothLinePath(STAIRS, xOf, yOf));
    const ys = run.segments.flat().map(([, y]) => y);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(yOf(66));
    expect(Math.max(...ys)).toBeLessThanOrEqual(yOf(55));
  });

  it("goes forward only", () => {
    const [run] = runsOf(smoothLinePath(STAIRS, xOf, yOf));
    const xs = [run.start, ...run.segments.flat()].map(([x]) => x);
    xs.slice(1).forEach((x, i) => expect(x).toBeGreaterThanOrEqual(xs[i]));
  });

  it("lifts the pen over a missing hour", () => {
    const runs = runsOf(smoothLinePath([60, 61, 62, null, 64, 65], xOf, yOf));
    expect(runs.map((r) => r.start)).toEqual([
      [xOf(0), yOf(60)],
      [xOf(4), yOf(64)],
    ]);
    expect(runs[0].segments.at(-1)!.at(-1)).toEqual([xOf(2), yOf(62)]);
  });

  it("draws two hours as a straight line, and one as nothing", () => {
    const [run] = runsOf(smoothLinePath([60, 70], xOf, yOf));
    for (const [x, y] of run.segments.flat()) expect(y).toBeCloseTo(yOf(60 + (x / 10) * 10), 5);
    expect(smoothLinePath([null, 60, null], xOf, yOf)).toBe(`M${xOf(1).toFixed(1)},${yOf(60).toFixed(1)}`);
    expect(smoothLinePath([], xOf, yOf)).toBe("");
  });
});

describe("smoothValues", () => {
  it("evens the whole degrees' shelves out: the line falls every hour to the low", () => {
    const low = STAIRS.indexOf(55);
    for (let i = 1; i <= low; i++)
      expect(smoothLineAt(STAIRS, i)!).toBeLessThan(smoothLineAt(STAIRS, i - 1)! - 0.05);
    for (let i = low + 2; i < STAIRS.length; i++)
      expect(smoothLineAt(STAIRS, i)!).toBeGreaterThan(smoothLineAt(STAIRS, i - 1)!);
  });

  it("keeps a steady rise exactly, and each run's first and last values", () => {
    const rise = Array.from({ length: 12 }, (_, i) => 50 + 1.5 * i);
    smoothValues(rise).forEach((v, i) => expect(v).toBeCloseTo(rise[i], 10));
    expect(smoothValues([60, 64, 61, null, 70, 66, 71])).toEqual([60, (60 + 2 * 64 + 61) / 4, 61, null, 70, (70 + 2 * 66 + 71) / 4, 71]);
  });

  it("stays within a degree of each hour", () => {
    smoothValues(STAIRS).forEach((v, i) => expect(Math.abs(v! - STAIRS[i])).toBeLessThan(1));
  });
});

describe("smoothLineAt", () => {
  it("is where the line passes an hour", () => {
    const [run] = runsOf(smoothLinePath(STAIRS, xOf, yOf));
    // The segment ending at hour i (after the first's short lead-in).
    for (const i of [1, 4, 8, 18]) {
      const join = run.segments[i].at(-1)!;
      expect(join[0]).toBe(xOf(i));
      expect(join[1]).toBeCloseTo(yOf(smoothLineAt(STAIRS, i)!), 1);
    }
  });

  it("is the value itself at a run's ends, and nothing where there is none", () => {
    expect(smoothLineAt(STAIRS, 0)).toBe(66);
    expect(smoothLineAt(STAIRS, STAIRS.length - 1)).toBe(57);
    expect(smoothLineAt([60, 61, null, 63], 1)).toBe(61);
    expect(smoothLineAt([60, null], 1)).toBeNull();
  });
});
