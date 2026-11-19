import type { HomeEnergy } from "../hooks/useHomeData";

/** Net grid power counts only above this deadband, in watts. */
export const GRID_ACTIVE_THRESHOLD = 5;

/**
 * The energy marks' colours, one per flow, the same in both modes: solar
 * yellow, sent to the grid green, taken from it orange, the house's own use
 * the muted ink. Yellow is the lightest, so it is always labelled in text too.
 * And the grid itself blue (0.176.0, the user, of the flow's last node: "Make
 * the far right grid bolt and circle be blue"): the meter is neither what is
 * sent nor what is taken, which stay the wires' and the tags' colours. The
 * 500 step: the dataviz validator has it clear of the other three and 3:1
 * off the cards by day and by night, as it has the 600 — which, as a thin
 * glyph on a dark card (the grid's icon is a pylon, lib/energyIcons), was
 * the hardest of the flow's marks to make out.
 */
export const ENERGY_COLORS = {
  solar: "yellow.500",
  export: "green.600",
  import: "orange.600",
  home: "fg.muted",
  grid: "blue.500",
} as const;

/**
 * The sparks round the grid's icon (GridSparks): the grid's blue at the step
 * that stands out from the node's blue-tinted disc — lighter than the icon
 * by night, darker by day.
 */
export const GRID_SPARK_COLOR = { base: "blue.700", _dark: "blue.300" } as const;

/** The same colours as CSS variables, for SVG paints. */
export const ENERGY_VARS = {
  solar: "var(--chakra-colors-yellow-500)",
  export: "var(--chakra-colors-green-600)",
  import: "var(--chakra-colors-orange-600)",
  home: "var(--chakra-colors-fg-muted)",
  grid: "var(--chakra-colors-blue-500)",
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

/**
 * The colour of the day's coverage: the solar's yellow until the panels have
 * made the whole of the day's use, green from there — the card's big figure
 * turns green at the same moment, and the house in the flow wears it
 * (0.176.0, the user: "make the house icon yellow when below 100% and green
 * when over 100%").
 */
export function coverageColor(pct: number): "solar" | "export" {
  return pct >= 100 ? "export" : "solar";
}

/** The net grid flow now: how much, which way, and whether it counts. */
export function grid(energy: HomeEnergy) {
  const draw = energy.currentConsumption - energy.currentProduction;
  const abs = Math.abs(draw);
  return { abs, exporting: draw < 0, active: abs > GRID_ACTIVE_THRESHOLD };
}

/**
 * Seconds a trace on one of PowerFlow's wires takes to run a wave's length
 * at the base pace, which is the pace at 1 kW (and was every wire's pace
 * until 0.87). As fast across the wire as the waves themselves travelled
 * until they stood still, and the dots before them in 0.173.0: a wave is
 * 2.5rem long, and the dots ran 1.25rem a second.
 */
export const FLOW_BASE_SECONDS = 2;

/** The slowest anything flows: a crawl, a quarter of the base pace, at 62 W and under. */
const FLOW_PACE_MIN = 0.25;

/** The fastest a circuit's bar flows: three times the base pace, at 9 kW and over. */
const FLOW_PACE_MAX = 3;

/** The fastest a wire's waves run: eight times the base pace, at 8 kW and over. */
const WIRE_PACE_MAX = 8;

const kilowatts = (watts: number) =>
  Number.isFinite(watts) ? Math.max(0, watts) / 1000 : 0;

/**
 * How fast a wire's waves run for the power on it (PowerFlow), as a multiple
 * of the base pace. **In proportion to the power from 1 kW up** — 2 kW twice
 * the base pace, 5.7 kW 5.7 times — so the line with more on it is plainly
 * the faster (0.173.1, the user: "Make the speeds faster fir the lines for
 * higher wattage"; it was the root of the kilowatts all the way, flowPace
 * below, which had 5.7 kW only half as fast again as 2.5). Under 1 kW it is
 * still the root, which keeps a few hundred watts moving where a pace in
 * proportion would stand still. Held between FLOW_PACE_MIN and WIRE_PACE_MAX,
 * and rounded so a reading a watt off doesn't touch the animation's rate.
 */
export function wirePace(watts: number): number {
  const kw = kilowatts(watts);
  const pace = Math.min(WIRE_PACE_MAX, Math.max(FLOW_PACE_MIN, kw < 1 ? Math.sqrt(kw) : kw));
  return Math.round(pace * 100) / 100;
}

/**
 * How fast a circuit's bar flows for its draw (CircuitBar), as a multiple of
 * the base pace: the square root of the kilowatts, so 1 kW is the base pace,
 * 4 kW twice it and 250 W half. A pace in proportion to the watts would stand
 * still under a few hundred watts and blur over a few thousand; the root
 * keeps both ends readable. Held between FLOW_PACE_MIN and FLOW_PACE_MAX,
 * and rounded so a reading a watt off doesn't reset the animation's rate.
 * PowerFlow's wires went by it too until 0.173.1 (wirePace); its nodes'
 * effects still do — the light on the panels and the grid's sparks, where
 * the wires' pace, eight times the base at 8 kW, would be a flicker.
 */
export function flowPace(watts: number): number {
  const kw = kilowatts(watts);
  const pace = Math.min(FLOW_PACE_MAX, Math.max(FLOW_PACE_MIN, Math.sqrt(kw)));
  return Math.round(pace * 100) / 100;
}
