import { IoFlame, IoPowerOutline, IoSnow } from "react-icons/io5";
import { MdAir } from "react-icons/md";
import type { HomeClimate } from "../hooks/useHomeData";

/** The thermostat model shared by the climate card and its modal. */
export type ClimateVisualMode = "heat" | "cool" | "fan_only" | "off";

// Each hvac key maps to one of Chakra's colour palettes. `accent` and `ring`
// are CSS colours for the dialog's hand-drawn dial (its SVG strokes), taken
// from the palette's semantic `solid` token; `palette` feeds library parts
// (colorPalette on the home card's badges and the slider).
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

const NOT_ON = new Set(["off", "unavailable", "unknown"]);

/**
 * Whether a thermostat is on in any mode. Wider than normalizeClimateMode: a
 * unit in auto or dry counts, though its tile draws it as off.
 */
export function isClimateOn(unit: HomeClimate): boolean {
  const mode = unit.hvacMode ?? unit.state;
  return mode != null && !NOT_ON.has(mode);
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

// Narrowest a home-card tile gets, and the grid gap between tiles, in rem.
const TILE_MIN_REM = 9;
const TILE_GAP_REM = 0.75;

/**
 * Columns for the home card's thermostat tiles (and their skeleton), chosen by
 * the card's own width — the caller makes the wrapper a size container. One
 * column, then two, then one row for every unit once they all fit; never a
 * row of three with one left over. In rem so the steps follow the root size:
 * four units are 2x2 on the portrait frame and on a phone, and one row in
 * landscape; a very narrow card falls back to a single column.
 */
export function climateGridCss(count: number) {
  const atLeast = (n: number) =>
    `@container (min-width: ${n * TILE_MIN_REM + (n - 1) * TILE_GAP_REM}rem)`;
  const columns = (n: number) => ({
    gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
  });
  const pair = Math.max(1, Math.min(2, count));
  const all = Math.max(1, count);
  return {
    gap: `${TILE_GAP_REM}rem`,
    ...columns(1),
    [atLeast(pair)]: columns(pair),
    [atLeast(all)]: columns(all),
  };
}
