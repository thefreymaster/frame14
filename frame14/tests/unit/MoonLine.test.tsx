import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HomeWeather } from "../../src/hooks/useHomeData";
import { renderWithProviders } from "./helpers/render";

// NumberFlow animates with web APIs jsdom lacks; the figures are what matter.
vi.mock("@number-flow/react", () => ({
  default: ({ value }: { value: number }) => <span>{value}</span>,
}));

import { HomeForecastCard } from "../../src/components/HomeForecastCard";
import { HomeHeader } from "../../src/components/HomeHeader";
import { HomeWeatherCard } from "../../src/components/HomeWeatherCard";
import { MoonLine } from "../../src/components/MoonLine";
import { MoonPhase } from "../../src/components/MoonPhase";

// 0.176.0, the user: "Add the moon phase to the weather card on the home
// page". The card has the moon in a line: drawn as it stands, the phase's
// name, how much of it is lit and the day of the full or new moon it is on
// its way to — what the Weather page says in a well (MoonPhase), from the
// same reading of the date (lib/moon). The days are New York's (the suite's
// zone).

const line = () => document.querySelector<HTMLElement>("[data-moon-line]");

const weather: HomeWeather = {
  state: "cloudy",
  temperature: 74,
  apparentTemperature: null,
  temperatureUnit: "°F",
  humidity: 65,
  windSpeed: null,
  windSpeedUnit: null,
  windBearing: null,
  pressure: null,
  pressureUnit: null,
  visibility: null,
  visibilityUnit: null,
  uvIndex: null,
  forecast: [],
  forecastHours: [],
  forecastDaily: [],
};

describe("the moon in a line", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["2026-11-17T20:05Z", "first-quarter", "First quarter", "53% lit · Full moon Nov 24", "right"],
    ["2026-11-28T12:00Z", "waning-gibbous", "Waning gibbous", "80% lit · New moon Dec 8", "left"],
    ["2026-11-24T20:00Z", "full", "Full moon", "100% lit · New moon Dec 8", "left"],
  ])("at %s says %s", (at, phase, name, detail, litSide) => {
    vi.setSystemTime(new Date(at));
    renderWithProviders(<MoonLine />);
    expect(line()).toHaveAttribute("data-moon-line", phase);
    expect(screen.getByText(name)).toBeInTheDocument();
    expect(screen.getByText(detail)).toBeInTheDocument();
    expect(line()!.querySelector("[data-moon-icon]")).toHaveAttribute("data-lit-side", litSide);
    // Read out as one thing, the drawing aside.
    expect(line()).toHaveAccessibleName(`Moon: ${name}, ${detail}`);
  });

  it("says what the Weather page's well says, word for word", () => {
    vi.setSystemTime(new Date("2026-11-21T12:00Z"));
    renderWithProviders(
      <>
        <MoonLine />
        <MoonPhase />
      </>,
    );
    const well = document.querySelector<HTMLElement>('[data-weather-well="moon"]')!;
    expect(well).toHaveAttribute("data-moon", line()!.getAttribute("data-moon-line"));
    expect(screen.getAllByText("Waxing gibbous")).toHaveLength(2);
    expect(screen.getAllByText("87% lit · Full moon Nov 24")).toHaveLength(2);
  });
});

describe("Home's weather card", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T20:05Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const cards = [
    ["the frame's", HomeHeader],
    ["a phone's", HomeWeatherCard],
    ["a desktop's", HomeForecastCard],
  ] as const;

  it.each(cards)("has the moon tonight under the weather now: %s", (_, Card) => {
    renderWithProviders(<Card internet={{ connected: true }} weather={weather} />);
    expect(line()).toHaveAttribute("data-moon-line", "first-quarter");
    expect(screen.getByText("First quarter")).toBeInTheDocument();
    expect(screen.getByText("53% lit · Full moon Nov 24")).toBeInTheDocument();
  });

  it.each(cards)("has none until there is weather to put it with: %s", (_, Card) => {
    const { unmount } = renderWithProviders(<Card internet={{ connected: true }} weather={null} loading />);
    expect(line()).toBeNull();
    unmount();
    renderWithProviders(<Card internet={{ connected: true }} weather={null} />);
    expect(line()).toBeNull();
  });
});
