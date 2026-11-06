import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The files the loader reads: the add-on's options, or a frame14.json.
const files = vi.hoisted(() => new Map());

vi.mock("node:fs", () => ({
  default: {
    existsSync: (p) => files.has(String(p)),
    readFileSync: (p) => {
      if (!files.has(String(p))) throw new Error(`ENOENT ${p}`);
      return files.get(String(p));
    },
  },
}));

async function load() {
  vi.resetModules();
  const { ENTITIES } = await import("../../entities.js");
  return ENTITIES;
}

const OPTIONS = {
  weather_entity: "weather.home",
  weather_forecast_entity: "weather.forecast",
  weather_temperature_entity: "sensor.outside",
  internet_entity: "binary_sensor.ping",
  light_entities: ["light.a", "switch.b"],
  light_areas: ["Kitchen"],
  climate_entities: ["climate.a"],
  climate_names: [
    { entity: "climate.a", name: "  Upstairs  " },
    { entity: "climate.b", name: "" },
    { entity: 5, name: "x" },
    null,
  ],
  energy_current_production: "sensor.p",
  energy_current_consumption: "sensor.c",
  energy_production_today: "sensor.pt",
  energy_consumption_today: "sensor.ct",
  energy_lifetime_production: "sensor.lp",
  circuit_main_entity: "sensor.main",
  circuit_entities: [{ name: "Oven", power: "sensor.oven" }],
  vacuum_entities: ["vacuum.v"],
  fan_entities: ["fan.f"],
  media_player_entity: "media_player.plex",
  printer_status_entity: "sensor.a1_print_status",
  team_tracker_entities: ["sensor.tt"],
  person_entity: "binary_sensor.person",
  camera_entity: "camera.door",
  camera_entities: ["camera.door", "camera.yard"],
  motion_entity: "binary_sensor.motion",
  route_entity: "input_select.route",
  immich_album_ids: ["aaaaaaaa-0000-4000-8000-000000000001"],
  light_all_off_exclude: ["light.night"],
  calendar_exclude: ["calendar.radarr"],
};

beforeEach(() => {
  files.clear();
  delete process.env.FRAME14_CONFIG;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.FRAME14_CONFIG;
});

describe("the add-on's options", () => {
  it("maps every option onto ENTITIES", async () => {
    files.set("/data/options.json", JSON.stringify(OPTIONS));
    const e = await load();
    expect(e.lights).toEqual(["light.a", "switch.b"]);
    expect(e.lightAreas).toEqual(["Kitchen"]);
    expect(e.weather).toEqual({ current: "weather.home", forecast: "weather.forecast", temperature: "sensor.outside" });
    // 0.159.0: binary_sensor.1_1_1_1 was hard-coded in the client before.
    expect(e.internet).toBe("binary_sensor.ping");
    expect(e.climate).toEqual(["climate.a"]);
    expect(e.energy).toEqual({
      currentProduction: "sensor.p", currentConsumption: "sensor.c",
      productionToday: "sensor.pt", consumptionToday: "sensor.ct",
      lifetimeProduction: "sensor.lp", lifetimeConsumption: "",
    });
    expect(e.circuits).toEqual({ main: "sensor.main", balance: "", items: [{ name: "Oven", power: "sensor.oven" }] });
    expect(e.vacuums).toEqual(["vacuum.v"]);
    expect(e.fans).toEqual(["fan.f"]);
    expect(e.mediaPlayer).toBe("media_player.plex");
    expect(e).not.toHaveProperty("mediaPlayers");
    expect(e.printer).toBe("sensor.a1_print_status");
    expect(e.teamTracker).toEqual(["sensor.tt"]);
    expect(e.person).toBe("binary_sensor.person");
    expect(e.camera).toBe("camera.door");
    expect(e.cameras).toEqual(["camera.door", "camera.yard"]);
    // The house's helpers and lists (0.145.0; hard-coded before).
    expect(e.motion).toBe("binary_sensor.motion");
    expect(e.route).toBe("input_select.route");
    // The photo albums (0.162.0; an input_select of them before).
    expect(e.albums).toEqual(["aaaaaaaa-0000-4000-8000-000000000001"]);
    expect(e.lightAllOffExclude).toEqual(["light.night"]);
    expect(e.calendarExclude).toEqual(["calendar.radarr"]);
  });

  it("turns the helpers off and leaves nothing out when they aren't set", async () => {
    files.set("/data/options.json", JSON.stringify({ weather_entity: "weather.home" }));
    const e = await load();
    expect(e).toMatchObject({ internet: "", motion: "", route: "", albums: [], lightAllOffExclude: [], calendarExclude: [] });
  });

  it("turns climate_names into a map, trimmed, dropping the malformed", async () => {
    files.set("/data/options.json", JSON.stringify(OPTIONS));
    const e = await load();
    expect(e.climateNames).toEqual({ "climate.a": "Upstairs" });
  });

  it("falls back to the forecast entity being the current one", async () => {
    files.set("/data/options.json", JSON.stringify({ weather_entity: "weather.home" }));
    const e = await load();
    expect(e.weather.forecast).toBe("weather.home");
    expect(e.lights).toEqual([]);
    expect(e.circuits).toEqual({ main: "", balance: "", items: [] });
  });

  it("falls back to the current entity for an empty forecast option too", async () => {
    files.set("/data/options.json", JSON.stringify({ weather_entity: "weather.home", weather_forecast_entity: "" }));
    const e = await load();
    expect(e.weather.forecast).toBe("weather.home");
  });

  it("reads options without a weather entity (0.159.0): any option may be left empty", async () => {
    files.set("/data/options.json", JSON.stringify({ light_entities: ["light.a"], energy_current_production: "" }));
    const e = await load();
    expect(e.lights).toEqual(["light.a"]);
    expect(e.weather).toEqual({ current: "", forecast: "", temperature: "" });
    expect(e.energy.currentProduction).toBe("");
    expect(console.warn).not.toHaveBeenCalled();
  });
});

describe("frame14.json", () => {
  it("reads the file FRAME14_CONFIG names", async () => {
    process.env.FRAME14_CONFIG = "tests/stub/frame14.test.json";
    files.set(
      `${process.cwd()}/tests/stub/frame14.test.json`,
      JSON.stringify({
        lights: ["light.x"],
        climateNames: { "climate.a": "Downstairs" },
        weather: { current: "weather.w" },
      }),
    );
    const e = await load();
    expect(e.lights).toEqual(["light.x"]);
    expect(e.climateNames).toEqual({ "climate.a": "Downstairs" });
    expect(e.weather).toEqual({ current: "weather.w" });
    expect(e.lightAreas).toEqual([]);
    expect(e.vacuums).toEqual([]);
  });

  it("takes the climate names as a list too", async () => {
    process.env.FRAME14_CONFIG = "x.json";
    files.set(`${process.cwd()}/x.json`, JSON.stringify({ climateNames: [{ entity: "climate.a", name: "A" }] }));
    const e = await load();
    expect(e.climateNames).toEqual({ "climate.a": "A" });
  });
});

describe("with nothing to read", () => {
  it("is empty, and says so", async () => {
    const e = await load();
    expect(e).toEqual({
      lights: [], lightAreas: [], weather: {}, internet: "", climate: [], climateNames: {}, energy: {},
      circuits: { main: "", balance: "", items: [] }, vacuums: [], fans: [], mediaPlayer: "",
      printer: "", teamTracker: [], person: "", camera: "", cameras: [],
      motion: "", route: "", albums: [], lightAllOffExclude: [], calendarExclude: [],
    });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("no entity config"));
  });
});
