import { describe, expect, it, vi } from "vitest";
import type { HomeClimate } from "../../src/hooks/useHomeData";
import { renderWithProviders } from "./helpers/render";

vi.mock("../../src/lib/callService", () => ({ callClimateService: vi.fn() }));

import { ClimateModeIcon } from "../../src/components/ClimateModeIcon";
import { ClimateTiles } from "../../src/components/ClimateTiles";
import { FanIcon } from "../../src/components/FanIcon";

// 0.173.0, the user: "Add a wind animation to the spinning fan icon that is
// feathered like the light icon but make it feel like wind not light, and
// add some little animations in the same style for the heat and cool icons
// on the thermostat cards. Use their respective colors". What jsdom can
// see is what is drawn and when; how it moves is climate.spec's and
// fans.spec's, on a real page.

/** A glyph's drawing: what its svg holds. */
const drawn = (el: Element | null) => el?.querySelector("svg")?.innerHTML;

describe("the fan's wind", () => {
  it("blows off a fan that is spinning, in gusts one after another", () => {
    const { container } = renderWithProviders(<FanIcon on percentage={100} size="1.25rem" color="teal.solid" />);
    const wind = container.querySelector("[data-fan-wind]")!;
    expect(wind).toBeInTheDocument();
    expect(wind.querySelectorAll("[data-fan-gust]")).toHaveLength(2);
    // Drawn round the glyph, not read out, and never in a tap's way.
    expect(wind).toHaveAttribute("aria-hidden", "true");
    expect(getComputedStyle(wind).pointerEvents).toBe("none");
    // The glyph spins as it did, and is no part of the wind: each turns at its own pace.
    const glyph = container.querySelector("[data-fan-icon]")!;
    expect(glyph).toHaveAttribute("data-spinning");
    expect(wind.contains(glyph)).toBe(false);
    expect(glyph.contains(wind)).toBe(false);
    expect(wind.querySelector("svg")).toBeNull();
  });

  it("is still with the fan: none round one that is off", () => {
    const { container } = renderWithProviders(<FanIcon on={false} percentage={null} size="1.25rem" color="fg.subtle" />);
    expect(container.querySelector("[data-fan-icon]")).toBeInTheDocument();
    expect(container.querySelector("[data-fan-icon]")).not.toHaveAttribute("data-spinning");
    expect(container.querySelector("[data-fan-wind]")).toBeNull();
  });
});

describe("what comes off a thermostat's mode icon", () => {
  const icon = (props: Partial<Parameters<typeof ClimateModeIcon>[0]>) =>
    renderWithProviders(<ClimateModeIcon mode="heat" on running={false} color="orange.solid" boxSize="5" {...props} />).container;

  it("is the icon again, twice, behind itself: heat off the flame, cold off the flake", () => {
    for (const mode of ["heat", "cool"] as const) {
      const container = icon({ mode });
      const whole = container.querySelector(`[data-mode-icon="${mode}"]`)!;
      const wisps = [...whole.querySelectorAll("[data-mode-wisp]")];
      expect(wisps, mode).toHaveLength(2);
      // The icon itself is the last drawn, over its wisps, and each wisp is its own shape.
      const glyphs = [...whole.querySelectorAll("svg")];
      expect(glyphs).toHaveLength(3);
      expect(glyphs[2].closest("[data-mode-wisp]")).toBeNull();
      for (const wisp of wisps) {
        expect(wisp.innerHTML, mode).toBe(glyphs[2].innerHTML);
        expect(wisp).toHaveAttribute("aria-hidden", "true");
      }
    }
    // The flame and the flake are two drawings.
    expect(drawn(icon({ mode: "heat" }))).not.toBe(drawn(icon({ mode: "cool" })));
  });

  it("is nothing off a thermostat that is off, nor in a mode with no icon of the two", () => {
    for (const props of [{ mode: "off", on: false }, { mode: "heat", on: false }, { mode: "fan_only", on: true }] as const) {
      const container = icon(props);
      expect(container.querySelector("[data-mode-wisp]"), JSON.stringify(props)).toBeNull();
      expect(container.querySelector("[data-mode-icon]"), JSON.stringify(props)).toBeNull();
      // The icon alone, as before.
      expect(container.querySelectorAll("svg")).toHaveLength(1);
    }
  });
});

describe("the thermostat tiles' icons", () => {
  const unit = (over: Partial<HomeClimate> = {}): HomeClimate => ({
    entity_id: "climate.first_floor",
    name: "1st Floor",
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

  it("give off heat in Heat, cold in Cool, wind in Fan, and nothing when off", () => {
    const { getByRole } = renderWithProviders(
      <ClimateTiles
        climate={[
          unit(),
          // At its set point, not running: in Heat all the same.
          unit({ entity_id: "climate.idle", name: "Idle", hvacAction: "idle" }),
          unit({ entity_id: "climate.cool", name: "Cool", state: "cool", hvacMode: "cool", hvacAction: "cooling" }),
          unit({ entity_id: "climate.fan", name: "Fan", state: "fan_only", hvacMode: "fan_only", hvacAction: "fan", fanMode: "low" }),
          unit({ entity_id: "climate.off", name: "Off", state: "off", hvacMode: "off", hvacAction: null }),
        ]}
      />,
    );
    const tile = (name: RegExp) => getByRole("button", { name });
    expect(tile(/^1st Floor:/).querySelectorAll('[data-mode-icon="heat"] [data-mode-wisp]')).toHaveLength(2);
    expect(tile(/^Idle:/).querySelectorAll('[data-mode-icon="heat"] [data-mode-wisp]')).toHaveLength(2);
    expect(tile(/^Cool:/).querySelectorAll('[data-mode-icon="cool"] [data-mode-wisp]')).toHaveLength(2);
    // Fan mode's glyph is the fan, with its wind and no wisp.
    expect(tile(/^Fan:/).querySelector("[data-fan-wind]")).toBeInTheDocument();
    expect(tile(/^Fan:/).querySelector("[data-mode-wisp]")).toBeNull();
    for (const off of [tile(/^Off:/)]) {
      expect(off.querySelector("[data-mode-wisp]")).toBeNull();
      expect(off.querySelector("[data-fan-wind]")).toBeNull();
    }
  });
});
