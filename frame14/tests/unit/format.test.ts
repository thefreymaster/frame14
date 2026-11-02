import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fmtClock,
  fmtDuration,
  fmtWhen,
  sentenceCase,
  toMinutes,
} from "../../src/lib/format";

describe("toMinutes", () => {
  it("converts by the sensor's unit", () => {
    expect(toMinutes(2, "h")).toBe(120);
    expect(toMinutes(1, "d")).toBe(1440);
    expect(toMinutes(90, "s")).toBe(1.5);
    expect(toMinutes(5, "min")).toBe(5);
    expect(toMinutes(5, undefined)).toBe(5);
  });

  it("passes nothing and infinities through as nothing", () => {
    expect(toMinutes(null, "h")).toBeNull();
    expect(toMinutes(Infinity, "h")).toBeNull();
  });
});

describe("fmtDuration", () => {
  it("hours and minutes, or minutes alone", () => {
    expect(fmtDuration(72)).toBe("1h 12m");
    expect(fmtDuration(12)).toBe("12m");
    expect(fmtDuration(59.6)).toBe("1h 0m");
  });

  it("a dash for nothing or a non-duration", () => {
    expect(fmtDuration(null)).toBe("—");
    expect(fmtDuration(0)).toBe("—");
    expect(fmtDuration(-3)).toBe("—");
    expect(fmtDuration(NaN)).toBe("—");
  });
});

describe("sentenceCase", () => {
  it("turns an enum into words", () => {
    expect(sentenceCase("segment_cleaning")).toBe("Segment cleaning");
    expect(sentenceCase("max-plus")).toBe("Max plus");
    expect(sentenceCase("RUNNING")).toBe("Running");
    expect(sentenceCase("")).toBe("");
  });
});

describe("fmtClock", () => {
  it("is the time of day", () => {
    expect(fmtClock(new Date(2026, 9, 29, 15, 45))).toMatch(/3:45/);
  });
});

describe("fmtWhen", () => {
  const now = new Date(2026, 9, 29, 15, 0, 0);

  beforeEach(() => {
    vi.useFakeTimers({ now });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("today: the time", () => {
    expect(fmtWhen(new Date(2026, 9, 29, 9, 5))).toBe(fmtClock(new Date(2026, 9, 29, 9, 5)));
  });

  it("yesterday, by the calendar rather than 24 hours", () => {
    expect(fmtWhen(new Date(2026, 9, 28, 23, 59))).toBe("Yesterday");
    expect(fmtWhen(new Date(2026, 9, 28, 0, 1))).toBe("Yesterday");
  });

  it("a weekday within the week", () => {
    const date = new Date(2026, 9, 26, 12);
    expect(fmtWhen(date)).toBe(date.toLocaleDateString([], { weekday: "long" }));
  });

  it("the date past a week", () => {
    const date = new Date(2026, 9, 19, 12);
    expect(fmtWhen(date)).toBe(date.toLocaleDateString([], { month: "short", day: "numeric" }));
  });

  it("a dash for nothing or an invalid date", () => {
    expect(fmtWhen(null)).toBe("—");
    expect(fmtWhen(new Date("not a date"))).toBe("—");
  });
});
