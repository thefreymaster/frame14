import { describe, expect, it } from "vitest";
import type { EntitiesConfig } from "../../src/hooks/useEntitiesConfig";
import { FEATURES_UNTIL_LOADED, featuresOf } from "../../src/lib/features";

const EMPTY: EntitiesConfig = {
  lights: [],
  lightAreas: [],
  weather: { current: "", forecast: "" },
  climate: [],
  energy: { currentProduction: "", currentConsumption: "", productionToday: "", consumptionToday: "" },
  circuits: { main: "", balance: "", items: [] },
  vacuums: [],
  fans: [],
  mediaPlayer: "",
  printer: "",
  teamTracker: [],
  person: "",
  camera: "",
  cameras: [],
  photos: false,
  unraid: [],
};

const on = (config: Partial<EntitiesConfig>) =>
  Object.entries(featuresOf({ ...EMPTY, ...config }))
    .filter(([, v]) => v)
    .map(([k]) => k)
    .sort();

describe("featuresOf", () => {
  it("has nothing for an install with nothing set up", () => {
    expect(on({})).toEqual([]);
  });

  it("counts everything but Unraid as set up until the config has loaded", () => {
    expect(featuresOf(undefined)).toBe(FEATURES_UNTIL_LOADED);
    expect(Object.entries(FEATURES_UNTIL_LOADED).filter(([, v]) => !v).map(([k]) => k)).toEqual(["unraid"]);
  });

  it("needs both power-now sensors for solar, and either solar or a circuit for Energy", () => {
    expect(on({ energy: { ...EMPTY.energy, currentProduction: "sensor.p" } })).toEqual([]);
    expect(on({ energy: { ...EMPTY.energy, currentProduction: "sensor.p", currentConsumption: "sensor.c" } })).toEqual(["energy", "solar"]);
    // The today sensors alone aren't enough: /api/energy needs the power now.
    expect(on({ energy: { ...EMPTY.energy, productionToday: "sensor.pt", consumptionToday: "sensor.ct" } })).toEqual([]);
    expect(on({ circuits: { main: "sensor.main", items: [{ name: "Oven", power: "sensor.oven" }] } })).toEqual(["circuits", "energy"]);
    // A main sensor without circuits has no Circuits tab to show.
    expect(on({ circuits: { main: "sensor.main", items: [] } })).toEqual([]);
  });

  it("has lights with a light or an area, before the area's lights are found", () => {
    expect(on({ lights: ["switch.x"] })).toEqual(["lights"]);
    expect(on({ lightAreas: ["Kitchen"] })).toEqual(["lights"]);
  });

  it("has cameras with a camera, the doorbell's, the printer's or a vacuum's map", () => {
    expect(on({ cameras: ["camera.yard"] })).toEqual(["cameras"]);
    expect(on({ camera: "camera.door" })).toEqual(["cameras"]);
    expect(on({ printer: "sensor.a1_print_status" })).toEqual(["cameras", "printer"]);
    expect(on({ vacuums: ["vacuum.v"] })).toEqual(["cameras", "vacuum"]);
  });

  it("reads each of the rest from its own option", () => {
    expect(on({ weather: { current: "weather.home", forecast: "" } })).toEqual(["weather"]);
    expect(on({ climate: ["climate.a"] })).toEqual(["climate"]);
    expect(on({ fans: ["fan.f"] })).toEqual(["fans"]);
    expect(on({ teamTracker: ["sensor.tt"] })).toEqual(["football"]);
  });

  it("keeps Photos for a config from before 0.145.0, and Unraid only with a server", () => {
    expect(on({ photos: undefined })).toEqual(["photos"]);
    expect(on({ unraid: undefined })).toEqual([]);
    expect(on({ unraid: [{} as NonNullable<EntitiesConfig["unraid"]>[number]] })).toEqual(["unraid"]);
  });
});
