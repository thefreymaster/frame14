import { Fragment } from "react";
import { Box, Card, Grid, Text } from "@chakra-ui/react";
import type { HomeForecastPeriod } from "../hooks/useHomeData";
import { RAIN_SHOWN_FROM, roundTemp } from "../lib/forecast";
import { weatherIcon } from "../lib/weatherIcons";

const isNumber = (n: number | null): n is number => n != null;

function dayLabel(datetime: string, now: Date): string {
  const d = new Date(datetime);
  if (d.toDateString() === now.toDateString()) return "Today";
  return d.toLocaleDateString([], { weekday: "short" });
}

/**
 * Midday of the period's day, for its icon: WeatherKit stamps a day at local
 * midnight, which would get the night icon.
 */
function middayOf(datetime: string): string {
  const d = new Date(datetime);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

/**
 * The days ahead as rows in a subtle `sm` well, like a phone's weather app:
 * the day, its icon, the rain chance (a column only when some day reaches
 * RAIN_SHOWN_FROM), the low, a bar from the low to the high and the high.
 * Every bar is on one scale, the coldest low to the warmest high, and so is
 * its blue-to-orange fill; today's carries a dot at the temperature now. The
 * forecast dialog's and /weather's; with `fill` (the desktop weather page,
 * where the card is stretched to the column beside it) the well takes the
 * card's height and spreads its rows over it.
 */
export function DailyForecast({
  days,
  current,
  fill = false,
}: {
  days: HomeForecastPeriod[];
  /** The temperature now, for today's dot. */
  current: number | null;
  fill?: boolean;
}) {
  const now = new Date();
  const temps = [
    ...days.flatMap((d) => [d.templow, d.temperature]),
    current,
  ].filter(isNumber);
  const min = Math.min(...temps);
  const span = Math.max(...temps) - min || 1;
  const at = (t: number) => (t - min) / span;
  const dayRain = days.some(
    (d) => (d.precipitationProbability ?? 0) >= RAIN_SHOWN_FROM,
  );

  return (
    <Card.Root
      size="sm"
      variant="subtle"
      borderRadius="sm"
      flex={fill ? "1" : undefined}
    >
      <Card.Body>
        {/* One grid for every row, so the columns line up down the list. */}
        <Grid
          templateColumns={`auto auto ${dayRain ? "auto " : ""}auto minmax(3rem, 1fr) auto`}
          columnGap="3"
          rowGap="2"
          alignItems="center"
          flex={fill ? "1" : undefined}
          alignContent={fill ? "space-between" : undefined}
        >
          {days.map((day) => {
            const label = dayLabel(day.datetime, now);
            const today = label === "Today";
            const rain = day.precipitationProbability ?? 0;
            const high = day.temperature;
            const low = day.templow ?? high;
            return (
              <Fragment key={day.datetime}>
                <Text
                  textStyle="lg"
                  fontWeight={today ? "semibold" : "medium"}
                  whiteSpace="nowrap"
                >
                  {label}
                </Text>
                <Box fontSize="2rem" lineHeight="1" aria-hidden>
                  {weatherIcon(day.condition ?? "", middayOf(day.datetime))}
                </Box>
                {dayRain && (
                  <Text
                    textStyle="sm"
                    fontWeight="medium"
                    color="blue.fg"
                    textAlign="end"
                    visibility={rain >= RAIN_SHOWN_FROM ? undefined : "hidden"}
                  >
                    {rain}%
                  </Text>
                )}
                <Text textStyle="lg" color="fg.muted" textAlign="end">
                  {low != null ? `${roundTemp(low)}°` : "—"}
                </Text>
                <TempRange
                  from={low != null ? at(low) : null}
                  to={high != null ? at(high) : null}
                  dot={today && current != null ? at(current) : null}
                />
                <Text textStyle="lg" fontWeight="medium" textAlign="end">
                  {high != null ? `${roundTemp(high)}°` : "—"}
                </Text>
              </Fragment>
            );
          })}
        </Grid>
      </Card.Body>
    </Card.Root>
  );
}

/**
 * A day's low-to-high bar on the list's scale (0 to 1). The fill's gradient
 * is sized and placed as if it spanned the whole track, so a cold day reads
 * bluer than a warm one rather than every bar running blue to orange.
 */
function TempRange({
  from,
  to,
  dot,
}: {
  from: number | null;
  to: number | null;
  dot: number | null;
}) {
  const start = from ?? to;
  const width = start != null && to != null ? Math.max(0, to - start) : 0;
  return (
    <Box position="relative" height="1.5" rounded="full" bg="bg.emphasized">
      {start != null && (
        <Box
          position="absolute"
          insetY="0"
          left={`${start * 100}%`}
          width={`${width * 100}%`}
          minW="1.5"
          rounded="full"
          backgroundImage="linear-gradient(to right, var(--chakra-colors-blue-solid), var(--chakra-colors-orange-solid))"
          backgroundSize={width > 0 ? `${100 / width}% 100%` : "100% 100%"}
          backgroundPosition={
            width < 1 ? `${(start / (1 - width)) * 100}% 0` : "0 0"
          }
        />
      )}
      {dot != null && (
        <Box
          position="absolute"
          top="50%"
          left={`${dot * 100}%`}
          transform="translate(-50%, -50%)"
          boxSize="3"
          rounded="full"
          bg="fg"
          borderWidth="2px"
          borderColor="bg.muted"
        />
      )}
    </Box>
  );
}
