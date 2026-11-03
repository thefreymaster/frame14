import { socket } from "./socket";
import {
  DEFAULT_PALETTE,
  isThemePalette,
  type ThemePalette,
} from "./themePalettes";

export type ThemeModePreference = "auto" | "device" | "bright" | "dark";
export type EffectiveThemeMode = "bright" | "dark";
export type { ThemePalette } from "./themePalettes";

const STORAGE_KEY = "theme-mode-preference";
const PALETTE_KEY = "theme-palette";

const PREFERENCES: readonly ThemeModePreference[] = [
  "auto",
  "device",
  "bright",
  "dark",
];

// Daylight window used when preference is "auto"
const DAYLIGHT_START_HOUR = 7;
const DAYLIGHT_END_HOUR = 19;

// What "device" follows: the system's light / dark setting.
const DARK_QUERY = "(prefers-color-scheme: dark)";

// Colours are Chakra's own light and dark modes, in one of the palettes
// (lib/themePalettes). This module decides which mode is live — auto follows
// the daylight window, device the system's setting — and syncs the choice and
// the palette across panels; components/ui/provider.tsx hands the mode to
// Chakra's colour mode and swaps the palette under <html data-palette>.

export function isThemePreference(
  value: unknown,
): value is ThemeModePreference {
  return (
    typeof value === "string" &&
    (PREFERENCES as readonly string[]).includes(value)
  );
}

export function isDaylight(date: Date = new Date()): boolean {
  const h = date.getHours();
  return h >= DAYLIGHT_START_HOUR && h < DAYLIGHT_END_HOUR;
}

/** Whether the system is set to dark mode (false where it can't be read). */
export function prefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(DARK_QUERY).matches;
}

export function computeEffectiveMode(
  pref: ThemeModePreference,
  date: Date = new Date(),
): EffectiveThemeMode {
  if (pref === "bright") return "bright";
  if (pref === "dark") return "dark";
  if (pref === "device") return prefersDark() ? "dark" : "bright";
  return isDaylight(date) ? "bright" : "dark";
}

/**
 * Mark `mode` and `palette` on <html> before React mounts, so the first paint
 * is already in the right colours; the colour-mode provider keeps the mode in
 * step afterwards. (Name kept from when it wrote CSS vars.)
 */
export function applyThemeVars(
  mode: EffectiveThemeMode,
  palette: ThemePalette,
) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.themeMode = mode;
  root.dataset.palette = palette;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode === "dark" ? "dark" : "light";
}

function load<T>(key: string, valid: (v: unknown) => v is T, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (valid(stored)) return stored;
  } catch {
    // ignore
  }
  return fallback;
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export interface ThemeState {
  preference: ThemeModePreference;
  palette: ThemePalette;
  effectiveMode: EffectiveThemeMode;
}

type Listener = () => void;
const listeners = new Set<Listener>();

const initialPreference = load(STORAGE_KEY, isThemePreference, "dark");
let theme: ThemeState = {
  preference: initialPreference,
  palette: load(PALETTE_KEY, isThemePalette, DEFAULT_PALETTE),
  effectiveMode: computeEffectiveMode(initialPreference),
};

// Apply immediately so the first paint uses the correct palette.
applyThemeVars(theme.effectiveMode, theme.palette);

/** The preference, the palette and the mode they give now. */
export function getTheme(): ThemeState {
  return theme;
}

export function subscribeTheme(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function update(next: Partial<ThemeState>) {
  const merged = { ...theme, ...next };
  const effectiveMode = computeEffectiveMode(merged.preference);
  if (
    merged.preference === theme.preference &&
    merged.palette === theme.palette &&
    effectiveMode === theme.effectiveMode
  ) {
    return;
  }
  theme = { ...merged, effectiveMode };
  applyThemeVars(theme.effectiveMode, theme.palette);
  listeners.forEach((fn) => fn());
}

export function getThemePreference(): ThemeModePreference {
  return theme.preference;
}

export function setThemePreference(
  pref: ThemeModePreference,
  opts: { broadcast?: boolean } = {},
) {
  const broadcast = opts.broadcast ?? true;
  if (!isThemePreference(pref) || theme.preference === pref) return;
  store(STORAGE_KEY, pref);
  update({ preference: pref });
  if (broadcast) {
    socket.emit("theme_mode", pref);
  }
}

export function getThemePalette(): ThemePalette {
  return theme.palette;
}

export function setThemePalette(
  palette: ThemePalette,
  opts: { broadcast?: boolean } = {},
) {
  const broadcast = opts.broadcast ?? true;
  if (!isThemePalette(palette) || theme.palette === palette) return;
  store(PALETTE_KEY, palette);
  update({ palette });
  if (broadcast) {
    socket.emit("theme_palette", palette);
  }
}

// Auto flips at the daylight boundary, checked once a minute; device follows
// the system's setting as it changes (a phone's own sunset switch, say).
function refresh() {
  update({});
}
if (typeof window !== "undefined") {
  setInterval(() => {
    if (theme.preference === "auto") refresh();
  }, 60_000);
  window.matchMedia?.(DARK_QUERY).addEventListener?.("change", refresh);
}

// Sync from other clients / server state on (re)connect.
socket.on("theme_mode", (pref: ThemeModePreference) => {
  setThemePreference(pref, { broadcast: false });
});
socket.on("current_theme_mode", (pref: ThemeModePreference) => {
  setThemePreference(pref, { broadcast: false });
});
socket.on("theme_palette", (palette: ThemePalette) => {
  setThemePalette(palette, { broadcast: false });
});
socket.on("current_theme_palette", (palette: ThemePalette) => {
  setThemePalette(palette, { broadcast: false });
});
