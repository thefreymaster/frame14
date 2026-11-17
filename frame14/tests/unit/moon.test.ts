import { describe, expect, it } from "vitest";
import { MOON_LABEL, MOON_PHASES, moonAt, nextMoonPhase } from "../../src/lib/moon";

// 0.174.0: the moon's phase in the weather's Now card. Apple Weather, as Home
// Assistant passes it on, says nothing of the moon, so it is worked out from
// the date (lib/moon) — and checked here against the almanac.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * The moon's four moments as the almanacs give them (UTC, to the minute):
 * new, first quarter, full, last quarter. April 8 2024's new moon is the
 * total eclipse's, and January 21 2000's full moon an eclipse too.
 */
const MOMENTS: [quarter: 0 | 1 | 2 | 3, at: string][] = [
  [0, "2000-01-06T18:14Z"],
  [1, "2000-01-14T13:34Z"],
  [2, "2000-01-21T04:41Z"],
  [3, "2000-01-28T07:57Z"],
  [3, "2024-04-02T03:15Z"],
  [0, "2024-04-08T18:21Z"],
  [1, "2024-04-15T19:13Z"],
  [2, "2024-04-23T23:49Z"],
  [3, "2026-11-01T20:28Z"],
  [0, "2026-11-09T07:02Z"],
  [1, "2026-11-17T11:48Z"],
  [2, "2026-11-24T14:54Z"],
  [3, "2026-12-01T06:09Z"],
  [0, "2026-12-09T00:52Z"],
  [1, "2026-12-17T05:43Z"],
  [2, "2026-12-24T01:28Z"],
  [1, "2033-06-04T23:39Z"],
  [2, "2033-06-12T23:19Z"],
  [3, "2033-06-19T23:29Z"],
  [0, "2033-06-26T21:07Z"],
];
const NAMES = ["new", "first-quarter", "full", "last-quarter"] as const;
/** The share of the disc lit at each of the four. */
const LIT = [0, 0.5, 1, 0.5];

describe("the moon's four moments", () => {
  it.each(MOMENTS)("finds moment %i at %s within the half hour", (quarter, at) => {
    const moment = Date.parse(at);
    // Looked for from a week before, and from the minute after the one before it.
    const found = nextMoonPhase(new Date(moment - 7 * DAY), quarter).getTime();
    expect(Math.abs(found - moment)).toBeLessThan(30 * MINUTE);
  });

  it.each(MOMENTS)("names moment %i at %s, and has the disc lit as it is then", (quarter, at) => {
    const moon = moonAt(new Date(Date.parse(at)));
    expect(moon.phase).toBe(NAMES[quarter]);
    expect(moon.lit).toBeCloseTo(LIT[quarter], 2);
    expect(moon.lit).toBeGreaterThanOrEqual(0);
    expect(moon.lit).toBeLessThanOrEqual(1);
  });

  it("looks ahead: the next one is after the moment asked from, and under a month away", () => {
    const from = new Date("2026-11-24T16:00Z"); // an hour after the full moon
    for (const quarter of [0, 1, 2, 3] as const) {
      const next = nextMoonPhase(from, quarter).getTime();
      expect(next).toBeGreaterThan(from.getTime());
      expect(next - from.getTime()).toBeLessThan(30 * DAY);
    }
    // The full moon just gone isn't the next one: December's is.
    expect(Math.abs(nextMoonPhase(from, 2).getTime() - Date.parse("2026-12-24T01:28Z"))).toBeLessThan(30 * MINUTE);
  });
});

describe("the moon on a day", () => {
  it("is what the sky shows: the evening of November 17 2026, hours after the first quarter", () => {
    const moon = moonAt(new Date("2026-11-17T20:05Z"));
    expect(moon.phase).toBe("first-quarter");
    expect(moon.waxing).toBe(true);
    expect(moon.cycle).toBeCloseTo(0.26, 2);
    // The almanac's 53.5%.
    expect(moon.lit).toBeCloseTo(0.535, 2);
  });

  it.each([
    ["2026-11-13T12:00Z", "waxing-crescent", 0.158, true],
    ["2026-11-21T12:00Z", "waxing-gibbous", 0.87, true],
    ["2026-11-28T12:00Z", "waning-gibbous", 0.794, false],
    ["2026-12-05T12:00Z", "waning-crescent", 0.116, false],
  ] as const)("between the moments, %s is a %s moon", (at, phase, lit, waxing) => {
    const moon = moonAt(new Date(at));
    expect(moon.phase).toBe(phase);
    expect(moon.lit).toBeCloseTo(lit, 2);
    expect(moon.waxing).toBe(waxing);
  });

  it("goes through the eight phases in order, a new, quarter or full moon the name for about a day", () => {
    // A year, hour by hour: the run of names and how long each lasted.
    const runs: { phase: string; hours: number }[] = [];
    const start = Date.parse("2026-01-01T00:00Z");
    for (let hour = 0; hour < 365 * 24; hour++) {
      const { phase } = moonAt(new Date(start + hour * HOUR));
      const last = runs[runs.length - 1];
      if (last?.phase === phase) last.hours++;
      else runs.push({ phase, hours: 1 });
    }
    // Each name is followed by the next of the eight, round and round.
    runs.forEach((run, i) => {
      if (i === 0) return;
      const before = MOON_PHASES.indexOf(runs[i - 1].phase as (typeof MOON_PHASES)[number]);
      expect(run.phase).toBe(MOON_PHASES[(before + 1) % 8]);
    });
    // Twelve cycles and a bit in the year, whole ones in the middle.
    const whole = runs.slice(1, -1);
    expect(whole.length).toBeGreaterThan(90);
    for (const run of whole) {
      if (run.phase.includes("-c") || run.phase.includes("-g")) {
        // A crescent or a gibbous moon: most of a week.
        expect(run.hours).toBeGreaterThan(5 * 24);
        expect(run.hours).toBeLessThan(8 * 24);
      } else {
        // The moon moves faster near the Earth: a day, give or take.
        expect(run.hours).toBeGreaterThanOrEqual(19);
        expect(run.hours).toBeLessThanOrEqual(27);
      }
    }
  });

  it("grows while it waxes and shrinks while it wanes", () => {
    const start = Date.parse("2026-11-09T12:00Z"); // hours after a new moon
    let before = moonAt(new Date(start));
    for (let hour = 6; hour < 29 * 24; hour += 6) {
      const moon = moonAt(new Date(start + hour * HOUR));
      // But for the turn itself, at the full moon.
      if (moon.waxing && before.waxing) expect(moon.lit).toBeGreaterThan(before.lit);
      if (!moon.waxing && !before.waxing) expect(moon.lit).toBeLessThan(before.lit);
      before = moon;
    }
  });

  it("has words for every phase", () => {
    expect(MOON_PHASES).toHaveLength(8);
    expect(MOON_PHASES.map((phase) => MOON_LABEL[phase])).toEqual([
      "New moon",
      "Waxing crescent",
      "First quarter",
      "Waxing gibbous",
      "Full moon",
      "Waning gibbous",
      "Last quarter",
      "Waning crescent",
    ]);
  });
});
