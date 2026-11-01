import { describe, expect, it } from "vitest";
import { FAN_SCALE } from "../../src/lib/fan";
import {
  ARC_MAX_TEMP,
  ARC_MIN_TEMP,
  buildTicks,
  tFromPoint,
  THERMOSTAT_SCALE,
  tToValue,
  valueToT,
} from "../../src/lib/thermostatArc";

describe("the arc's scale", () => {
  it("is the thermostat's 60–85°, a degree a step, by default", () => {
    expect(tToValue(0)).toBe(ARC_MIN_TEMP);
    expect(tToValue(1)).toBe(ARC_MAX_TEMP);
    expect(tToValue(0.5)).toBe(73); // 72.5 rounds up
    expect(valueToT(60)).toBe(0);
    expect(valueToT(85)).toBe(1);
    expect(buildTicks(70)).toHaveLength(26);
    expect(buildTicks(70).filter((t) => t.active).map((t) => t.value)).toEqual([70]);
  });

  it("puts a fan's 0–100% on it, a drag landing on a quarter", () => {
    expect(tToValue(0, FAN_SCALE)).toBe(0);
    expect(tToValue(0.1, FAN_SCALE)).toBe(0);
    expect(tToValue(0.3, FAN_SCALE)).toBe(25);
    expect(tToValue(0.4, FAN_SCALE)).toBe(50);
    expect(tToValue(0.9, FAN_SCALE)).toBe(100);
    expect(tToValue(1, FAN_SCALE)).toBe(100);
  });

  it("draws the fan's ticks every 5%, the one at the speed marked", () => {
    const ticks = buildTicks(50, FAN_SCALE);
    expect(ticks).toHaveLength(21);
    expect(ticks.map((t) => t.value)).toEqual([...Array(21).keys()].map((i) => i * 5));
    expect(ticks.filter((t) => t.active).map((t) => t.value)).toEqual([50]);
  });

  it("clamps a value outside the range", () => {
    expect(valueToT(120, FAN_SCALE)).toBe(1);
    expect(valueToT(-5, FAN_SCALE)).toBe(0);
    expect(valueToT(90, THERMOSTAT_SCALE)).toBe(1);
  });

  it("reads a point below the centre as the nearer end", () => {
    expect(tFromPoint(10, 80)).toBe(0);
    expect(tFromPoint(90, 80)).toBe(1);
    expect(tFromPoint(50, 6)).toBeCloseTo(0.5, 5);
  });
});
