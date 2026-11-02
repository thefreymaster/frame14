import { Box } from "@chakra-ui/react";
import type { EnergyTodayPoint } from "../hooks/useEnergyToday";
import { useNow } from "../hooks/useNow";
import { ENERGY_VARS } from "../lib/energy";
import {
  curveMax,
  curvePath,
  curvePoints,
  curveWash,
  type PowerPoint,
} from "../lib/powerCurve";
import { PowerDot } from "./PowerDot";

/** The plot's own units: a day across, the day's top up. */
const VIEW_W = 1000;
const VIEW_H = 100;

/** Room above the highest value, so its dot isn't cut by the plot's top. */
const HEADROOM = 1.12;

/**
 * Today's power at a glance, for the energy card: the same two lines as
 * TodayPowerChart — solar over its wash, the house's use in the muted ink —
 * midnight to midnight on a short strip, ending at the values now with a dot
 * on each. No scale, readout or hours: the card's figures say what the day
 * came to, and a tap opens the dialog's full chart. The SVG is stretched to
 * the strip (non-scaling strokes); the dots are HTML over it.
 */
export function TodaySparkline({
  points: raw,
  start,
  end,
  live,
  height,
}: {
  points: EnergyTodayPoint[];
  /** Local midnight today and tomorrow, ms. */
  start: number;
  end: number;
  /** The values now, W, which the lines end at. */
  live: { production: number; consumption: number };
  height: string | Record<string, string>;
}) {
  const now: PowerPoint = { t: useNow(60 * 1000), ...live };
  const points = curvePoints(raw, now);
  const top = curveMax(points) * HEADROOM;

  const xOf = (t: number) => ((t - start) / (end - start)) * VIEW_W;
  const yOf = (w: number) => VIEW_H - (w / top) * VIEW_H;
  const pct = (t: number) => `${((t - start) / (end - start)) * 100}%`;
  const pctY = (w: number) => `${(1 - w / top) * 100}%`;

  const solarLine = curvePath(points, "production", xOf, yOf);

  return (
    <Box
      position="relative"
      height={height}
      borderBottomWidth="1px"
      borderColor="border"
      aria-hidden
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
      >
        <path
          d={curveWash(solarLine, VIEW_H)}
          fill={ENERGY_VARS.solar}
          fillOpacity={0.12}
        />
        <path
          d={curvePath(points, "consumption", xOf, yOf)}
          fill="none"
          stroke={ENERGY_VARS.home}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={solarLine}
          fill="none"
          stroke={ENERGY_VARS.solar}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <PowerDot
        left={pct(now.t)}
        top={pctY(live.consumption)}
        color="home"
        ring="bg.surface"
      />
      <PowerDot
        left={pct(now.t)}
        top={pctY(live.production)}
        color="solar"
        ring="bg.surface"
      />
    </Box>
  );
}
