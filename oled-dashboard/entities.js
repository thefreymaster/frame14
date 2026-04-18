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
      },
      climate: options.climate_entities ?? [],
      energy: {
        currentProduction: options.energy_current_production ?? "",
        currentConsumption: options.energy_current_consumption ?? "",
        productionToday: options.energy_production_today ?? "",
        consumptionToday: options.energy_consumption_today ?? "",
      },
    };
  }

  // Local dev fallback: frame14.json
  const localPath = fileURLToPath(new URL("./frame14.json", import.meta.url));
  const frame14 = fs.existsSync(localPath) ? loadJson(localPath) : null;
  if (frame14) return frame14;

  console.warn("[entities] no entity config found — using empty defaults");
  return { lights: [], weather: {}, climate: [], energy: {} };
}

export const ENTITIES = loadEntities();
