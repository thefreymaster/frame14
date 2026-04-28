import { useEffect, useState } from "react";
import {
  applyThemeVars,
  computeEffectiveMode,
  getThemePreference,
  setThemePreference,
  subscribeThemePreference,
  type EffectiveThemeMode,
  type ThemeModePreference,
} from "../lib/themeMode";

export function useThemeMode() {
  const [preference, setPref] = useState<ThemeModePreference>(() =>
    getThemePreference(),
  );
  const [effectiveMode, setEffectiveMode] = useState<EffectiveThemeMode>(() =>
    computeEffectiveMode(preference),
  );

  useEffect(() => {
    return subscribeThemePreference((next) => {
      setPref(next);
      setEffectiveMode(computeEffectiveMode(next));
    });
  }, []);

  // Re-evaluate once a minute while in auto mode so the UI flips at the
  // daylight boundary without a refresh.
  useEffect(() => {
    if (preference !== "auto") return;
    const tick = () => {
      const next = computeEffectiveMode("auto");
      setEffectiveMode((prev) => {
        if (prev !== next) applyThemeVars(next);
        return next;
      });
    };
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [preference]);

  return {
    preference,
    effectiveMode,
    setPreference: setThemePreference,
  };
}
