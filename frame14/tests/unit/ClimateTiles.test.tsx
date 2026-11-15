import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { HomeClimate } from "../../src/hooks/useHomeData";
import { renderWithProviders } from "./helpers/render";

vi.mock("../../src/lib/callService", () => ({ callClimateService: vi.fn() }));

// NumberFlow animates with web APIs jsdom lacks; the dialog's dial has one.
vi.mock("@number-flow/react", () => ({
  default: ({ value, suffix }: { value: number; suffix?: string }) => (
    <span>
      {value}
      {suffix}
    </span>
  ),
}));

import { ClimateTiles } from "../../src/components/ClimateTiles";

const unit = (over: Partial<HomeClimate> = {}): HomeClimate => ({
  entity_id: "climate.first_floor",
  name: "1st Floor AC",
  state: "heat",
  currentTemp: 64,
  currentHumidity: null,
  targetTemp: 70,
  hvacMode: "heat",
  hvacAction: "heating",
  fanMode: null,
  fanModes: [],
  ...over,
});

// 0.169.2, the user: "Remove the word AC from the names".
describe("a thermostat's name", () => {
  it("is shown without the word AC, on the tile and in its label", () => {
    renderWithProviders(
      <ClimateTiles
        climate={[
          unit(),
          unit({ entity_id: "climate.bedroom", name: "Main Bedroom AC", state: "off", hvacMode: "off", hvacAction: null }),
          unit({ entity_id: "climate.den", name: "Den" }),
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: /^1st Floor: 64°, Heating to 70°/ })).toHaveTextContent(/^1st Floor(?! AC)/);
    expect(screen.getByRole("button", { name: /^Main Bedroom: 64°, Off/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Den: 64°/ })).toBeInTheDocument();
    expect(screen.getByText("1st Floor", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Main Bedroom", { exact: true })).toBeInTheDocument();
    expect(screen.queryByText(/\bAC\b/)).toBeNull();
  });

  it("is the title of the dialog its tile opens, without the word too", async () => {
    renderWithProviders(<ClimateTiles climate={[unit()]} />);
    await userEvent.click(screen.getByRole("button", { name: /^1st Floor:/ }));
    await screen.findByRole("dialog");
    expect(screen.getByRole("heading", { name: "1st Floor" })).toBeInTheDocument();
  });
});
