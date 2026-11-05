import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function loadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * The thermostats' labels by entity id: the add-on's `climate_names` list of
 * `{ entity, name }` (frame14.json may give the same list, or an object
 * keyed by entity id). A thermostat with no entry is labelled by its
 * `friendly_name`, as before; an entry replaces that — LocalThings' Samsung
 * entities are named after the device ("Localthings 1st FLR AC").
 */
function climateNamesFrom(raw) {
  if (Array.isArray(raw)) {
    return Object.fromEntries(
      raw
        .filter((e) => e && typeof e.entity === "string" && typeof e.name === "string" && e.name.trim())
        .map((e) => [e.entity, e.name.trim()]),
    );
  }
  if (raw && typeof raw === "object") return { ...raw };
  return {};
}

function loadEntities() {
  // HA addon: read entity config from options.json, which the Supervisor
  // always writes. Any option may be left empty, the weather's too (0.159.0;
  // a file without a weather entity was ignored before): a feature without
  // its entities is left out of the pages (src/lib/features).
  const options = fs.existsSync("/data/options.json")
    ? loadJson("/data/options.json")
    : null;

  if (options) {
    return {
      lights: options.light_entities ?? [],
      lightAreas: options.light_areas ?? [],
      weather: {
        current: options.weather_entity ?? "",
        forecast: options.weather_forecast_entity || options.weather_entity || "",
        temperature: options.weather_temperature_entity ?? "",
      },
      internet: options.internet_entity ?? "",
      climate: options.climate_entities ?? [],
      climateNames: climateNamesFrom(options.climate_names),
      energy: {
        currentProduction: options.energy_current_production ?? "",
        currentConsumption: options.energy_current_consumption ?? "",
        productionToday: options.energy_production_today ?? "",
        consumptionToday: options.energy_consumption_today ?? "",
        lifetimeProduction: options.energy_lifetime_production ?? "",
        lifetimeConsumption: options.energy_lifetime_consumption ?? "",
      },
      circuits: {
        main: options.circuit_main_entity ?? "",
        balance: options.circuit_balance_entity ?? "",
        items: options.circuit_entities ?? [],
      },
      vacuums: options.vacuum_entities ?? [],
      fans: options.fan_entities ?? [],
      mediaPlayer: options.media_player_entity ?? "",
      printer: options.printer_status_entity ?? "",
      teamTracker: options.team_tracker_entities ?? [],
      person: options.person_entity ?? "",
      camera: options.camera_entity ?? "",
      cameras: options.camera_entities ?? [],
      motion: options.motion_entity ?? "",
      route: options.route_entity ?? "",
      album: options.album_entity ?? "",
      lightAllOffExclude: options.light_all_off_exclude ?? [],
      calendarExclude: options.calendar_exclude ?? [],
    };
  }

  // Local dev fallback: frame14.json — or the file FRAME14_CONFIG names (the
  // end-to-end tests point it at tests/stub/frame14.test.json).
  const localPath = process.env.FRAME14_CONFIG
    ? path.resolve(process.env.FRAME14_CONFIG)
    : fileURLToPath(new URL("./frame14.json", import.meta.url));
  const frame14 = fs.existsSync(localPath) ? loadJson(localPath) : null;
  if (frame14) {
    return {
      lights: frame14.lights ?? [],
      lightAreas: frame14.lightAreas ?? [],
      weather: frame14.weather ?? {},
      internet: frame14.internet ?? "",
      climate: frame14.climate ?? [],
      climateNames: climateNamesFrom(frame14.climateNames),
      energy: frame14.energy ?? {},
      circuits: frame14.circuits ?? { main: "", balance: "", items: [] },
      vacuums: frame14.vacuums ?? [],
      fans: frame14.fans ?? [],
      mediaPlayer: frame14.mediaPlayer ?? "",
      printer: frame14.printer ?? "",
      teamTracker: frame14.teamTracker ?? [],
      person: frame14.person ?? "",
      camera: frame14.camera ?? "",
      cameras: frame14.cameras ?? [],
      motion: frame14.motion ?? "",
      route: frame14.route ?? "",
      album: frame14.album ?? "",
      lightAllOffExclude: frame14.lightAllOffExclude ?? [],
      calendarExclude: frame14.calendarExclude ?? [],
    };
  }

  console.warn("[entities] no entity config found — using empty defaults");
  return {
    lights: [],
    lightAreas: [],
    weather: {},
    internet: "",
    climate: [],
    climateNames: {},
    energy: {},
    circuits: { main: "", balance: "", items: [] },
    vacuums: [],
    fans: [],
    mediaPlayer: "",
    printer: "",
    teamTracker: [],
    person: "",
    camera: "",
    cameras: [],
    motion: "",
    route: "",
    album: "",
    lightAllOffExclude: [],
    calendarExclude: [],
  };
}

export const ENTITIES = loadEntities();
