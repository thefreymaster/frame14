import fs from "node:fs";

// Load dotenv for local dev fallback
try {
  const { config } = await import("dotenv");
  config();
} catch {
  // dotenv not critical
}

function loadAddonOptions() {
  const optionsPath = "/data/options.json";
  if (fs.existsSync(optionsPath)) {
    try {
      return JSON.parse(fs.readFileSync(optionsPath, "utf-8"));
    } catch {
      console.warn("Failed to parse /data/options.json, falling back to env");
    }
  }
  return null;
}

const options = loadAddonOptions();

function get(addonKey, envKey, fallback = "") {
  if (options && options[addonKey] !== undefined) return options[addonKey];
  return process.env[envKey] ?? fallback;
}

export const HA_URL = get("ha_url", "HA_URL", "http://supervisor/core");
export const HA_TOKEN = get("ha_token", "HA_TOKEN", "");
export const IMMICH_URL = get("immich_url", "IMMICH_URL", "");
export const IMMICH_API_KEY = get("immich_api_key", "IMMICH_API_KEY", "");
export const IMMICH_ALBUM_ID = get("immich_album_id", "IMMICH_ALBUM_ID", "");
export const PORT = Number(get("port", "PORT", "4000"));
