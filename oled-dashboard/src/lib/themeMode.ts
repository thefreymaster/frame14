import { socket } from "./socket";

export type ThemeModePreference = "auto" | "bright" | "dark";
export type EffectiveThemeMode = "bright" | "dark";

const STORAGE_KEY = "theme-mode-preference";

// Daylight window used when preference is "auto"
const DAYLIGHT_START_HOUR = 7;
const DAYLIGHT_END_HOUR = 19;

type ThemeVars = Record<string, string>;

const DARK_VARS: ThemeVars = {
  "--theme-bg": "#000000",
  "--theme-fg": "#E2E8F0", // gray.200
  "--theme-fg-dim": "#A0AEC0", // gray.400
  "--theme-fg-muted": "#718096", // gray.500
  "--theme-fg-faint": "#4A5568", // gray.600
  "--theme-divider": "#171923", // gray.900
  "--theme-marker-cardinal": "#666666",
  "--theme-marker-hour": "#444444",
  "--theme-marker-minor": "#222222",
  "--theme-icon-opacity": "0.35",
};

// Bright mode is a true inverse: white background, dark text.
const BRIGHT_VARS: ThemeVars = {
  "--theme-bg": "#FFFFFF",
  "--theme-fg": "#1A202C", // gray.800
  "--theme-fg-dim": "#2D3748", // gray.700
  "--theme-fg-muted": "#4A5568", // gray.600
  "--theme-fg-faint": "#718096", // gray.500
  "--theme-divider": "#CBD5E0", // gray.300
  "--theme-marker-cardinal": "#2D3748",
  "--theme-marker-hour": "#718096",
  "--theme-marker-minor": "#CBD5E0",
  "--theme-icon-opacity": "1",
};

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

export function applyThemeVars(mode: EffectiveThemeMode) {
  if (typeof document === "undefined") return;
  const vars = mode === "bright" ? BRIGHT_VARS : DARK_VARS;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }
  root.dataset.themeMode = mode;
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
