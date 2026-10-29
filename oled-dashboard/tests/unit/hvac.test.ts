import { describe, expect, it } from "vitest";
import type { HomeClimate } from "../../src/hooks/useHomeData";
import {
  climateColumnsCss,
  climateGridCss,
  climateStatus,
  fmtClimateTemp,
  getClimateAction,
  hvacPalette,
  isClimateOn,
  normalizeClimateMode,
  TILE_MIN_LG_REM,
} from "../../src/lib/hvac";

const unit = (over: Partial<HomeClimate> = {}): HomeClimate => ({
  entity_id: "climate.test",
  name: "Test",
  state: "off",
  currentTemp: 68,
  currentHumidity: null,
  targetTemp: 70,
  hvacMode: null,
  hvacAction: null,
  fanMode: "auto",
  fanModes: ["auto", "low"],
  ...over,
});

describe("normalizeClimateMode", () => {
  it("keeps heat, cool and fan_only; everything else draws as off", () => {
    expect(normalizeClimateMode("heat")).toBe("heat");
    expect(normalizeClimateMode("cool")).toBe("cool");
    expect(normalizeClimateMode("fan_only")).toBe("fan_only");
    expect(normalizeClimateMode("auto")).toBe("off");
    expect(normalizeClimateMode("dry")).toBe("off");
    expect(normalizeClimateMode(null)).toBe("off");
    expect(normalizeClimateMode(undefined)).toBe("off");
  });
});

describe("isClimateOn", () => {
  it("is false for off, unavailable and unknown", () => {
    expect(isClimateOn(unit({ state: "off" }))).toBe(false);
    expect(isClimateOn(unit({ state: "unavailable" }))).toBe(false);
    expect(isClimateOn(unit({ state: "unknown" }))).toBe(false);
  });

  it("counts auto and dry as on, though their tiles draw as off", () => {
    expect(isClimateOn(unit({ state: "auto" }))).toBe(true);
    expect(isClimateOn(unit({ state: "dry" }))).toBe(true);
    expect(isClimateOn(unit({ state: "heat" }))).toBe(true);
  });

  it("prefers hvacMode over the state", () => {
    expect(isClimateOn(unit({ state: "heat", hvacMode: "off" }))).toBe(false);
    expect(isClimateOn(unit({ state: "off", hvacMode: "cool" }))).toBe(true);
  });
});

describe("fmtClimateTemp", () => {
  it("rounds, and passes nothing through", () => {
    expect(fmtClimateTemp(69.6)).toBe(70);
    expect(fmtClimateTemp(69.4)).toBe(69);
    expect(fmtClimateTemp(null)).toBeNull();
    expect(fmtClimateTemp(undefined)).toBeNull();
  });
});

describe("climateStatus", () => {
  it("heating now: 'Heating to 70°'", () => {
    const s = climateStatus(unit({ state: "heat", hvacAction: "heating", targetTemp: 70 }));
    expect(s).toMatchObject({
      mode: "heat",
      shown: "heat",
      on: true,
      running: true,
      target: 70,
      status: "Heating to 70°",
      spoken: "Heating to 70°",
    });
  });

  it("heat idle: 'Heat · set 70°', spoken with a comma", () => {
    const s = climateStatus(unit({ state: "heat", hvacAction: "idle", targetTemp: 69.7 }));
    expect(s.running).toBe(false);
    expect(s.target).toBe(70);
    expect(s.status).toBe("Heat · set 70°");
    expect(s.spoken).toBe("Heat, set to 70°");
  });

  it("cooling now", () => {
    const s = climateStatus(unit({ state: "cool", hvacAction: "cooling", targetTemp: 72 }));
    expect(s.shown).toBe("cool");
    expect(s.status).toBe("Cooling to 72°");
  });

  it("fan only has no target", () => {
    const s = climateStatus(unit({ state: "fan_only", targetTemp: 70 }));
    expect(s).toMatchObject({ on: true, running: false, target: null, status: "Fan", spoken: "Fan" });
  });

  it("off is off", () => {
    const s = climateStatus(unit({ state: "off" }));
    expect(s).toMatchObject({ on: false, running: false, target: null, status: "Off" });
  });

  it("a running action is drawn even when the mode says otherwise", () => {
    const s = climateStatus(unit({ state: "auto", hvacAction: "heating", targetTemp: 70 }));
    expect(s.mode).toBe("off");
    expect(s.shown).toBe("heat");
    expect(s.on).toBe(true);
    // auto has no target of its own to show.
    expect(s.status).toBe("Heating");
  });

  it("heat without a target reads as the bare mode", () => {
    const s = climateStatus(unit({ state: "heat", targetTemp: null }));
    expect(s.status).toBe("Heat");
    expect(s.target).toBeNull();
  });
});

describe("getClimateAction", () => {
  it("takes Home Assistant's live action first", () => {
    expect(getClimateAction("off", unit({ hvacAction: "Heating" }), 70)).toBe("heat");
    expect(getClimateAction("heat", unit({ hvacAction: "cooling" }), 70)).toBe("cool");
    expect(getClimateAction("heat", unit({ hvacAction: "fan" }), 70)).toBe("fan_only");
  });

  it("off and fan_only need no reading", () => {
    expect(getClimateAction("off", unit(), 70)).toBeNull();
    expect(getClimateAction("fan_only", unit(), 70)).toBe("fan_only");
  });

  it("heat runs a degree under the target, cool a degree over", () => {
    expect(getClimateAction("heat", unit({ currentTemp: 69 }), 70)).toBe("heat");
    expect(getClimateAction("heat", unit({ currentTemp: 70 }), 70)).toBeNull();
    expect(getClimateAction("cool", unit({ currentTemp: 73 }), 72)).toBe("cool");
    expect(getClimateAction("cool", unit({ currentTemp: 72 }), 72)).toBeNull();
  });

  it("is nothing without a room temperature", () => {
    expect(getClimateAction("heat", unit({ currentTemp: null }), 70)).toBeNull();
  });
});

describe("hvacPalette", () => {
  it("maps each key to a Chakra palette", () => {
    expect(hvacPalette("heat").palette).toBe("orange");
    expect(hvacPalette("cool").palette).toBe("blue");
    expect(hvacPalette("fan_only").palette).toBe("teal");
    expect(hvacPalette("auto").palette).toBe("green");
  });

  it("rings a running unit in the full accent, an idle one at 70%", () => {
    const running = hvacPalette("heating");
    expect(running.ring).toBe(running.accent);
    const idle = hvacPalette("heat");
    expect(idle.accent).toBe("var(--chakra-colors-orange-solid)");
    expect(idle.ring).toBe("color-mix(in srgb, var(--chakra-colors-orange-solid) 70%, transparent)");
  });

  it("is grey for an unknown key", () => {
    expect(hvacPalette("off")).toEqual({
      accent: "var(--chakra-colors-fg-muted)",
      ring: "var(--chakra-colors-border-emphasized)",
      palette: "gray",
    });
  });
});

describe("the tile columns", () => {
  it("one, then two, then all, at the widths the tiles need", () => {
    const css = climateColumnsCss(4) as Record<string, unknown>;
    expect(css.gridTemplateColumns).toBe("repeat(1, minmax(0, 1fr))");
    // Two 9rem tiles and a 0.75rem gap; four tiles and three gaps.
    expect(css["@container (min-width: 18.75rem)"]).toEqual({
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    });
    expect(css["@container (min-width: 38.25rem)"]).toEqual({
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    });
  });

  it("never a row of three with one left over", () => {
    const css = climateColumnsCss(3) as Record<string, unknown>;
    expect(Object.keys(css)).toEqual([
      "gridTemplateColumns",
      "@container (min-width: 18.75rem)",
      "@container (min-width: 28.5rem)",
    ]);
  });

  it("a single tile has one column at every width", () => {
    const css = climateColumnsCss(1) as Record<string, unknown>;
    expect(Object.keys(css)).toEqual(["gridTemplateColumns", "@container (min-width: 9rem)"]);
  });

  it("the lg tiles are wider: four need 58.25rem", () => {
    const css = climateGridCss(4, TILE_MIN_LG_REM) as Record<string, unknown>;
    expect(css.gap).toBe("0.75rem");
    expect(css["@container (min-width: 28.75rem)"]).toBeDefined();
    expect(css["@container (min-width: 58.25rem)"]).toBeDefined();
  });
});
