import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HomeWeather } from "../../src/hooks/useHomeData";
import { renderWithProviders } from "./helpers/render";

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => vi.fn(),
}));
// NumberFlow animates with web APIs jsdom lacks; the figures are what matter.
vi.mock("@number-flow/react", () => ({
  default: ({ value, prefix = "" }: { value: number; prefix?: string }) => (
    <span>
      {prefix}
      {value}
    </span>
  ),
}));

import { HomeHeader } from "../../src/components/HomeHeader";

const weather = (over: Partial<HomeWeather> = {}): HomeWeather => ({
  state: "partlycloudy",
  temperature: 68.4,
  apparentTemperature: null,
  temperatureUnit: "°F",
  humidity: 64,
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
  forecastDaily: [
    {
      datetime: "2026-10-30T00:00:00-04:00",
      temperature: 72.4,
      templow: 50.6,
      condition: "sunny",
      precipitation: null,
      precipitationProbability: null,
      windSpeed: null,
      windBearing: null,
    },
  ],
  ...over,
});

describe("HomeHeader (the frame's time and weather card)", () => {
  it("shows the condition, the humidity and today's high and low on the top line", () => {
    renderWithProviders(
      <HomeHeader internet={{ connected: true }} weather={weather()} />,
    );
    expect(screen.getByText(/64% · H 72° · L 51°$/)).toBeInTheDocument();
    expect(screen.getByText("68")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open the weather page" })).toBeInTheDocument();
  });

  it("leaves the high and low out without a daily forecast, or without a low", () => {
    renderWithProviders(
      <HomeHeader internet={{ connected: true }} weather={weather({ forecastDaily: [] })} />,
    );
    expect(screen.getByText(/64%$/)).toBeInTheDocument();
    expect(screen.queryByText(/H \d+°/)).toBeNull();
  });
});
