import { describe, expect, it } from "vitest";
import { compassPoint, RAIN_SHOWN_FROM, roundTemp } from "../../src/lib/forecast";

describe("compassPoint", () => {
  it("names the eight points", () => {
    expect([0, 45, 90, 135, 180, 225, 270, 315].map(compassPoint)).toEqual([
      "N", "NE", "E", "SE", "S", "SW", "W", "NW",
    ]);
  });

  it("rounds to the nearest point and wraps around", () => {
    expect(compassPoint(22)).toBe("N");
    expect(compassPoint(23)).toBe("NE");
    expect(compassPoint(359)).toBe("N");
    expect(compassPoint(720)).toBe("N");
    expect(compassPoint(-90)).toBe("W");
  });
});

describe("roundTemp", () => {
  it("rounds a reading and passes nothing through", () => {
    expect(roundTemp(71.5)).toBe(72);
    expect(roundTemp(71.4)).toBe(71);
    expect(roundTemp(null)).toBeNull();
    expect(roundTemp(undefined)).toBeNull();
  });
});

describe("the rain threshold", () => {
  it("is 20%", () => {
    expect(RAIN_SHOWN_FROM).toBe(20);
  });
});
