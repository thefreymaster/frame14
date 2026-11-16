import { describe, expect, it } from "vitest";
import type { HomeClimate } from "../../src/hooks/useHomeData";
import {
  climateColumnsCss,
  climateGridCss,
  climateStatus,
  climateTempRange,
  displayClimateName,
  fanModePercentage,
  fmtClimateTemp,
  getClimateAction,
  hvacPalette,
  isClimateOn,
  normalizeClimateMode,
  TILE_MIN_LG_REM,
  TILE_RING_TWEENS,
  TILE_RING_WIDTH,
  tileRing,
} from "../../src/lib/hvac";
import { TILE_HELD } from "../../src/lib/floatingSurface";

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

describe("climateTempRange (0.131)", () => {
  it("is the rooms' coolest to warmest, rounded, with the degree sign", () => {
    expect(
      climateTempRange([unit({ currentTemp: 64 }), unit({ currentTemp: 75.4 }), unit({ currentTemp: 68 })]),
    ).toBe("64–75°");
  });

  it("is one figure when the rooms agree, and skips a unit with no reading", () => {
    expect(climateTempRange([unit({ currentTemp: 67.6 }), unit({ currentTemp: 68.2 }), unit({ currentTemp: null })])).toBe("68°");
  });

  it("is nothing without a reading", () => {
    expect(climateTempRange([])).toBeNull();
    expect(climateTempRange([unit({ currentTemp: null })])).toBeNull();
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

// 0.157.0: a thermostat's fan mode as FanIcon's pace.
describe("fanModePercentage", () => {
  it("reads the speed a fan mode names, and none for one that names none", () => {
    expect(fanModePercentage("low")).toBe(25);
    expect(fanModePercentage("Quiet")).toBe(25);
    expect(fanModePercentage("medium")).toBe(50);
    expect(fanModePercentage("mid")).toBe(50);
    expect(fanModePercentage("high")).toBe(75);
    expect(fanModePercentage("turbo")).toBe(100);
    expect(fanModePercentage("auto")).toBeNull();
    expect(fanModePercentage(null)).toBeNull();
  });
});

// 0.169.2, the user: "Remove the word AC from the names".
describe("displayClimateName", () => {
  it("drops the word AC, wherever it stands and however it is written", () => {
    expect(displayClimateName("1st Floor AC")).toBe("1st Floor");
    expect(displayClimateName("Main Bedroom AC")).toBe("Main Bedroom");
    expect(displayClimateName("Localthings 1st FLR AC")).toBe("Localthings 1st FLR");
    expect(displayClimateName("AC Upstairs")).toBe("Upstairs");
    expect(displayClimateName("Garage A/C")).toBe("Garage");
    expect(displayClimateName("Office ac unit")).toBe("Office unit");
  });

  it("leaves a name without the word alone, and one that is only the word", () => {
    expect(displayClimateName("Living Room")).toBe("Living Room");
    expect(displayClimateName("Acme Heat Pump")).toBe("Acme Heat Pump");
    expect(displayClimateName("Mac Room")).toBe("Mac Room");
    expect(displayClimateName("climate.samsung_ac")).toBe("climate.samsung_ac");
    expect(displayClimateName("AC")).toBe("AC");
  });
});

describe("tileRing", () => {
  const layers = (shadow: string) => shadow.split(/,(?![^(]*\))/).map((l) => l.trim());

  it("on: the border in the ring's colour and the rest of its width inside it, on a corner that much rounder", () => {
    const ring = tileRing(true, "red");
    expect(ring.borderColor).toBe("red");
    expect(layers(ring.boxShadow)[0]).toBe(`inset 0 0 0 calc(${TILE_RING_WIDTH} - 1px) red`);
    expect(ring.borderRadius).toBe(`calc(var(--chakra-radii-sm) + ${TILE_RING_WIDTH})`);
  });

  it("off: the plain outline, with the ring still listed — no width, no colour — so one state fades into the other", () => {
    const on = layers(tileRing(true, "red").boxShadow);
    const off = layers(tileRing(false, "red").boxShadow);
    expect(tileRing(false, "red").borderColor).toBeUndefined();
    expect(tileRing(false, "red").borderRadius).toBe("sm");
    expect(off[0]).toBe("inset 0 0 0 0px transparent");
    // The same layers in the same order: a list of another shape would jump.
    expect(off).toHaveLength(on.length);
    expect(off.slice(1)).toEqual(on.slice(1));
  });

  it("lists what the tile casts after the ring: the layer that is nothing outside Embossed, and the recess's lip while held", () => {
    for (const on of [true, false]) {
      // Through `--tile-drop`, which the tile's `pressable` sets while it is
      // held (TILE_HELD): pushed in, where it stood up.
      expect(tileRing(on, "red").boxShadow).toMatch(/ (red|transparent), var\(--tile-drop, var\(--chakra-shadows-raised-edge\)\)$/);
    }
    expect(TILE_HELD).toEqual({ "--tile-drop": "shadows.recess.edge", "--tile-face": "shadows.recess.shade" });
  });

  it("starts the raised face where the ring ends, under what the tile holds", () => {
    const on = tileRing(true, "red");
    const off = tileRing(false, "red");
    const face = "var(--tile-face, {shadows.raised.face})";
    expect(on._before).toMatchObject({ inset: `calc(${TILE_RING_WIDTH} - 1px)`, borderRadius: "sm", boxShadow: face, bg: "emboss.floor", zIndex: -1 });
    expect(off._before).toMatchObject({ inset: "0px", boxShadow: face, zIndex: -1 });
    // A layer behind the content needs the tile to hold it.
    expect(on.isolation).toBe("isolate");
  });

  it("names what the tile animates, for its transition list", () => {
    expect(TILE_RING_TWEENS.map(([property]) => property)).toEqual(["box-shadow", "border-color", "border-radius"]);
  });
});
