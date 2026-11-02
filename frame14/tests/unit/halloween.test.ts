import { afterEach, describe, expect, it, vi } from "vitest";
import { isHalloween, NEON } from "../../src/lib/halloween";

// vitest.config.ts pins TZ to America/New_York: these are the house's times.
describe("isHalloween", () => {
  afterEach(() => vi.useRealTimers());

  it("is Oct 30 and 31, from the first minute to the last", () => {
    expect(isHalloween(new Date(2026, 9, 29, 23, 59))).toBe(false);
    expect(isHalloween(new Date(2026, 9, 30, 0, 0))).toBe(true);
    expect(isHalloween(new Date(2026, 9, 30, 12, 0).getTime())).toBe(true);
    expect(isHalloween(new Date(2026, 9, 31, 23, 59, 59))).toBe(true);
    expect(isHalloween(new Date(2026, 10, 1, 0, 0))).toBe(false);
  });

  it("any year, and not the 30th or 31st of another month", () => {
    expect(isHalloween(new Date(2031, 9, 31))).toBe(true);
    expect(isHalloween(new Date(2026, 8, 30))).toBe(false);
    expect(isHalloween(new Date(2026, 11, 31))).toBe(false);
  });

  it("reads the clock when given nothing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 31, 18));
    expect(isHalloween()).toBe(true);
    vi.setSystemTime(new Date(2026, 6, 4));
    expect(isHalloween()).toBe(false);
  });
});

describe("NEON", () => {
  it("is four tubes, each a colour", () => {
    expect(NEON).toHaveLength(4);
    for (const c of NEON) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });
});
