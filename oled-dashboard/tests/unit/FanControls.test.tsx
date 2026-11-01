import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HomeFan } from "../../src/hooks/useHomeData";
import { renderWithProviders } from "./helpers/render";

const calls = vi.hoisted(() => ({ callFanService: vi.fn() }));
vi.mock("../../src/lib/callService", () => ({
  callFanService: calls.callFanService,
}));

import { FanControls } from "../../src/components/FanControls";

function fan(overrides: Partial<HomeFan> = {}): HomeFan {
  return {
    entity_id: "fan.living_room_ceiling_fan",
    name: "Living Room Ceiling Fan",
    state: "on",
    percentage: 50,
    presetMode: null,
    ...overrides,
  };
}

const raise = () => screen.getByRole("button", { name: "Raise the fan speed" });
const lower = () => screen.getByRole("button", { name: "Lower the fan speed" });
const dial = () => screen.getByRole("slider", { name: "Fan speed" });

beforeEach(() => {
  calls.callFanService.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("FanControls on the thermostat's dial", () => {
  it("marks the speed on the arc, 0 to 100 by quarters, and says the fan runs", () => {
    renderWithProviders(<FanControls fan={fan()} />);
    expect(dial()).toHaveAttribute("aria-valuemin", "0");
    expect(dial()).toHaveAttribute("aria-valuemax", "100");
    expect(dial()).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Fan running")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("reads a fan that is off as 0%, whatever speed it still carries", () => {
    renderWithProviders(<FanControls fan={fan({ state: "off", percentage: 50 })} />);
    expect(dial()).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("Fan off")).toBeInTheDocument();
    expect(lower()).toBeDisabled();
    expect(raise()).toBeEnabled();
  });

  it("steps a quarter a tap, the reading at once and one turn_on once the taps stop", async () => {
    renderWithProviders(<FanControls fan={fan()} />);
    await act(async () => {
      raise().click();
    });
    expect(screen.getByText("75%")).toBeInTheDocument();
    await act(async () => {
      raise().click();
    });
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(raise()).toBeDisabled();
    expect(calls.callFanService).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(800);
    });
    expect(calls.callFanService.mock.calls).toEqual([
      ["fan.living_room_ceiling_fan", "turn_on", { percentage: 100 }],
    ]);
  });

  it("stepped down to nothing, turns the fan off", async () => {
    renderWithProviders(<FanControls fan={fan({ percentage: 25 })} />);
    await act(async () => {
      lower().click();
    });
    expect(screen.getByText("0%")).toBeInTheDocument();
    // Under the finger the dial already reads off.
    expect(screen.getByText("Fan off")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(800);
    });
    expect(calls.callFanService.mock.calls).toEqual([["fan.living_room_ceiling_fan", "turn_off"]]);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("shows the preset in place of the status while the fan runs", () => {
    renderWithProviders(<FanControls fan={fan({ presetMode: "sleep_mode" })} />);
    expect(screen.getByText("Sleep mode")).toBeInTheDocument();
    expect(screen.queryByText("Fan running")).toBeNull();
  });

  it("the switch turns it off, and back on at the speed it had", async () => {
    renderWithProviders(<FanControls fan={fan()} />);
    await act(async () => {
      screen.getByRole("checkbox").click();
    });
    expect(calls.callFanService).toHaveBeenLastCalledWith("fan.living_room_ceiling_fan", "turn_off");
    expect(screen.getByText("0%")).toBeInTheDocument();
    await act(async () => {
      screen.getByRole("checkbox").click();
    });
    expect(calls.callFanService).toHaveBeenLastCalledWith("fan.living_room_ceiling_fan", "turn_on", {
      percentage: 50,
    });
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("follows Home Assistant, except for what is under a finger", async () => {
    const { rerender } = renderWithProviders(<FanControls fan={fan()} />);
    rerender(<FanControls fan={fan({ percentage: 75 })} />);
    expect(screen.getByText("75%")).toBeInTheDocument();

    await act(async () => {
      raise().click();
    });
    expect(screen.getByText("100%")).toBeInTheDocument();
    // HA's echo of the old speed while the taps' send is pending: the reading keeps.
    rerender(<FanControls fan={fan({ percentage: 50 })} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
