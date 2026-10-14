import { socket } from "./socket";

export type ThemeModePreference = "auto" | "bright" | "dark";
export type EffectiveThemeMode = "bright" | "dark";

const STORAGE_KEY = "theme-mode-preference";

// Daylight window used when preference is "auto"
const DAYLIGHT_START_HOUR = 7;
const DAYLIGHT_END_HOUR = 19;

// The palettes themselves live in the Chakra system (src/theme/tokens.ts) as
// semantic tokens with a `_dark` value. This module only decides which one is
// live, by toggling the `dark` class on <html> — Chakra's dark condition — so
// every token and every library component flips together.

export function isDaylight(date: Date = new Date()): boolean {
  const h = date.getHours();
  return h >= DAYLIGHT_START_HOUR && h < DAYLIGHT_END_HOUR;
}

export function computeEffectiveMode(
  pref: ThemeModePreference,
  date: Date = new Date(),
): EffectiveThemeMode {
  if (pref === "bright") return "bright";
  if (pref === "dark") return "dark";
  return isDaylight(date) ? "bright" : "dark";
}

/** Make `mode` the live palette. (Name kept from when it wrote CSS vars.) */
export function applyThemeVars(mode: EffectiveThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.themeMode = mode;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode === "dark" ? "dark" : "light";
}

function loadPreference(): ThemeModePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "auto" || stored === "bright" || stored === "dark") {
      return stored;
    }
  } catch {
    // ignore
  }
  return "dark";
}

type Listener = (pref: ThemeModePreference) => void;
const listeners = new Set<Listener>();
let preference: ThemeModePreference = loadPreference();

// Apply immediately so the first paint uses the correct palette.
applyThemeVars(computeEffectiveMode(preference));

export function getThemePreference(): ThemeModePreference {
  return preference;
}

export function setThemePreference(
  pref: ThemeModePreference,
  opts: { broadcast?: boolean } = {},
) {
  const broadcast = opts.broadcast ?? true;
  if (preference === pref) return;
  preference = pref;
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // ignore
  }
  applyThemeVars(computeEffectiveMode(pref));
  listeners.forEach((fn) => fn(pref));
  if (broadcast) {
    socket.emit("theme_mode", pref);
  }
}

export function subscribeThemePreference(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// Sync from other clients / server state on (re)connect.
socket.on("theme_mode", (pref: ThemeModePreference) => {
  setThemePreference(pref, { broadcast: false });
});
socket.on("current_theme_mode", (pref: ThemeModePreference) => {
  setThemePreference(pref, { broadcast: false });
});
