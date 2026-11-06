import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HourlyChart } from "../../src/components/HourlyChart";
import type { HomeForecastPeriod } from "../../src/hooks/useHomeData";
import { smoothLineAt } from "../../src/lib/smoothLine";
import { renderWithProviders } from "./helpers/render";

// 0.163.1: the temperature is a smooth line, not straight hour-to-hour
// segments — the forecast's whole degrees drew a staircase ("I want the trend
// to not be ridged") — with its high and low labelled where it passes them.

const TEMPS = [66, 65, 65, 65, 64, 64, 64, 64, 64, 63, 62, 61, 60, 59, 58, 57, 57, 56, 55, 56, 56, 57, 57, 57];
const start = Date.parse("2026-11-06T16:00:00-05:00");
const HOURS: HomeForecastPeriod[] = TEMPS.map((temperature, i) => ({
  datetime: new Date(start + i * 3_600_000).toISOString(),
  temperature,
  templow: null,
  condition: "rainy",
  precipitation: null,
  precipitationProbability: 60,
  windSpeed: null,
  windBearing: null,
}));

const temperatureLine = () => document.querySelector("svg path")!.getAttribute("d")!;

describe("the hourly chart", () => {
  it("draws the temperature as one smooth curve from the first hour to the last", () => {
    renderWithProviders(<HourlyChart hours={HOURS} height="7rem" />);
    const d = temperatureLine();
    expect(d).toMatch(/^M0\.0,/);
    expect(d).not.toMatch(/L/);
    expect(d.match(/C/g)).toHaveLength(TEMPS.length + 1);
    expect(d).toMatch(/1000\.0,[\d.]+$/);
  });

  it("labels the high and low on the line", () => {
    renderWithProviders(<HourlyChart hours={HOURS} height="7rem" />);
    // The scale runs 53°–68° (two degrees either side). The high is the first
    // hour, where the line starts; the low, at 7 AM, is where the line
    // passes it, evened out a little above 55° between 56°s.
    expect(getComputedStyle(screen.getByText("66°")).top).toBe(`${(1 - (66 - 53) / 15) * 100}%`);
    const lowOnLine = smoothLineAt(TEMPS, 18)!;
    expect(lowOnLine).toBeGreaterThan(55);
    expect(lowOnLine).toBeLessThan(56);
    expect(getComputedStyle(screen.getByText("55°")).top).toBe(`${(1 - (lowOnLine - 53) / 15) * 100}%`);
  });
});
