import { useState } from "react";
import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { ENERGY_VARS, fmtKwh } from "../lib/energy";
import {
  curveMax,
  curvePath,
  curveWash,
  type PowerPoint,
} from "../lib/powerCurve";
import { PowerDot } from "./PowerDot";
import { PowerKey } from "./PowerKey";

/** The plot's own units: the period across, the kWh scale up. */
const VIEW_W = 1000;
const VIEW_H = 100;

export interface HistoryPoint {
  /** The readout's name for the slot: "Oct 12", "March". */
  label: string;
  /** kWh, or null for a slot with no data yet (a day still to come). */
  production: number | null;
  consumption: number | null;
  /** The slot's mean temperature, read out beside its name when present. */
  temperature?: number | null;
}

/** A gridline step of 1, 2 or 5 × 10ⁿ that leaves two to four lines. */
function niceStep(max: number): number {
  const raw = Math.max(max, 1) / 3;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const m = raw / pow;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * pow;
}

/**
 * A month of days or a year of months in the energy card's style: solar as a
 * yellow line over its wash, the house's use as a muted line, on one kWh
 * scale with gridlines, the first slot at the left edge and the last at the
 * right, so the lines end where the period has got to, with a dot on each.
 * It fills the height it is given.
 *
 * The legend above is the readout, as in the today chart: idle, the keys
 * carry the period's totals and the right-hand note; point at, drag across
 * or arrow through the plot and they show that slot's values with its name
 * (and temperature). `lead` sits at the start of the legend row, for the
 * coverage figure.
 */
export function EnergyHistoryChart({
  points,
  ticks,
  totals,
  note,
  lead,
  ring = "bg.panel",
  label,
}: {
  points: HistoryPoint[];
  /** Which slots are named under the plot. */
  ticks: { index: number; label: string }[];
  /** The period's totals, kWh: the keys' idle figures. */
  totals: { production: number; consumption: number };
  /** Idle text at the legend's right, e.g. the best day. */
  note?: string | null;
  lead?: React.ReactNode;
  /** The surface the dots sit on, for their ring. */
  ring?: string;
  /** What the plot is, for assistive technology: "October 2026, daily". */
  label: string;
}) {
  const [active, setActive] = useState<number | null>(null);

  const n = Math.max(points.length, 2);
  const curve: PowerPoint[] = points.map((p, i) => ({
    t: i,
    production: p.production,
    consumption: p.consumption,
  }));
  // The last slot with anything on it: where the lines end and the dots sit.
  let last = -1;
  points.forEach((p, i) => {
    if (p.production != null || p.consumption != null) last = i;
  });

  const max = curveMax(curve, 1);
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const gridKwh = Array.from({ length: top / step }, (_, i) => (i + 1) * step);

  const xOf = (i: number) => (i / (n - 1)) * VIEW_W;
  const yOf = (v: number) => VIEW_H - (v / top) * VIEW_H;
  const pct = (i: number) => `${(i / (n - 1)) * 100}%`;
  const pctY = (v: number) => `${(1 - v / top) * 100}%`;

  const solarLine = curvePath(curve, "production", xOf, yOf);

  const shown = active != null ? points[active] : null;
  const marker = last >= 0 ? points[last] : null;
  const markerIndex = active ?? last;

  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    if (last < 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (n - 1));
    setActive(Math.min(last, Math.max(0, i)));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    if (last < 0) return;
    const from = active ?? last;
    const by = e.key === "ArrowLeft" ? -1 : 1;
    setActive(Math.min(last, Math.max(0, from + by)));
  };

  const reading = (v: number | null | undefined) =>
    shown ? (v != null ? `${fmtKwh(v)} kWh` : null) : undefined;
  const kwh = (v: number) => `${fmtKwh(v)} kWh`;

  const shownNote = shown
    ? shown.temperature != null
      ? `${shown.label} · ${Math.round(shown.temperature)}°F`
      : shown.label
    : note;

  return (
    <Stack gap="0" height="100%" minH="0">
      <HStack
        align="end"
        gap="4"
        rowGap="2"
        mb="5"
        wrap="wrap"
        flexShrink={0}
      >
        {lead}
        <HStack
          flex="1"
          minW="0"
          justify="space-between"
          align="baseline"
          gap="3"
          rowGap="1"
          wrap="wrap"
          textStyle="sm"
          minH="6"
        >
          <HStack gap="4" wrap="wrap" rowGap="1">
            <PowerKey
              color="solar"
              label="Solar"
              value={shown ? reading(shown.production) : kwh(totals.production)}
            />
            <PowerKey
              color="home"
              label="Home"
              value={shown ? reading(shown.consumption) : kwh(totals.consumption)}
            />
          </HStack>
          <Text color="fg.muted" whiteSpace="nowrap">
            {shownNote}
          </Text>
        </HStack>
      </HStack>

      <Box
        position="relative"
        flex="1"
        minH="8rem"
        tabIndex={0}
        role="img"
        aria-label={`${label}. Solar ${kwh(totals.production)}, home ${kwh(totals.consumption)}.`}
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
        {gridKwh.map((v) => (
          <Box
            key={v}
            position="absolute"
            insetX="0"
            top={pctY(v)}
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
              {v.toLocaleString()} kWh
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
            d={curvePath(curve, "consumption", xOf, yOf)}
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

        {/* The hairline at the slot being read. */}
        {active != null && (
          <Box
            position="absolute"
            top="0"
            bottom="0"
            left={pct(active)}
            borderLeftWidth="1px"
            borderColor="fg.subtle"
            pointerEvents="none"
          />
        )}
        {marker && (shown ?? marker).consumption != null && (
          <PowerDot
            left={pct(markerIndex)}
            top={pctY((shown ?? marker).consumption!)}
            color="home"
            ring={ring}
          />
        )}
        {marker && (shown ?? marker).production != null && (
          <PowerDot
            left={pct(markerIndex)}
            top={pctY((shown ?? marker).production!)}
            color="solar"
            ring={ring}
          />
        )}
      </Box>

      {/* The slots named under the plot. */}
      <Box position="relative" height="5" mt="1.5" flexShrink={0} aria-hidden>
        {ticks.map((t, i) => (
          <Text
            key={t.index}
            position="absolute"
            left={pct(t.index)}
            // Centred on its slot, but the first starts at the left edge and
            // the last ends at the right.
            transform={
              i === 0
                ? undefined
                : t.index === n - 1
                  ? "translateX(-100%)"
                  : "translateX(-50%)"
            }
            textStyle="xs"
            color="fg.muted"
            whiteSpace="nowrap"
          >
            {t.label}
          </Text>
        ))}
      </Box>
    </Stack>
  );
}
