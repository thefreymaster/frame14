import { useState } from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import type { EnergyTodayPoint } from "../hooks/useEnergyToday";
import { useNow } from "../hooks/useNow";
import { ENERGY_VARS, fmtKwh, fmtW } from "../lib/energy";
import {
  curveMax,
  curvePath,
  curvePeak,
  curvePoints,
  curveWash,
  type PowerPoint,
} from "../lib/powerCurve";
import { PowerDot } from "./PowerDot";
import { PowerKey } from "./PowerKey";

/** The plot's own units: a day across, a kilowatt scale up. */
const VIEW_W = 1000;
const VIEW_H = 100;

const timeLabel = (t: number) =>
  new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/**
 * Today's power, midnight to midnight: solar as a yellow line over a faint
 * wash, the house's use as a muted line, on one kW scale. It ends at the
 * values now (the statistics trail by up to a quarter hour), with a dot on
 * each line.
 *
 * The legend above doubles as the readout: point at, drag across or arrow
 * through the chart and it shows that quarter hour's time and values, with a
 * hairline at it; otherwise the legend names the lines and the day's solar
 * peak — or, with `totals`, carries the day's kWh on the keys, as the
 * history chart does. `lead` sits at the start of the legend row, for the
 * coverage figure. The lines are an SVG stretched to the box; the dots,
 * hairline and labels are HTML on top, so none of them stretch.
 */
export function TodayPowerChart({
  points: raw,
  start,
  end,
  live,
  totals,
  lead,
  ring,
}: {
  points: EnergyTodayPoint[];
  /** Local midnight today and tomorrow, ms. */
  start: number;
  end: number;
  /** The values now, W, which the lines end at. */
  live: { production: number; consumption: number };
  /** The day's totals, kWh: the keys' idle figures when given. */
  totals?: { production: number; consumption: number };
  lead?: React.ReactNode;
  /** The surface the dots sit on, for their ring. */
  ring?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  // When "now" is: the chart mounts as the dialog opens, then keeps time.
  const now: PowerPoint = { t: useNow(60 * 1000), ...live };
  const points = curvePoints(raw, now);

  const max = curveMax(points);
  // Whole kilowatts, in steps that leave two or three gridlines.
  const kwStep = max <= 2000 ? 1 : max <= 6000 ? 2 : max <= 12000 ? 4 : 5;
  const top = Math.ceil(max / 1000 / kwStep) * kwStep * 1000;
  const gridKw = Array.from(
    { length: top / 1000 / kwStep },
    (_, i) => (i + 1) * kwStep,
  );

  const xOf = (t: number) => ((t - start) / (end - start)) * VIEW_W;
  const yOf = (w: number) => VIEW_H - (w / top) * VIEW_H;
  const pct = (t: number) => `${((t - start) / (end - start)) * 100}%`;
  const pctY = (w: number) => `${(1 - w / top) * 100}%`;

  const solarLine = curvePath(points, "production", xOf, yOf);
  const peak = curvePeak(points);

  const shown = active != null ? points[active] : null;
  const marker = shown ?? now;

  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const t = start + ((e.clientX - r.left) / r.width) * (end - start);
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.t - t) < Math.abs(points[best].t - t)) best = i;
    });
    setActive(best);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const from = active ?? points.length - 1;
    const step = e.key === "ArrowLeft" ? -1 : 1;
    setActive(Math.min(points.length - 1, Math.max(0, from + step)));
  };

  const hours = [0, 6, 12, 18].map((h) => {
    const d = new Date(start);
    d.setHours(h);
    return d.getTime();
  });

  // While reading, each key shows its value ("—" for a gap); otherwise the
  // day's total, or the name alone without one.
  const reading = (v: number | null | undefined, total?: number) =>
    shown
      ? v != null
        ? fmtW(v)
        : null
      : total != null
        ? `${fmtKwh(total)} kWh`
        : undefined;

  return (
    <Box>
      <HStack align="end" gap="4" rowGap="2" mb="5" wrap="wrap">
        {lead}
        <HStack
          flex="1"
          minW="0"
          justify="space-between"
          align="baseline"
          gap="3"
          textStyle="sm"
          wrap="wrap"
          rowGap="1"
          minH="6"
        >
          <HStack gap="4" wrap="wrap" rowGap="1">
            <PowerKey
              color="solar"
              label="Solar"
              value={reading(shown?.production, totals?.production)}
            />
            <PowerKey
              color="home"
              label="Home"
              value={reading(shown?.consumption, totals?.consumption)}
            />
          </HStack>
          <Text color="fg.muted" whiteSpace="nowrap">
            {shown
              ? shown === now
                ? "Now"
                : timeLabel(shown.t)
              : peak && peak.production! > 0
                ? `Peak ${fmtW(peak.production!)} at ${timeLabel(peak.t)}`
                : null}
          </Text>
        </HStack>
      </HStack>

      <Box
        position="relative"
        height={{ base: "9rem", md: "11rem" }}
        tabIndex={0}
        role="img"
        aria-label={`Today's power. ${
          peak
            ? `Solar peaked at ${fmtW(peak.production!)} at ${timeLabel(peak.t)}. `
            : ""
        }Now solar ${fmtW(live.production)}, home ${fmtW(live.consumption)}.`}
        touchAction="pan-y"
        cursor="crosshair"
        onPointerDown={pick}
        onPointerMove={pick}
        onPointerLeave={() => setActive(null)}
        onPointerCancel={() => setActive(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
        rounded="xs"
        _focusVisible={{
          outline: "2px solid",
          outlineColor: "colorPalette.focusRing",
          outlineOffset: "4px",
        }}
      >
        {/* Gridlines, labelled at their left end. */}
        {gridKw.map((kw) => (
          <Box
            key={kw}
            position="absolute"
            insetX="0"
            top={pctY(kw * 1000)}
            borderTopWidth="1px"
            borderColor="border.muted"
          >
            <Text
              position="absolute"
              left="0"
              bottom="0.5"
              textStyle="xs"
              color="fg.subtle"
              lineHeight="1"
            >
              {kw} kW
            </Text>
          </Box>
        ))}
        <Box
          position="absolute"
          insetX="0"
          bottom="0"
          borderTopWidth="1px"
          borderColor="border"
        />

        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
          aria-hidden
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

        {/* The hairline at the point being read. */}
        {shown && (
          <Box
            position="absolute"
            top="0"
            bottom="0"
            left={pct(shown.t)}
            borderLeftWidth="1px"
            borderColor="fg.subtle"
            pointerEvents="none"
          />
        )}
        {marker.consumption != null && (
          <PowerDot
            left={pct(marker.t)}
            top={pctY(marker.consumption)}
            color="home"
            ring={ring}
          />
        )}
        {marker.production != null && (
          <PowerDot
            left={pct(marker.t)}
            top={pctY(marker.production)}
            color="solar"
            ring={ring}
          />
        )}
      </Box>

      {/* The hours under the plot. */}
      <Box position="relative" height="5" mt="1.5" aria-hidden>
        {hours.map((t, i) => (
          <Text
            key={t}
            position="absolute"
            left={pct(t)}
            // Centred on its hour, but the first starts at the left edge.
            transform={i > 0 ? "translateX(-50%)" : undefined}
            textStyle="xs"
            color="fg.muted"
            whiteSpace="nowrap"
          >
            {new Date(t).toLocaleTimeString([], { hour: "numeric" })}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
