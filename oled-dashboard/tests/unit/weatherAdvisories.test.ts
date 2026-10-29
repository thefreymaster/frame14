import { describe, expect, it } from "vitest";
import type { HomeForecastPeriod, HomeWeather } from "../../src/hooks/useHomeData";
import { weatherAdvisories } from "../../src/lib/weatherAdvisories";

// A Thursday at noon, local time (vitest.config.ts pins the zone).
const now = new Date(2026, 9, 29, 12, 0, 0);

const period = (over: Partial<HomeForecastPeriod> = {}): HomeForecastPeriod => ({
  datetime: now.toISOString(),
  temperature: 60,
  templow: 50,
  condition: "cloudy",
  precipitation: 0,
  precipitationProbability: 0,
  windSpeed: 5,
  windBearing: 270,
  ...over,
});

/** An hourly period `h` hours from now. */
const hour = (h: number, over: Partial<HomeForecastPeriod> = {}) =>
  period({ datetime: new Date(now.getTime() + h * 3600e3).toISOString(), ...over });

/** A daily period `d` days from today, stamped at local midnight. */
const day = (d: number, over: Partial<HomeForecastPeriod> = {}) =>
  period({ datetime: new Date(2026, 9, 29 + d).toISOString(), ...over });

const weather = (over: Partial<HomeWeather> = {}): HomeWeather => ({
  state: "cloudy",
  temperature: 60,
  apparentTemperature: 60,
  temperatureUnit: "°F",
  humidity: 50,
  windSpeed: 5,
  windSpeedUnit: "mph",
  windBearing: 270,
  pressure: 30,
  pressureUnit: "inHg",
  visibility: 10,
  visibilityUnit: "mi",
  uvIndex: 2,
  forecast: [],
  forecastHours: [],
  forecastDaily: [],
  ...over,
});

const weekday = (d: Date) => d.toLocaleDateString([], { weekday: "long" });

describe("weatherAdvisories", () => {
  it("has nothing to say about a quiet forecast", () => {
    const w = weather({
      forecastHours: [hour(1), hour(2, { precipitationProbability: 30, condition: "rainy" })],
      forecastDaily: [day(0), day(1)],
    });
    expect(weatherAdvisories(w, now)).toEqual([]);
  });

  describe("freeze", () => {
    it("warns of tonight's low at or under freezing", () => {
      const [a] = weatherAdvisories(weather({ forecastDaily: [day(0, { templow: 30 })] }), now);
      expect(a).toEqual({ key: "freeze", status: "warning", title: "Freeze tonight", detail: "Low 30°" });
    });

    it("names tomorrow night by its weekday", () => {
      const tomorrow = new Date(2026, 9, 30);
      const [a] = weatherAdvisories(
        weather({ forecastDaily: [day(0, { templow: 40 }), day(1, { templow: 32 })] }),
        now,
      );
      expect(a.title).toBe(`Freeze ${weekday(tomorrow)} night`);
    });

    it("looks only two nights ahead", () => {
      const w = weather({ forecastDaily: [day(0), day(1), day(2, { templow: 10 })] });
      expect(weatherAdvisories(w, now)).toEqual([]);
    });

    it("freezes at 0 in Celsius", () => {
      const w = weather({ temperatureUnit: "°C", forecastDaily: [day(0, { templow: 0 })] });
      expect(weatherAdvisories(w, now)[0]?.key).toBe("freeze");
      const mild = weather({ temperatureUnit: "°C", forecastDaily: [day(0, { templow: 5 })] });
      expect(weatherAdvisories(mild, now)).toEqual([]);
    });
  });

  it("warns of the first hour of lightning", () => {
    const w = weather({
      forecastHours: [hour(1), hour(3, { condition: "lightning-rainy", precipitationProbability: 70 })],
    });
    const [a] = weatherAdvisories(w, now);
    expect(a.key).toBe("storm");
    expect(a.status).toBe("warning");
    expect(a.title).toMatch(/^Thunderstorms at /);
    expect(a.detail).toBe("70% chance");
  });

  describe("snow and ice", () => {
    it("an hour of snow ahead", () => {
      const [a] = weatherAdvisories(weather({ forecastHours: [hour(2, { condition: "snowy" })] }), now);
      expect(a.key).toBe("snow");
      expect(a.title).toMatch(/^Snow at /);
    });

    it("sleet in the next three days, by day", () => {
      const w = weather({ forecastDaily: [day(0), day(1, { condition: "snowy-rainy", precipitationProbability: 40 })] });
      const [a] = weatherAdvisories(w, now);
      expect(a.title).toBe("Sleet tomorrow");
      expect(a.detail).toBe("40% chance");
    });

    it("hail", () => {
      const [a] = weatherAdvisories(weather({ forecastDaily: [day(0, { condition: "hail" })] }), now);
      expect(a.title).toBe("Hail today");
    });

    it("not past three days", () => {
      const w = weather({ forecastDaily: [day(0), day(1), day(2), day(3, { condition: "snowy" })] });
      expect(weatherAdvisories(w, now)).toEqual([]);
    });
  });

  describe("wind", () => {
    it("warns at the windiest hour from 30 up", () => {
      const w = weather({ forecastHours: [hour(1, { windSpeed: 20 }), hour(5, { windSpeed: 35 }), hour(6, { windSpeed: 31 })] });
      const [a] = weatherAdvisories(w, now);
      expect(a.key).toBe("wind");
      expect(a.title).toMatch(/^High winds at /);
      expect(a.detail).toBe("35 mph");
    });

    it("says nothing under 30", () => {
      expect(weatherAdvisories(weather({ forecastHours: [hour(1, { windSpeed: 29 })] }), now)).toEqual([]);
    });
  });

  describe("a rapid drop", () => {
    it("fifteen degrees within six hours", () => {
      const w = weather({
        forecastHours: [hour(1, { temperature: 70 }), hour(2, { temperature: 65 }), hour(4, { temperature: 54 })],
      });
      const [a] = weatherAdvisories(w, now);
      expect(a.key).toBe("drop");
      expect(a.title).toMatch(/^Temperature drops 16° by /);
      expect(a.detail).toBe("70° to 54°");
    });

    it("but not over a longer stretch", () => {
      const w = weather({
        forecastHours: Array.from({ length: 10 }, (_, i) => hour(i + 1, { temperature: 70 - i * 2 })),
      });
      expect(weatherAdvisories(w, now)).toEqual([]);
    });
  });

  describe("rain on the way", () => {
    it("a likely rainy hour while it isn't raining", () => {
      const w = weather({ forecastHours: [hour(4, { condition: "rainy", precipitationProbability: 60 })] });
      const [a] = weatherAdvisories(w, now);
      expect(a).toMatchObject({ key: "rain", status: "info", detail: "60% chance" });
      expect(a.title).toMatch(/^Rain at /);
    });

    it("not while it is already raining", () => {
      const w = weather({ state: "rainy", forecastHours: [hour(4, { condition: "rainy", precipitationProbability: 90 })] });
      expect(weatherAdvisories(w, now)).toEqual([]);
    });

    it("not under a 50% chance", () => {
      const w = weather({ forecastHours: [hour(4, { condition: "rainy", precipitationProbability: 40 })] });
      expect(weatherAdvisories(w, now)).toEqual([]);
    });
  });

  it("ignores hours more than an hour gone, and falls back to the short forecast", () => {
    const stale = weather({ forecastHours: [hour(-2, { condition: "lightning" })] });
    expect(weatherAdvisories(stale, now)).toEqual([]);
    const recent = weather({ forecast: [hour(-0.5, { condition: "lightning" })] });
    expect(weatherAdvisories(recent, now)[0]?.key).toBe("storm");
  });

  it("lists them freeze, storm, snow, wind, drop, rain", () => {
    const w = weather({
      forecastDaily: [day(0, { templow: 20, condition: "snowy" })],
      forecastHours: [
        hour(1, { temperature: 70, condition: "lightning", windSpeed: 40 }),
        hour(3, { temperature: 50, condition: "rainy", precipitationProbability: 80 }),
      ],
    });
    expect(weatherAdvisories(w, now).map((a) => a.key)).toEqual([
      "freeze", "storm", "snow", "wind", "drop", "rain",
    ]);
  });
});
