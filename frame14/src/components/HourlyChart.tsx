import { Box, HStack, Text } from "@chakra-ui/react";
import type { HomeForecastPeriod } from "../hooks/useHomeData";
import { RAIN_SHOWN_FROM, roundTemp } from "../lib/forecast";

/** The plot's own units: the hours across, the scale's span up. */
const VIEW_W = 1000;
const VIEW_H = 100;

/** A couple of degrees above and below the range, and never a span under this. */
const PAD = 2;
const MIN_SPAN = 10;

/** A certain rain reaches this far up the plot. */
const RAIN_MAX_SHARE = 0.5;
/** An hour mark every this many hours. */
const MARK_EVERY = 6;

const isNumber = (n: number | null | undefined): n is number => n != null;

/**
 * The hours ahead as a chart, in the energy card's style: the temperature as
 * a line from the first hour at the left edge to the last at the right, its
 * high and low labelled, with each hour's rain chance (from RAIN_SHOWN_FROM)
 * as a blue bar up from the baseline — a sure thing reaching halfway up. The
 * scale is the hours' range a couple of degrees either side. Hour marks every
 * six hours under it. Stretched SVG, non-scaling strokes; the labels are
 * HTML over it. The legend row carries the extremes; the plot is aria-hidden.
 */
export function HourlyChart({
  hours,
  height,
}: {
  hours: HomeForecastPeriod[];
  height: string | Record<string, string>;
}) {
  const temps = hours.map((h) => h.temperature);
  const known = temps.filter(isNumber);
  if (hours.length < 2 || known.length === 0) return null;

  let lo = Math.floor(Math.min(...known)) - PAD;
  let hi = Math.ceil(Math.max(...known)) + PAD;
  if (hi - lo < MIN_SPAN) {
    const mid = (hi + lo) / 2;
    lo = Math.floor(mid - MIN_SPAN / 2);
    hi = lo + MIN_SPAN;
  }

  const last = hours.length - 1;
  const xOf = (i: number) => (i / last) * VIEW_W;
  const yOf = (t: number) => VIEW_H - ((t - lo) / (hi - lo)) * VIEW_H;
  const pct = (i: number) => `${(i / last) * 100}%`;
  const pctY = (t: number) => `${(1 - (t - lo) / (hi - lo)) * 100}%`;
  // A label at the plot's edge would hang outside it.
  const pctClamped = (i: number) =>
    `${Math.min(94, Math.max(6, (i / last) * 100))}%`;

  let line = "";
  let pen = false;
  temps.forEach((t, i) => {
    if (!isNumber(t)) {
      pen = false;
      return;
    }
    line += `${pen ? "L" : "M"}${xOf(i).toFixed(1)},${yOf(t).toFixed(1)}`;
    pen = true;
  });

  let hiAt = -1;
  let loAt = -1;
  temps.forEach((t, i) => {
    if (!isNumber(t)) return;
    if (hiAt < 0 || t > temps[hiAt]!) hiAt = i;
    if (loAt < 0 || t < temps[loAt]!) loAt = i;
  });
  const hourOf = (i: number) =>
    new Date(hours[i].datetime).toLocaleTimeString([], { hour: "numeric" });

  const slot = VIEW_W / last;
  const bars = hours
    .map((h, i) => ({ i, rain: h.precipitationProbability ?? 0 }))
    .filter((b) => b.rain >= RAIN_SHOWN_FROM);
  const anyRain = bars.length > 0;

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
          {`Next ${hours.length} hours · high ${roundTemp(temps[hiAt])}° ${hourOf(hiAt)} · low ${roundTemp(temps[loAt])}° ${hourOf(loAt)}`}
        </Text>
        <HStack gap="3" aria-hidden>
          <HStack gap="1.5">
            <Box w="4" borderTopWidth="2px" borderColor="fg" />
            <Text>Temperature</Text>
          </HStack>
          {anyRain && (
            <HStack gap="1.5">
              <Box w="3" h="3" rounded="xs" bg="blue.solid" opacity={0.4} />
              <Text>Rain chance</Text>
            </HStack>
          )}
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
          {bars.map((b) => {
            const h = (b.rain / 100) * RAIN_MAX_SHARE * VIEW_H;
            return (
              <rect
                key={b.i}
                x={xOf(b.i) - slot * 0.3}
                y={VIEW_H - h}
                width={slot * 0.6}
                height={h}
                fill="var(--chakra-colors-blue-solid)"
                fillOpacity={0.3}
              />
            );
          })}
          <path
            d={line}
            fill="none"
            stroke="var(--chakra-colors-fg)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <Text
          position="absolute"
          left={pctClamped(hiAt)}
          top={pctY(temps[hiAt]!)}
          transform="translate(-50%, -135%)"
          textStyle="xs"
          fontWeight="medium"
          whiteSpace="nowrap"
        >
          {roundTemp(temps[hiAt])}°
        </Text>
        {loAt !== hiAt && (
          <Text
            position="absolute"
            left={pctClamped(loAt)}
            top={pctY(temps[loAt]!)}
            transform="translate(-50%, 35%)"
            textStyle="xs"
            color="fg.muted"
            whiteSpace="nowrap"
          >
            {roundTemp(temps[loAt])}°
          </Text>
        )}
        {/* The dot at the first hour: the forecast starts here, now. */}
        {isNumber(temps[0]) && (
          <Box
            position="absolute"
            left={pct(0)}
            top={pctY(temps[0])}
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
        {hours.map((h, i) =>
          i % MARK_EVERY === 0 && i < last ? (
            <Text
              key={h.datetime}
              position="absolute"
              left={pct(i)}
              top="1"
              transform={i === 0 ? undefined : "translateX(-50%)"}
              textStyle="2xs"
              color="fg.subtle"
              whiteSpace="nowrap"
            >
              {i === 0 ? "Now" : hourOf(i)}
            </Text>
          ) : null,
        )}
      </Box>
    </Box>
  );
}
