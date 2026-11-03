import { useSyncExternalStore } from "react";
import {
  getTheme,
  setThemePalette,
  setThemePreference,
  subscribeTheme,
} from "../lib/themeMode";

/**
 * The theme preference (Auto / Device / Bright / Dark), the palette, and the
 * mode they give now — lib/themeMode keeps it, re-reading the clock for Auto
 * and the system's setting for Device.
 */
export function useThemeMode() {
  const { preference, palette, effectiveMode } = useSyncExternalStore(
    subscribeTheme,
    getTheme,
  );
  return {
    preference,
    palette,
    effectiveMode,
    setPreference: setThemePreference,
    setPalette: setThemePalette,
  };
}
