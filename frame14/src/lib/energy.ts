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

/**
 * The energy card's strip of today's curve: short, so the card stays about
 * the size of its neighbours (its skeleton keeps the same height).
 */
export const SPARKLINE_HEIGHT = { base: "2.5rem", md: "3.5rem" };

export function fmtKwh(n: number) {
  return isNaN(n) ? "--" : n.toFixed(0);
}

export function fmtW(watts: number): string {
  if (isNaN(watts)) return "--";
  return `${(watts / 1000).toFixed(1)} kW`;
}

/**
 * Today's production as a share of today's use, in percent — past 100 on a
 * day the panels made more than the house used. The card's big figure, and
 * the home node's ring.
 */
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

/**
 * Seconds a dot on one of PowerFlow's wires takes to move one dot pitch at
 * the base pace, which is the pace at 1 kW (and was every wire's pace until
 * 0.87).
 */
export const FLOW_BASE_SECONDS = 0.6;

/** The slowest a wire runs: a crawl, a dot pitch in 2.4s, at 62 W and under. */
const FLOW_PACE_MIN = 0.25;

/** The fastest: a dot pitch in 0.2s, at 9 kW and over. */
const FLOW_PACE_MAX = 3;

/**
 * How fast a wire's dots run for the power on it, as a multiple of the base
 * pace: the square root of the kilowatts, so 1 kW is the base pace, 4 kW
 * twice it and 250 W half. A pace in proportion to the watts would stand
 * still under a few hundred watts and blur over a few thousand; the root
 * keeps both ends readable. Held between FLOW_PACE_MIN and FLOW_PACE_MAX,
 * and rounded so a reading a watt off doesn't reset the animation's rate.
 */
export function flowPace(watts: number): number {
  const kw = Number.isFinite(watts) ? Math.max(0, watts) / 1000 : 0;
  const pace = Math.min(FLOW_PACE_MAX, Math.max(FLOW_PACE_MIN, Math.sqrt(kw)));
  return Math.round(pace * 100) / 100;
}
