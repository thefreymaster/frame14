import { socket } from "./socket";
import { getDeviceMode, subscribeDeviceMode } from "./deviceMode";
import {
  DEFAULT_PALETTE,
  isThemePalette,
  type ThemePalette,
} from "./themePalettes";

export type ThemeModePreference = "auto" | "device" | "bright" | "dark";
export type EffectiveThemeMode = "bright" | "dark";
export type { ThemePalette } from "./themePalettes";

// The frames' theme, as the server last said (the early paint's on a frame).
const STORAGE_KEY = "theme-mode-preference";
const PALETTE_KEY = "theme-palette";
// This device's own, a remote's (0.148.0): never sent anywhere.
const LOCAL_KEY = "local-theme-mode";
const LOCAL_PALETTE_KEY = "local-theme-palette";

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
// (lib/themePalettes). There are two themes: the frames' — set from the
// Display tab, synced across panels through the server, worn by every
// frame-mode device — and this device's own — set from the Device tab's
// Appearance card, kept here, worn while this device is a remote (0.148.0,
// the user: the remote's theme was changing the frame's, "we should have a
// theme and colors selector for this device under device"; until then the
// one theme was every panel's). This module decides which mode is live — auto
// follows the daylight window, device the system's setting — and
// components/ui/provider.tsx hands it to Chakra's colour mode and swaps the
// palette under <html data-palette>.

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
 * The page's `color-scheme` for a mode. Bright is `only light` (0.163.2): a
 * browser that darkens pages itself — Android's WebView under a dark system
 * theme (algorithmic darkening; the frames' Fully Kiosk), Chrome's and
 * Samsung Internet's dark modes for web pages — repainted a plain `light`
 * page dark ("Bright mode isn't working on frame14 devices"), and `only` is
 * the page saying not to. Dark already says the page has its own dark.
 */
export function colorSchemeFor(mode: EffectiveThemeMode): string {
  return mode === "dark" ? "dark" : "only light";
}

/**
 * Mark `mode` and `palette` on <html> before React mounts, so the first paint
 * is already in the right colours; the colour-mode provider keeps the mode in
 * step afterwards. This module alone sets `color-scheme` (the provider's
 * next-themes is told not to). (Name kept from when it wrote CSS vars.)
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
  root.style.colorScheme = colorSchemeFor(mode);
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

/** A theme: when it is light or dark, and its colours. */
export interface ThemeChoice {
  preference: ThemeModePreference;
  palette: ThemePalette;
}

export interface ThemeState {
  /** The frames' theme, every frame-mode device's (the Display tab's). */
  frames: ThemeChoice;
  /** This device's own (the Device tab's Appearance card). */
  local: ThemeChoice;
  /** Whether this device wears its own: it's a remote. */
  own: boolean;
  /** The worn theme's palette, and its mode now. */
  palette: ThemePalette;
  effectiveMode: EffectiveThemeMode;
}

function loadFrames(): ThemeChoice {
  const preference = read(STORAGE_KEY);
  const palette = read(PALETTE_KEY);
  return {
    preference: isThemePreference(preference) ? preference : "dark",
    palette: isThemePalette(palette) ? palette : DEFAULT_PALETTE,
  };
}

/**
 * This device's own theme. A device from before 0.148.0 keeps what it showed
 * — the frames' theme it had stored — and a new one follows its system in
 * Gray; either is saved at once, so a later change of the frames' doesn't move
 * it.
 */
function loadLocal(): ThemeChoice {
  const preference = read(LOCAL_KEY);
  const palette = read(LOCAL_PALETTE_KEY);
  const before = read(STORAGE_KEY);
  const beforePalette = read(PALETTE_KEY);
  const local: ThemeChoice = {
    preference: isThemePreference(preference)
      ? preference
      : isThemePreference(before)
        ? before
        : "device",
    palette: isThemePalette(palette)
      ? palette
      : isThemePalette(beforePalette)
        ? beforePalette
        : DEFAULT_PALETTE,
  };
  if (preference !== local.preference) store(LOCAL_KEY, local.preference);
  if (palette !== local.palette) store(LOCAL_PALETTE_KEY, local.palette);
  return local;
}

function isRemote(): boolean {
  try {
    return getDeviceMode() === "controller";
  } catch {
    return false;
  }
}

/** The state for these themes on this device, now. */
function derive(frames: ThemeChoice, local: ThemeChoice): ThemeState {
  const own = isRemote();
  const worn = own ? local : frames;
  return {
    frames,
    local,
    own,
    palette: worn.palette,
    effectiveMode: computeEffectiveMode(worn.preference),
  };
}

type Listener = () => void;
const listeners = new Set<Listener>();

let theme: ThemeState = derive(loadFrames(), loadLocal());

// Apply immediately so the first paint uses the correct palette.
applyThemeVars(theme.effectiveMode, theme.palette);

/** Both themes, and the one this device wears now. */
export function getTheme(): ThemeState {
  return theme;
}

export function subscribeTheme(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function update(next: { frames?: ThemeChoice; local?: ThemeChoice } = {}) {
  const derived = derive(next.frames ?? theme.frames, next.local ?? theme.local);
  if (
    derived.frames === theme.frames &&
    derived.local === theme.local &&
    derived.own === theme.own &&
    derived.palette === theme.palette &&
    derived.effectiveMode === theme.effectiveMode
  ) {
    return;
  }
  theme = derived;
  applyThemeVars(theme.effectiveMode, theme.palette);
  listeners.forEach((fn) => fn());
}

/** The frames' theme mode; sent to the server, which sends it to every panel. */
export function setThemePreference(
  pref: ThemeModePreference,
  opts: { broadcast?: boolean } = {},
) {
  const broadcast = opts.broadcast ?? true;
  if (!isThemePreference(pref) || theme.frames.preference === pref) return;
  store(STORAGE_KEY, pref);
  update({ frames: { ...theme.frames, preference: pref } });
  if (broadcast) {
    socket.emit("theme_mode", pref);
  }
}

/** The frames' palette; sent to the server, which sends it to every panel. */
export function setThemePalette(
  palette: ThemePalette,
  opts: { broadcast?: boolean } = {},
) {
  const broadcast = opts.broadcast ?? true;
  if (!isThemePalette(palette) || theme.frames.palette === palette) return;
  store(PALETTE_KEY, palette);
  update({ frames: { ...theme.frames, palette } });
  if (broadcast) {
    socket.emit("theme_palette", palette);
  }
}

/** This device's own theme mode, kept here alone. */
export function setLocalThemePreference(pref: ThemeModePreference) {
  if (!isThemePreference(pref) || theme.local.preference === pref) return;
  store(LOCAL_KEY, pref);
  update({ local: { ...theme.local, preference: pref } });
}

/** This device's own palette, kept here alone. */
export function setLocalThemePalette(palette: ThemePalette) {
  if (!isThemePalette(palette) || theme.local.palette === palette) return;
  store(LOCAL_PALETTE_KEY, palette);
  update({ local: { ...theme.local, palette } });
}

// Auto flips at the daylight boundary, checked once a minute; device follows
// the system's setting as it changes (a phone's own sunset switch, say); and
// switching this device between frame and remote changes whose theme it
// wears.
if (typeof window !== "undefined") {
  setInterval(() => update(), 60_000);
  window.matchMedia?.(DARK_QUERY).addEventListener?.("change", () => update());
  subscribeDeviceMode(() => update());
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
