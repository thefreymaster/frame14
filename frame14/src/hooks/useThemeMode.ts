import { useSyncExternalStore } from "react";
import {
  getTheme,
  setLocalThemePalette,
  setLocalThemePreference,
  setThemePalette,
  setThemePreference,
  subscribeTheme,
} from "../lib/themeMode";

/**
 * The themes lib/themeMode keeps: the frames' (`frames`, synced; the Display
 * tab's) and this device's own (`local`; the Device tab's, worn while it is a
 * remote — `own`), and the worn one's palette and mode now, re-read with the
 * clock for Auto and the system's setting for Device.
 */
export function useThemeMode() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme);
  return {
    ...theme,
    setFramesPreference: setThemePreference,
    setFramesPalette: setThemePalette,
    setLocalPreference: setLocalThemePreference,
    setLocalPalette: setLocalThemePalette,
  };
}
