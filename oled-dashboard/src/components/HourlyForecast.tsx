import { Box, Card, Grid, Text, VStack } from "@chakra-ui/react";
import type { HomeForecastPeriod } from "../hooks/useHomeData";
import { RAIN_SHOWN_FROM, roundTemp } from "../lib/forecast";
import { weatherIcon } from "../lib/weatherIcons";

function hourLabel(datetime: string, now: Date): string {
  const d = new Date(datetime);
  if (
    d.getHours() === now.getHours() &&
    d.toDateString() === now.toDateString()
  ) {
    return "Now";
  }
  return d.toLocaleTimeString([], { hour: "numeric" });
}

/**
 * The next hours as columns in a subtle `sm` well, like the calendar's rows:
 * the hour, the condition's icon, the rain chance (a row only when some hour
 * reaches RAIN_SHOWN_FROM) and the temperature. The desktop weather card's
 * and the forecast dialog's.
 */
export function HourlyForecast({ hours }: { hours: HomeForecastPeriod[] }) {
  const now = new Date();
  const hourRain = hours.some(
    (h) => (h.precipitationProbability ?? 0) >= RAIN_SHOWN_FROM,
  );

  return (
    <Card.Root size="sm" variant="subtle" borderRadius="sm">
      <Card.Body px="2" css={{ containerType: "inline-size" }}>
        {/* One column per hour shown: a narrow well (a ¼-width tile, a
            phone) drops the later hours rather than squeeze them. */}
        <Grid
          gridAutoFlow="column"
          gridAutoColumns="minmax(0, 1fr)"
          gap="1"
          css={{
            "@container (max-width: 34rem)": {
              "& > :nth-child(n + 7)": { display: "none" },
            },
            "@container (max-width: 24rem)": {
              "& > :nth-child(n + 5)": { display: "none" },
            },
          }}
        >
          {hours.map((h) => {
            const rain = h.precipitationProbability ?? 0;
            const label = hourLabel(h.datetime, now);
            return (
              <VStack key={h.datetime} gap="1" minW="0">
                <Text
                  textStyle="sm"
                  color={label === "Now" ? "fg" : "fg.muted"}
                  fontWeight={label === "Now" ? "medium" : undefined}
                  whiteSpace="nowrap"
                >
                  {label}
                </Text>
                <Box fontSize="2.75rem" lineHeight="1" aria-hidden>
                  {weatherIcon(h.condition ?? "", h.datetime)}
                </Box>
                {hourRain && (
                  <Text
                    textStyle="xs"
                    fontWeight="medium"
                    color="blue.fg"
                    visibility={rain >= RAIN_SHOWN_FROM ? undefined : "hidden"}
                  >
                    {rain}%
                  </Text>
                )}
                <Text textStyle="lg" fontWeight="medium">
                  {roundTemp(h.temperature)}°
                </Text>
              </VStack>
            );
          })}
        </Grid>
      </Card.Body>
    </Card.Root>
  );
}
