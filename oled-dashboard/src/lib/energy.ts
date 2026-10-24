import type { HomeEnergy } from "../hooks/useHomeData";

/** Net grid power counts only above this deadband, in watts. */
export const GRID_ACTIVE_THRESHOLD = 5;

/**
 * The energy marks' colours, one per flow, the same in both modes: solar
 * yellow, sent to the grid green, taken from it orange, the house's own use
 * the muted ink. Yellow is the lightest, so it is always labelled in text too.
 */
export const ENERGY_COLORS = {
  solar: "yellow.500",
  export: "green.600",
  import: "orange.600",
  home: "fg.muted",
} as const;

/** The same colours as CSS variables, for SVG paints. */
export const ENERGY_VARS = {
  solar: "var(--chakra-colors-yellow-500)",
  export: "var(--chakra-colors-green-600)",
  import: "var(--chakra-colors-orange-600)",
  home: "var(--chakra-colors-fg-muted)",
} as const;

export function fmtKwh(n: number) {
  return isNaN(n) ? "--" : n.toFixed(0);
}

export function fmtW(watts: number): string {
  if (isNaN(watts)) return "--";
  return `${(watts / 1000).toFixed(1)} kW`;
}

/** Today's production as a share of today's use, in percent. */
export function coverage(energy: HomeEnergy) {
  const { productionToday, consumptionToday } = energy;
  return consumptionToday > 0 ? (productionToday / consumptionToday) * 100 : 0;
}

/** The net grid flow now: how much, which way, and whether it counts. */
export function grid(energy: HomeEnergy) {
  const draw = energy.currentConsumption - energy.currentProduction;
  const abs = Math.abs(draw);
  return { abs, exporting: draw < 0, active: abs > GRID_ACTIVE_THRESHOLD };
}
