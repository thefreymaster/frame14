import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HomeClimate } from "../../src/hooks/useHomeData";
import { renderWithProviders } from "./helpers/render";

const calls = vi.hoisted(() => ({ callClimateService: vi.fn() }));
vi.mock("../../src/lib/callService", () => ({
  callClimateService: calls.callClimateService,
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

  it("turn the arc's marked tick to the new target, to slide there (0.149.0)", async () => {
    const { container } = renderWithProviders(<ClimateControls unit={unit()} />);
    const marker = () => container.querySelector<SVGLineElement>("[data-dial-marker]")!;
    // 70° of 60–85° on the 120° arc from −150°: −102°.
    expect(marker().style.transform).toBe("rotate(-102deg)");
    await act(async () => {
      raise().click();
    });
    expect(marker().style.transform).toBe("rotate(-97.2deg)");
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

describe("ClimateControls' fan speed", () => {
  const fanUnit = (fanMode = "auto") =>
    unit({ fanMode, fanModes: ["auto", "low", "medium", "high"] });
  // By its label attribute: the thumb's aria-labelledby names a label the
  // slider hasn't got, which jsdom's name computation stops at; and it stays
  // `visibility: hidden` here (a contained thumb shows once its size is
  // measured, which needs a ResizeObserver that fires).
  const thumb = () => {
    const el = document.querySelector('[data-part="thumb"][aria-label="Fan speed"]');
    if (!el) throw new Error("no fan speed thumb");
    return el;
  };

  it("holds a mode it sent until Home Assistant reports it, an older echo not snapping it back", async () => {
    const { rerender } = renderWithProviders(<ClimateControls unit={fanUnit()} />);
    // Two steps, each sent.
    await act(async () => {
      // The keys count once the thumb has the focus.
      fireEvent.focus(thumb());
      fireEvent.keyDown(thumb(), { key: "ArrowRight" });
    });
    expect(calls.callClimateService).toHaveBeenLastCalledWith("climate.first_floor", "set_fan_mode", { fan_mode: "low" });
    await act(async () => {
      // The keys count once the thumb has the focus.
      fireEvent.focus(thumb());
      fireEvent.keyDown(thumb(), { key: "ArrowRight" });
    });
    expect(calls.callClimateService).toHaveBeenLastCalledWith("climate.first_floor", "set_fan_mode", { fan_mode: "medium" });
    expect(thumb()).toHaveAttribute("aria-valuenow", "2");

    // The first step's echo lands after the second went: the slider stays.
    rerender(<ClimateControls unit={fanUnit("low")} />);
    expect(thumb()).toHaveAttribute("aria-valuenow", "2");
    // The second's: in step, and following Home Assistant again.
    rerender(<ClimateControls unit={fanUnit("medium")} />);
    expect(thumb()).toHaveAttribute("aria-valuenow", "2");
    rerender(<ClimateControls unit={fanUnit("high")} />);
    expect(thumb()).toHaveAttribute("aria-valuenow", "3");
  });

  it("a step back to the mode Home Assistant still has is sent too", async () => {
    renderWithProviders(<ClimateControls unit={fanUnit()} />);
    await act(async () => {
      // The keys count once the thumb has the focus.
      fireEvent.focus(thumb());
      fireEvent.keyDown(thumb(), { key: "ArrowRight" });
    });
    await act(async () => {
      fireEvent.focus(thumb());
      fireEvent.keyDown(thumb(), { key: "ArrowLeft" });
    });
    expect(calls.callClimateService.mock.calls.map((c) => c[2])).toEqual([{ fan_mode: "low" }, { fan_mode: "auto" }]);
  });

  it("gives a mode up after 10s without Home Assistant reporting it", async () => {
    const { rerender } = renderWithProviders(<ClimateControls unit={fanUnit()} />);
    await act(async () => {
      // The keys count once the thumb has the focus.
      fireEvent.focus(thumb());
      fireEvent.keyDown(thumb(), { key: "ArrowRight" });
    });
    rerender(<ClimateControls unit={fanUnit()} />);
    expect(thumb()).toHaveAttribute("aria-valuenow", "1");
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(thumb()).toHaveAttribute("aria-valuenow", "0");
  });
});
