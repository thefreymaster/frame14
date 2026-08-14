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
  // Elevation: cards lift off the ground with fill, not an outline. A 1px
  // #ffffff24 border is a static line at ~14% luminance; a fill is a field at
  // ~10%, so this is the dimmer option for burn-in as well as the better-looking
  // one. The page ground itself never lifts.
  //
  // Levels are pitched for a cheap tablet panel, not a reference display: on the
  // wall-mounted frame the old ~5% surface-1 was indistinguishable from black,
  // so card edges disappeared. Each step is roughly double the previous fill.
  "--theme-surface-1": "#1A1A1F",
  "--theme-surface-2": "#26262C",
  "--theme-surface-2-on": "#2B3B37",
  "--theme-fg": "#FFFFFF",
  "--theme-fg-dim": "#CBD5E0", // gray.300
  "--theme-fg-muted": "#A0AEC0", // gray.400
  "--theme-fg-faint": "#718096", // gray.500
  "--theme-divider": "#2D3240",
  // Accent for "this thing is on" — a lit light, a running fan. Amber is only
  // legible on black; the bright palette has to darken it or the icon vanishes
  // into the card. See BRIGHT_VARS.
  "--theme-accent-warm": "#FFC857",
  "--theme-marker-cardinal": "#8A8A8A",
  "--theme-marker-hour": "#5E5E5E",
  "--theme-marker-minor": "#333333",
  "--theme-icon-opacity": "0.35",
};

// Bright mode is a true inverse: white background, dark text.
const BRIGHT_VARS: ThemeVars = {
  "--theme-bg": "#FFFFFF",
  // Elevation inverts with the palette: surfaces step down from white.
  "--theme-surface-1": "#F4F6F7",
  "--theme-surface-2": "#EAEFF1",
  "--theme-surface-2-on": "#D8EFEA",
  "--theme-fg": "#1A202C", // gray.800
  "--theme-fg-dim": "#2D3748", // gray.700
  "--theme-fg-muted": "#4A5568", // gray.600
  "--theme-fg-faint": "#718096", // gray.500
  "--theme-divider": "#CBD5E0", // gray.300
  "--theme-accent-warm": "#B45309", // amber.700 — readable on a near-white card
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
  root.classList.toggle("dark", mode === "dark");
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
