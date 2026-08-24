import fs from "node:fs";
import { fileURLToPath } from "node:url";

function loadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
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
      energy: {
        currentProduction: options.energy_current_production ?? "",
        currentConsumption: options.energy_current_consumption ?? "",
        productionToday: options.energy_production_today ?? "",
        consumptionToday: options.energy_consumption_today ?? "",
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
      bird: options.bird_species_entity ?? "",
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
      energy: frame14.energy ?? {},
      circuits: frame14.circuits ?? { main: "", balance: "", items: [] },
      vacuums: frame14.vacuums ?? [],
      fans: frame14.fans ?? [],
      mediaPlayer: frame14.mediaPlayer ?? "",
      printer: frame14.printer ?? "",
      bird: frame14.bird ?? "",
    };
  }

  console.warn("[entities] no entity config found — using empty defaults");
  return {
    lights: [],
    weather: {},
    climate: [],
    energy: {},
    circuits: { main: "", balance: "", items: [] },
    vacuums: [],
    fans: [],
    mediaPlayer: "",
    printer: "",
    bird: "",
  };
}

export const ENTITIES = loadEntities();
