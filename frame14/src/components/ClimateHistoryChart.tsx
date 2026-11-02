import { Box, HStack, Text } from "@chakra-ui/react";
import type { ClimateHistoryPoint } from "../hooks/useClimateHistory";
import { useNow } from "../hooks/useNow";
import { hvacPalette } from "../lib/hvac";

/** The plot's own units: a day across, the scale's span up. */
const VIEW_W = 1000;
const VIEW_H = 100;

const QUARTER_HOUR_MS = 15 * 60e3;

/** A degree above and below the day's range, and never a span under this. */
const PAD = 1;
const MIN_SPAN = 6;

/** The hour marks under the strip, as a share of the day. */
const HOURS = [
  { at: 0.25, label: "6 AM" },
  { at: 0.5, label: "Noon" },
  { at: 0.75, label: "6 PM" },
];

type Action = ClimateHistoryPoint["action"];

interface Sample {
  t: number;
  temp: number | null;
  target: number | null;
}

interface Band {
  from: number;
  to: number;
  action: "heating" | "cooling";
}

/**
 * Today's room temperature on a strip, midnight to midnight, in the energy
 * card's style: the room as a line ending at the reading now with a dot on
 * it, the target as a dashed step behind it, and the quarter hours the unit
 * ran tinted in that mode's colour (orange heating, blue cooling). The scale
 * is the day's range, a degree either side. The SVG is stretched to the strip
 * (non-scaling strokes); the dot and the hour marks are HTML over and under
 * it. The legend row carries the day's low and high; the plot is aria-hidden.
 */
export function ClimateHistoryChart({
  points: raw,
  start,
  end,
  live,
  height,
}: {
  points: ClimateHistoryPoint[];
  /** Local midnight today and tomorrow, ms. */
  start: number;
  end: number;
  /** The readings now, which the lines end at. */
  live: { temp: number | null; target: number | null; action: Action };
  height: string | Record<string, string>;
}) {
  const now = useNow(60 * 1000);
  const samples: Sample[] = [
    ...raw
      .map((p) => ({ t: Date.parse(p.time), temp: p.temp, target: p.target }))
      .filter((p) => p.t < now),
    { t: now, temp: live.temp, target: live.target },
  ];

  const roomTemps = samples
    .map((s) => s.temp)
    .filter((v): v is number => v != null);
  const scaled = samples
    .flatMap((s) => [s.temp, s.target])
    .filter((v): v is number => v != null);
  let lo = scaled.length ? Math.floor(Math.min(...scaled)) - PAD : 0;
  let hi = scaled.length ? Math.ceil(Math.max(...scaled)) + PAD : MIN_SPAN;
  if (hi - lo < MIN_SPAN) {
    const mid = (hi + lo) / 2;
    lo = Math.floor(mid - MIN_SPAN / 2);
    hi = lo + MIN_SPAN;
  }

  const xOf = (t: number) => ((t - start) / (end - start)) * VIEW_W;
  const yOf = (v: number) => VIEW_H - ((v - lo) / (hi - lo)) * VIEW_H;
  const pct = (t: number) => `${((t - start) / (end - start)) * 100}%`;
  const pctY = (v: number) => `${(1 - (v - lo) / (hi - lo)) * 100}%`;

  // The room line; the pen lifts over a quarter hour with no reading.
  let room = "";
  let pen = false;
  for (const s of samples) {
    if (s.temp == null) {
      pen = false;
      continue;
    }
    room += `${pen ? "L" : "M"}${xOf(s.t).toFixed(1)},${yOf(s.temp).toFixed(1)}`;
    pen = true;
  }

  // The target as steps: each quarter's target held until the next.
  let target = "";
  pen = false;
  for (const s of samples) {
    if (s.target == null) {
      pen = false;
      continue;
    }
    const x = xOf(s.t).toFixed(1);
    const y = yOf(s.target).toFixed(1);
    target += pen ? `H${x}L${x},${y}` : `M${x},${y}`;
    pen = true;
  }

  // The quarter hours it ran, neighbours of one kind merged into a band; the
  // quarter under way takes the action now.
  const bands: Band[] = [];
  const addBand = (from: number, to: number, action: Action) => {
    if (!action || to <= from) return;
    const last = bands[bands.length - 1];
    if (last && last.action === action && last.from <= from && from <= last.to)
      last.to = Math.max(last.to, to);
    else bands.push({ from, to, action });
  };
  for (const p of raw) {
    const t = Date.parse(p.time);
    addBand(t, Math.min(t + QUARTER_HOUR_MS, now), p.action);
  }
  const quarterNow = start + Math.floor((now - start) / QUARTER_HOUR_MS) * QUARTER_HOUR_MS;
  addBand(quarterNow, now, live.action);

  const low = roomTemps.length ? Math.round(Math.min(...roomTemps)) : null;
  const high = roomTemps.length ? Math.round(Math.max(...roomTemps)) : null;

  return (
    <Box>
      <HStack
        justify="space-between"
        gap="3"
        wrap="wrap"
        textStyle="xs"
        color="fg.muted"
        mb="2"
      >
        <Text>
          {low != null && high != null
            ? `Today · low ${low}° · high ${high}°`
            : "Today"}
        </Text>
        <HStack gap="3" aria-hidden>
          <HStack gap="1.5">
            <Box w="4" borderTopWidth="2px" borderColor="fg" />
            <Text>Room</Text>
          </HStack>
          <HStack gap="1.5">
            <Box
              w="4"
              borderTopWidth="2px"
              borderStyle="dashed"
              borderColor="fg.muted"
            />
            <Text>Target</Text>
          </HStack>
        </HStack>
      </HStack>

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
          {bands.map((band) => (
            <rect
              key={band.from}
              x={xOf(band.from)}
              y={0}
              width={xOf(band.to) - xOf(band.from)}
              height={VIEW_H}
              fill={hvacPalette(band.action).accent}
              fillOpacity={0.14}
            />
          ))}
          <path
            d={target}
            fill="none"
            stroke="var(--chakra-colors-fg-muted)"
            strokeWidth={1.5}
            strokeDasharray="6 6"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={room}
            fill="none"
            stroke="var(--chakra-colors-fg)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {live.temp != null && (
          <Box
            position="absolute"
            left={pct(now)}
            top={pctY(live.temp)}
            transform="translate(-50%, -50%)"
            boxSize="3"
            rounded="full"
            bg="fg"
            borderWidth="2px"
            borderColor="bg.surface"
            pointerEvents="none"
          />
        )}
      </Box>

      <Box position="relative" height="4" aria-hidden>
        {HOURS.map((hour) => (
          <Text
            key={hour.label}
            position="absolute"
            left={`${hour.at * 100}%`}
            top="1"
            transform="translateX(-50%)"
            textStyle="2xs"
            color="fg.subtle"
            whiteSpace="nowrap"
          >
            {hour.label}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
