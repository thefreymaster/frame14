import fs from "node:fs";
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
  // HA addon: read entity config from options.json
  const options = fs.existsSync("/data/options.json")
    ? loadJson("/data/options.json")
    : null;

  if (options && options.weather_entity) {
    return {
      lights: options.light_entities ?? [],
      weather: {
        current: options.weather_entity ?? "",
        forecast: options.weather_forecast_entity ?? options.weather_entity ?? "",
        temperature: options.weather_temperature_entity ?? "",
      },
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
      mediaPlayers: options.media_player_entities ?? [],
      printer: options.printer_status_entity ?? "",
      teamTracker: options.team_tracker_entities ?? [],
      person: options.person_entity ?? "",
      camera: options.camera_entity ?? "",
      cameras: options.camera_entities ?? [],
    };
  }

  // Local dev fallback: frame14.json
  const localPath = fileURLToPath(new URL("./frame14.json", import.meta.url));
  const frame14 = fs.existsSync(localPath) ? loadJson(localPath) : null;
  if (frame14) {
    return {
      lights: frame14.lights ?? [],
      weather: frame14.weather ?? {},
      climate: frame14.climate ?? [],
      climateNames: climateNamesFrom(frame14.climateNames),
      energy: frame14.energy ?? {},
      circuits: frame14.circuits ?? { main: "", balance: "", items: [] },
      vacuums: frame14.vacuums ?? [],
      fans: frame14.fans ?? [],
      mediaPlayer: frame14.mediaPlayer ?? "",
      mediaPlayers: frame14.mediaPlayers ?? [],
      printer: frame14.printer ?? "",
      teamTracker: frame14.teamTracker ?? [],
      person: frame14.person ?? "",
      camera: frame14.camera ?? "",
      cameras: frame14.cameras ?? [],
    };
  }

  console.warn("[entities] no entity config found — using empty defaults");
  return {
    lights: [],
    weather: {},
    climate: [],
    climateNames: {},
    energy: {},
    circuits: { main: "", balance: "", items: [] },
    vacuums: [],
    fans: [],
    mediaPlayer: "",
    mediaPlayers: [],
    printer: "",
    teamTracker: [],
    person: "",
    camera: "",
    cameras: [],
  };
}

export const ENTITIES = loadEntities();
