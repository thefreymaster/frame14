import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HomeClimate } from "../../src/hooks/useHomeData";
import { renderWithProviders } from "./helpers/render";

const calls = vi.hoisted(() => ({ callClimateService: vi.fn() }));
vi.mock("../../src/lib/callService", () => ({
  callClimateService: calls.callClimateService,
}));

import { ClimateControls } from "../../src/components/ClimateControls";

function unit(overrides: Partial<HomeClimate> = {}): HomeClimate {
  return {
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
    ...overrides,
  };
}

const raise = () => screen.getByRole("button", { name: "Raise the target temperature" });
const lower = () => screen.getByRole("button", { name: "Lower the target temperature" });

beforeEach(() => {
  calls.callClimateService.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ClimateControls' −/+ buttons", () => {
  it("move the reading at once and send one target once the taps stop", async () => {
    renderWithProviders(<ClimateControls unit={unit()} />);
    await act(async () => {
      raise().click();
    });
    await act(async () => {
      raise().click();
    });
    expect(screen.getByText("72°")).toBeInTheDocument();
    expect(calls.callClimateService).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(800);
    });
    expect(calls.callClimateService.mock.calls).toEqual([
      ["climate.first_floor", "set_temperature", { temperature: 72 }],
    ]);
  });

  it("step down too", async () => {
    renderWithProviders(<ClimateControls unit={unit()} />);
    await act(async () => {
      lower().click();
    });
    await act(async () => {
      vi.advanceTimersByTime(800);
    });
    expect(calls.callClimateService).toHaveBeenCalledWith("climate.first_floor", "set_temperature", {
      temperature: 69,
    });
  });

  it("stop at the dial's ends", () => {
    renderWithProviders(<ClimateControls unit={unit({ targetTemp: 85 })} />);
    expect(raise()).toBeDisabled();
    expect(lower()).toBeEnabled();
  });

  it("aren't there while the unit is off or only fanning", () => {
    const { unmount } = renderWithProviders(
      <ClimateControls unit={unit({ state: "off", hvacMode: "off", hvacAction: "off" })} />,
    );
    expect(screen.queryByRole("button", { name: /target temperature/ })).toBeNull();
    unmount();
    renderWithProviders(
      <ClimateControls unit={unit({ state: "fan_only", hvacMode: "fan_only", hvacAction: "fan" })} />,
    );
    expect(screen.queryByRole("button", { name: /target temperature/ })).toBeNull();
  });
});
