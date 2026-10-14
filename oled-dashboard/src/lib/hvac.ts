import { IoFlame, IoPowerOutline, IoSnow } from "react-icons/io5";
import { MdAir } from "react-icons/md";
import type { HomeClimate } from "../hooks/useHomeData";

/** The thermostat model shared by the climate card and its modal. */
export type ClimateVisualMode = "heat" | "cool" | "fan_only" | "off";

// Each hvac key maps to one of Chakra's colour palettes. `accent` and `ring`
// are CSS colours for the hand-drawn dial (its SVG strokes), taken from the
// palette's semantic `solid` token; `palette` feeds library parts
// (colorPalette on the slider).
const HVAC_PALETTE: Record<string, string> = {
  cool: "blue",
  cooling: "blue",
  heat: "orange",
  heating: "orange",
  fan_only: "teal",
  fan: "teal",
  auto: "green",
};

const LIVE_HVAC_KEYS = new Set(["heating", "cooling", "fan"]);

export type HvacPalette = { accent: string; ring: string; palette: string };

/** Accent + ring colours (CSS) and the Chakra palette for an hvac key. */
export function hvacPalette(key: string): HvacPalette {
  const palette = HVAC_PALETTE[key];
  if (!palette) {
    return {
      accent: "var(--chakra-colors-fg-muted)",
      ring: "var(--chakra-colors-border-emphasized)",
      palette: "gray",
    };
  }
  const accent = `var(--chakra-colors-${palette}-solid)`;
  const ring = LIVE_HVAC_KEYS.has(key)
    ? accent
    : `color-mix(in srgb, ${accent} 70%, transparent)`;
  return { accent, ring, palette };
}

const ACTIVE_HVAC_ACTION: Record<string, ClimateVisualMode> = {
  heating: "heat",
  cooling: "cool",
  fan: "fan_only",
};

export const HVAC_MODES: { key: ClimateVisualMode; label: string }[] = [
  { key: "heat", label: "Heat" },
  { key: "cool", label: "Cool" },
  { key: "fan_only", label: "Fan" },
  { key: "off", label: "Off" },
];

export function normalizeClimateMode(
  mode: string | null | undefined,
): ClimateVisualMode {
  if (mode === "heat" || mode === "cool" || mode === "fan_only") return mode;
  return "off";
}

export function fmtClimateTemp(temp: number | null | undefined) {
  return temp == null ? null : Math.round(temp);
}

export function getClimateAction(
  mode: ClimateVisualMode,
  unit: HomeClimate,
  targetTemp: number,
): ClimateVisualMode | null {
  const liveAction = unit.hvacAction
    ? ACTIVE_HVAC_ACTION[unit.hvacAction.toLowerCase()]
    : null;
  if (liveAction) return liveAction;
  if (mode === "off") return null;
  if (mode === "fan_only") return "fan_only";

  const currentTemp = fmtClimateTemp(unit.currentTemp);
  if (currentTemp == null) return null;
  if (mode === "heat" && currentTemp <= targetTemp - 1) return "heat";
  if (mode === "cool" && currentTemp >= targetTemp + 1) return "cool";
  return null;
}

export const MODE_ICON: Record<ClimateVisualMode, typeof IoFlame> = {
  heat: IoFlame,
  cool: IoSnow,
  fan_only: MdAir,
  off: IoPowerOutline,
};

/**
 * Card width at which every thermostat fits on one row. Below it the dials
 * wrap — four units read as 2x2 on the frame and on a phone.
 */
export const SINGLE_ROW_MIN_PX = 900;
