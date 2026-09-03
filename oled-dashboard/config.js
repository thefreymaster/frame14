import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Load dotenv for local dev fallback
try {
  const { config } = await import("dotenv");
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  config({ path: path.join(__dirname, ".env") });
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
// export const HA_TOKEN = process.env.HA_TOKEN ?? "";
export const IMMICH_URL = get("immich_url", "IMMICH_URL", "");
export const IMMICH_API_KEY = get("immich_api_key", "IMMICH_API_KEY", "");
export const PLEX_URL = get("plex_url", "PLEX_URL", "").replace(/\/+$/, "");
export const PLEX_TOKEN = get("plex_token", "PLEX_TOKEN", "");
export const PORT = Number(get("port", "PORT", "4000"));
export const SCREEN_TYPE = get("screen_type", "SCREEN_TYPE", "oled");

// Assist pipeline the mic button runs. Empty = use whichever pipeline Home
// Assistant has marked preferred, so the button works before it is configured.
export const ASSIST_PIPELINE_ID = get("assist_pipeline_id", "ASSIST_PIPELINE_ID", "");
// Optional speaker to also play the spoken reply on. Empty = play only on the
// panel itself, which is the normal case.
export const ASSIST_SPEAKER = get("assist_speaker", "ASSIST_SPEAKER", "");

function loadAddonVersion() {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const yamlPath = path.join(__dirname, "config.yaml");
    if (!fs.existsSync(yamlPath)) return "";
    const text = fs.readFileSync(yamlPath, "utf-8");
    const match = text.match(/^version:\s*["']?([^"'\s]+)["']?/m);
    return match ? match[1] : "";
  } catch {
    return "";
  }
}

export const VERSION = loadAddonVersion();
