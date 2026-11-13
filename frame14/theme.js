import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./screen.js";

/**
 * The panels' theme (0.146.0): the Auto / Device / Bright / Dark preference
 * and the palette (Gray / Slate / Sand / Outlines), the same on every panel — a change on
 * one goes to the others (index.js's `theme_mode` / `theme_palette`), and a
 * panel connecting gets them (`current_theme_mode` / `current_theme_palette`).
 * Each panel works out the mode itself (src/lib/themeMode: its own clock for
 * auto, its own system setting for device). Kept in theme.json beside the
 * screen's file (screen.js's DATA_DIR), so a restart — an add-on update —
 * doesn't put every panel back on Dark, as it did while only memory held it.
 */

const FILE = path.join(DATA_DIR, "theme.json");

export const THEME_MODES = Object.freeze(["auto", "device", "bright", "dark"]);
export const THEME_PALETTES = Object.freeze(["gray", "slate", "sand", "outlines"]);
export const DEFAULT_THEME = Object.freeze({ mode: "dark", palette: "gray" });

export const isThemeMode = (v) => THEME_MODES.includes(v);
export const isThemePalette = (v) => THEME_PALETTES.includes(v);

function load() {
  let saved = null;
  try {
    saved = JSON.parse(fs.readFileSync(FILE, "utf-8"));
  } catch {
    // Nothing saved yet.
  }
  return {
    mode: isThemeMode(saved?.mode) ? saved.mode : DEFAULT_THEME.mode,
    palette: isThemePalette(saved?.palette)
      ? saved.palette
      : DEFAULT_THEME.palette,
  };
}

function save(theme) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(theme));
  } catch (err) {
    console.error(`[theme] couldn't save ${FILE}:`, err.message);
  }
}

/**
 * The saved theme: `state()` is `{ mode, palette }`; `setMode(mode)` and
 * `setPalette(palette)` keep a valid value and answer true, and anything else
 * is refused with false.
 */
export function startTheme() {
  let theme = load();
  const set = (next) => {
    theme = { ...theme, ...next };
    save(theme);
    return true;
  };
  return {
    state: () => ({ ...theme }),
    setMode: (mode) => isThemeMode(mode) && set({ mode }),
    setPalette: (palette) => isThemePalette(palette) && set({ palette }),
  };
}
