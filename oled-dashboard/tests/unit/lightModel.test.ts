import { describe, expect, it } from "vitest";
import {
  brightnessPct,
  COLOR_PRESETS,
  DEFAULT_ON_COLOR,
  inkOn,
  isColor,
  isWarmth,
  kelvinToRgb,
  lightColor,
  lightFeatures,
  rgba,
  warmthPresets,
} from "../../src/lib/lightModel";

describe("lightFeatures", () => {
  it("a switch or an on/off bulb does nothing", () => {
    expect(lightFeatures(undefined)).toEqual({ brightness: false, colorTemp: false, color: false });
    expect(lightFeatures({ supported_color_modes: ["onoff"] })).toEqual({ brightness: false, colorTemp: false, color: false });
  });

  it("any other mode dims; color_temp is white; hs / xy / rgb are colour", () => {
    expect(lightFeatures({ supported_color_modes: ["brightness"] })).toEqual({ brightness: true, colorTemp: false, color: false });
    expect(lightFeatures({ supported_color_modes: ["color_temp", "xy"] })).toEqual({ brightness: true, colorTemp: true, color: true });
    expect(lightFeatures({ supported_color_modes: ["rgb"] })).toEqual({ brightness: true, colorTemp: false, color: true });
  });
});

describe("brightnessPct", () => {
  it("is 1–100 from Home Assistant's 0–255, never 0", () => {
    expect(brightnessPct({ brightness: 255 })).toBe(100);
    expect(brightnessPct({ brightness: 128 })).toBe(50);
    expect(brightnessPct({ brightness: 1 })).toBe(1);
    expect(brightnessPct({ brightness: 0 })).toBe(1);
  });

  it("is nothing without a reading", () => {
    expect(brightnessPct(undefined)).toBeNull();
    expect(brightnessPct({ brightness: null })).toBeNull();
  });
});

describe("colour", () => {
  it("an on light shows its own colour, amber without one; off shows none", () => {
    expect(lightColor(false, { rgb_color: [1, 2, 3] })).toBeNull();
    expect(lightColor(true, { rgb_color: [1, 2, 3] })).toEqual([1, 2, 3]);
    expect(lightColor(true, undefined)).toEqual(DEFAULT_ON_COLOR);
  });

  it("rgba strings", () => {
    expect(rgba([255, 0, 0], 0.5)).toBe("rgba(255, 0, 0, 0.5)");
    expect(rgba([1, 2, 3])).toBe("rgba(1, 2, 3, 1)");
  });

  it("ink: black on light colours, white on dark", () => {
    expect(inkOn([255, 255, 255])).toBe("black");
    expect(inkOn([0, 0, 0])).toBe("white");
    expect(inkOn(DEFAULT_ON_COLOR)).toBe("black");
    expect(inkOn([0, 0, 255])).toBe("white");
  });
});

describe("kelvinToRgb", () => {
  it("is white around 6600K, warm below, and clamped", () => {
    expect(kelvinToRgb(6600)).toEqual([255, 255, 255]);
    const warm = kelvinToRgb(2700);
    expect(warm[0]).toBe(255);
    expect(warm[1]).toBeLessThan(255);
    expect(warm[2]).toBeLessThan(warm[1]);
    expect(kelvinToRgb(1500)[2]).toBe(0);
    for (const c of kelvinToRgb(12000)) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(255);
    }
  });
});

describe("the white presets", () => {
  it("are the ones inside the light's own range", () => {
    expect(warmthPresets(undefined).map((p) => p.label)).toEqual(["Candle", "Warm", "Neutral", "Daylight"]);
    expect(warmthPresets({ min_color_temp_kelvin: 2200, max_color_temp_kelvin: 4000 }).map((p) => p.label)).toEqual(["Candle", "Warm", "Neutral"]);
    expect(warmthPresets({ min_color_temp_kelvin: 3000 }).map((p) => p.label)).toEqual(["Neutral", "Daylight"]);
  });

  it("isWarmth: within 150K in a white mode", () => {
    expect(isWarmth({ color_mode: "color_temp", color_temp_kelvin: 2650 }, 2700)).toBe(true);
    expect(isWarmth({ color_mode: "color_temp", color_temp_kelvin: 2500 }, 2700)).toBe(false);
    expect(isWarmth({ color_mode: "xy", color_temp_kelvin: 2700 }, 2700)).toBe(false);
    expect(isWarmth(undefined, 2700)).toBe(false);
  });
});

describe("the colour presets", () => {
  const red = COLOR_PRESETS[0].rgb;

  it("isColor: near the preset in a colour mode", () => {
    expect(isColor({ color_mode: "xy", rgb_color: [250, 60, 50] }, red)).toBe(true);
    expect(isColor({ color_mode: "xy", rgb_color: [0, 0, 255] }, red)).toBe(false);
    expect(isColor({ color_mode: "color_temp", rgb_color: red }, red)).toBe(false);
    expect(isColor({ color_mode: "xy" }, red)).toBe(false);
  });
});
