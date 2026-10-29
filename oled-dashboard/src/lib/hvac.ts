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

/** Home Assistant's hvac_action values that mean the unit is running now. */
const RUNNING_ACTION: Record<string, { mode: ClimateVisualMode; label: string }> =
  {
    heating: { mode: "heat", label: "Heating" },
    cooling: { mode: "cool", label: "Cooling" },
  };

export interface ClimateStatus {
  /** The mode set on the unit. */
  mode: ClimateVisualMode;
  /** What to draw it as: the action running now, else the mode. */
  shown: ClimateVisualMode;
  /** Drawn as on: anything but off. */
  on: boolean;
  /** Heating or cooling right now. */
  running: boolean;
  /** The target, rounded, when the mode has one (heat or cool). */
  target: number | null;
  /** "Heating to 70°" running, "Heat · set 70°" idle, "Fan", "Off". */
  status: string;
  /** The status for a screen reader. */
  spoken: string;
}

/**
 * How a thermostat reads: shared by the Home card's tiles and /climate's
 * panels, so a unit says the same thing wherever it is shown.
 */
export function climateStatus(unit: HomeClimate): ClimateStatus {
  const mode = normalizeClimateMode(unit.hvacMode ?? unit.state);
  const running = unit.hvacAction ? RUNNING_ACTION[unit.hvacAction] : undefined;
  const shown = running?.mode ?? mode;
  const targetTemp = fmtClimateTemp(unit.targetTemp);
  const label =
    running?.label ?? HVAC_MODES.find((m) => m.key === mode)?.label ?? "Off";
  const target =
    (mode === "heat" || mode === "cool") && targetTemp != null
      ? targetTemp
      : null;
  return {
    mode,
    shown,
    on: shown !== "off",
    running: running != null,
    target,
    status:
      target == null
        ? label
        : running
          ? `${label} to ${target}°`
          : `${label} · set ${target}°`,
    spoken:
      target == null
        ? label
        : running
          ? `${label} to ${target}°`
          : `${label}, set to ${target}°`,
  };
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
// Widest a thermostat tile gets, in rem. The thermostat tiles are squares
// (0.119), so this is their height too: a row of four on a desktop stops here
// rather than filling the card with squares the size of the card's height.
const TILE_MAX_REM = 12;

/**
 * Columns for `count` thermostats at least `minRem` wide with `gapRem`
 * between them, chosen by the container's own width — the caller makes the
 * wrapper a size container. One column, then two, then one row for every
 * unit once they all fit; never a row of three with one left over. In rem so
 * the steps follow the root size. The gap itself is the caller's to set.
 * Each column is `minmax(0, maxTrack)`: `1fr` shares the width out, a length
 * caps a column at it and leaves the rest of the row empty.
 */
export function climateColumnsCss(
  count: number,
  minRem = TILE_MIN_REM,
  gapRem = TILE_GAP_REM,
  maxTrack = "1fr",
) {
  const atLeast = (n: number) =>
    `@container (min-width: ${n * minRem + (n - 1) * gapRem}rem)`;
  const columns = (n: number) => ({
    gridTemplateColumns: `repeat(${n}, minmax(0, ${maxTrack}))`,
  });
  const pair = Math.max(1, Math.min(2, count));
  const all = Math.max(1, count);
  return {
    ...columns(1),
    [atLeast(pair)]: columns(pair),
    [atLeast(all)]: columns(all),
  };
}

/**
 * The home card's tiles (and their skeletons): the fans', and the thermostats'
 * wide tiles on the frame (a desktop and a phone have the squares of
 * thermostatGridCss since 0.119). climateColumnsCss at the tiles' width and
 * gap, the columns sharing the width. Four units are 2x2 on the portrait
 * frame and on a phone, and one row in landscape; a very narrow card falls
 * back to a single column.
 */
export function climateGridCss(count: number) {
  return {
    gap: `${TILE_GAP_REM}rem`,
    ...climateColumnsCss(count),
  };
}

/**
 * The square thermostat tiles' grid (ClimateTiles and ClimateSkeleton on a
 * desktop and a phone, useSquareThermostats; the Home card and /climate):
 * climateGridCss's columns, each capped at TILE_MAX_REM, since the tiles are
 * squares (0.119) — as wide as the row allows up to that, and the row
 * left-aligned with the rest empty, rather than a desktop's four stretched to
 * 400px squares. On a phone two columns are under the cap, so the tiles fill
 * the card as before, now 2x2 squares.
 */
export function thermostatGridCss(count: number) {
  return {
    gap: `${TILE_GAP_REM}rem`,
    ...climateColumnsCss(
      count,
      TILE_MIN_REM,
      TILE_GAP_REM,
      `${TILE_MAX_REM}rem`,
    ),
  };
}
