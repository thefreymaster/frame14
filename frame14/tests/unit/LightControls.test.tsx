import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LightAttrs } from "../../src/lib/lightModel";
import { renderWithProviders } from "./helpers/render";

const calls = vi.hoisted(() => ({ callService: vi.fn(), callLightService: vi.fn() }));
vi.mock("../../src/lib/callService", () => ({
  callService: calls.callService,
  callLightService: calls.callLightService,
}));

// NumberFlow animates with web APIs jsdom lacks; the figure is what matters
// (0.149.0: the dial's reading is one).
vi.mock("@number-flow/react", () => ({
  default: ({ value, suffix }: { value: number; suffix?: string }) => (
    <span>
      {value}
      {suffix}
    </span>
  ),
}));

import { LightControls } from "../../src/components/LightControls";

const ID = "light.living_room";

/** A warm white light at 33% (84 of 255), doing white and colour. */
function attrs(overrides: Partial<LightAttrs> = {}): LightAttrs {
  return {
    friendly_name: "Living Room",
    supported_color_modes: ["color_temp", "xy"],
    color_mode: "color_temp",
    brightness: 84,
    color_temp_kelvin: 2700,
    min_color_temp_kelvin: 2000,
    max_color_temp_kelvin: 6500,
    rgb_color: [255, 171, 96],
    ...overrides,
  };
}

const raise = () => screen.getByRole("button", { name: "Raise the brightness" });
const lower = () => screen.getByRole("button", { name: "Lower the brightness" });
const dial = () => screen.getByRole("slider", { name: "Brightness" });

beforeEach(() => {
  calls.callService.mockReset();
  calls.callLightService.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("LightControls on the thermostat's dial", () => {
  it("marks the brightness on the arc, 0 to 100, and says the light is on", () => {
    renderWithProviders(<LightControls entityId={ID} attrs={attrs()} on />);
    expect(dial()).toHaveAttribute("aria-valuemin", "0");
    expect(dial()).toHaveAttribute("aria-valuemax", "100");
    expect(dial()).toHaveAttribute("aria-valuenow", "33");
    expect(screen.getByText("33%")).toBeInTheDocument();
    expect(screen.getByText("Light on")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
    // The presets still follow, the light's own ringed.
    expect(screen.getByRole("button", { name: "Warm" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Blue" })).toHaveAttribute("aria-pressed", "false");
  });

  it("reads a light that is off as 0%", () => {
    renderWithProviders(
      <LightControls entityId={ID} attrs={attrs({ brightness: null, color_mode: null })} on={false} />,
    );
    expect(dial()).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("Light off")).toBeInTheDocument();
    expect(lower()).toBeDisabled();
    expect(raise()).toBeEnabled();
    expect(screen.getByRole("button", { name: "Warm" })).toHaveAttribute("aria-pressed", "false");
  });

  it("steps to the next tenth a tap, the reading at once and one turn_on once the taps stop", async () => {
    renderWithProviders(<LightControls entityId={ID} attrs={attrs()} on />);
    await act(async () => {
      raise().click();
    });
    expect(screen.getByText("40%")).toBeInTheDocument();
    await act(async () => {
      raise().click();
    });
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(dial()).toHaveAttribute("aria-valuenow", "50");
    expect(calls.callLightService).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(800);
    });
    expect(calls.callLightService.mock.calls).toEqual([[ID, { brightness_pct: 50 }]]);
    expect(calls.callService).not.toHaveBeenCalled();
  });

  it("stepped down to nothing, turns the light off", async () => {
    renderWithProviders(<LightControls entityId={ID} attrs={attrs({ brightness: 26 })} on />);
    expect(screen.getByText("10%")).toBeInTheDocument();
    await act(async () => {
      lower().click();
    });
    expect(screen.getByText("0%")).toBeInTheDocument();
    // Under the finger the dial already reads off.
    expect(screen.getByText("Light off")).toBeInTheDocument();
    expect(lower()).toBeDisabled();
    await act(async () => {
      vi.advanceTimersByTime(800);
    });
    expect(calls.callService.mock.calls).toEqual([[ID, "turn_off"]]);
    expect(calls.callLightService).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("the switch turns it off, and back on at the brightness it had", async () => {
    renderWithProviders(<LightControls entityId={ID} attrs={attrs()} on />);
    await act(async () => {
      screen.getByRole("checkbox").click();
    });
    expect(calls.callService).toHaveBeenLastCalledWith(ID, "turn_off");
    expect(screen.getByText("0%")).toBeInTheDocument();
    await act(async () => {
      screen.getByRole("checkbox").click();
    });
    expect(calls.callLightService).toHaveBeenLastCalledWith(ID, { brightness_pct: 33 });
    expect(screen.getByText("33%")).toBeInTheDocument();
    expect(screen.getByText("Light on")).toBeInTheDocument();
  });

  it("opened on a light that is off, the switch leaves the brightness to Home Assistant", async () => {
    renderWithProviders(
      <LightControls entityId={ID} attrs={attrs({ brightness: null, color_mode: null })} on={false} />,
    );
    await act(async () => {
      screen.getByRole("checkbox").click();
    });
    expect(calls.callService.mock.calls).toEqual([[ID, "turn_on"]]);
    expect(calls.callLightService).not.toHaveBeenCalled();
    expect(screen.getByText("Light on")).toBeInTheDocument();
  });

  it("follows Home Assistant, except for what is under a finger", async () => {
    const { rerender } = renderWithProviders(<LightControls entityId={ID} attrs={attrs()} on />);
    rerender(<LightControls entityId={ID} attrs={attrs({ brightness: 191 })} on />);
    expect(screen.getByText("75%")).toBeInTheDocument();

    await act(async () => {
      raise().click();
    });
    expect(screen.getByText("80%")).toBeInTheDocument();
    // HA's echo of the old level while the taps' send is pending: the reading keeps.
    rerender(<LightControls entityId={ID} attrs={attrs({ brightness: 84 })} on />);
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("a preset goes out as it did", async () => {
    renderWithProviders(<LightControls entityId={ID} attrs={attrs()} on />);
    await act(async () => {
      screen.getByRole("button", { name: "Daylight" }).click();
    });
    expect(calls.callLightService).toHaveBeenLastCalledWith(ID, { color_temp_kelvin: 6500 });
    await act(async () => {
      screen.getByRole("button", { name: "Blue" }).click();
    });
    expect(calls.callLightService).toHaveBeenLastCalledWith(ID, { rgb_color: [0, 122, 255] });
  });
});
