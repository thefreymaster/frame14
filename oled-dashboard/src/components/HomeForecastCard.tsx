import {
  Alert,
  Box,
  Card,
  Flex,
  Grid,
  HStack,
  Skeleton,
  Spacer,
  Text,
  VStack,
} from "@chakra-ui/react";
import NumberFlow from "@number-flow/react";
import { IoPartlySunnyOutline } from "react-icons/io5";
import type { HomeInternet, HomeWeather } from "../hooks/useHomeData";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { conditionLabel, weatherIcon } from "../lib/weatherIcons";

/** Rain chances below this aren't worth a mention. */
const RAIN_SHOWN_FROM = 20;

/**
 * A narrow card (a ¼-width tile): the figures shrink and the words wrap under
 * them. Applied from the card body's container, to the `data-*` parts.
 */
const NARROW_CSS = {
  containerType: "inline-size",
  "@container (max-width: 24rem)": {
    "& [data-hero-icon]": { fontSize: "4rem" },
    "& [data-hero-temp]": { fontSize: "5xl" },
    "& [data-hero-words]": { alignItems: "flex-start", textAlign: "start" },
  },
} as const;

const round = (n: number | null | undefined) =>
  n == null ? null : Math.round(n);

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
 * /home's first card on a desktop, in place of HomeHeader (the header has the
 * clock there): the weather now and the next 8 hours, from the WeatherKit
 * forecasts in useHomeData. Built from the board's own parts — a collapsible
 * Board with a SectionTitle, today's high and low as its summary, and a
 * subtle `sm` well like the calendar's rows. Same card id ("header"), so a
 * saved layout keeps its place.
 */
export function HomeForecastCard({
  internet: { connected = true },
  weather,
  loading = false,
}: {
  internet: HomeInternet;
  weather?: HomeWeather | null;
  loading?: boolean;
}) {
  const now = new Date();
  const hours = weather?.forecast ?? [];
  const today = weather?.forecastDaily?.[0];
  const current = round(weather?.temperature);
  const hourRain = hours.some(
    (h) => (h.precipitationProbability ?? 0) >= RAIN_SHOWN_FROM,
  );

  return (
    <Board
      collapsible
      storageKey="weather"
      title={
        <Flex align="center" gap="3" rowGap="1" wrap="wrap" width="100%">
          <SectionTitle icon={<IoPartlySunnyOutline />}>Weather</SectionTitle>
          {loading ? (
            <Skeleton height="4" width="6rem" ms="auto" />
          ) : (
            today?.temperature != null &&
            today.templow != null && (
              <Text textStyle="sm" color="fg.muted" ms="auto">
                H {round(today.temperature)}° · L {round(today.templow)}°
              </Text>
            )
          )}
        </Flex>
      }
    >
      <Box css={NARROW_CSS}>
        {/* Now: the condition's icon and the temperature, the words beside. */}
        <HStack gap="4" rowGap="2" align="center" minW="0" wrap="wrap">
          {loading ? (
            <>
              <Skeleton boxSize="4.5rem" rounded="full" />
              <Skeleton height="4rem" width="7rem" />
            </>
          ) : (
            weather && (
              <>
                <Box
                  data-hero-icon=""
                  fontSize="6rem"
                  lineHeight="1"
                  flexShrink={0}
                  aria-hidden
                >
                  {weatherIcon(weather.state, now.toISOString())}
                </Box>
                {current != null && (
                  <Text
                    data-hero-temp=""
                    textStyle="7xl"
                    fontWeight="semibold"
                    lineHeight="1"
                    whiteSpace="nowrap"
                  >
                    <NumberFlow value={current} />°
                  </Text>
                )}
              </>
            )
          )}
          <Spacer />
          {loading ? (
            <VStack align="end" gap="2">
              <Skeleton height="1.5rem" width="6rem" />
              <Skeleton height="1rem" width="7rem" />
            </VStack>
          ) : (
            weather && (
              <VStack
                data-hero-words=""
                align="end"
                gap="0.5"
                minW="0"
                textAlign="end"
              >
                <Text textStyle="2xl" fontWeight="medium" truncate maxW="100%">
                  {conditionLabel(weather.state)}
                </Text>
                {weather.humidity != null && (
                  <Text color="fg.muted">{weather.humidity}% humidity</Text>
                )}
              </VStack>
            )
          )}
        </HStack>

        {connected === false && (
          <Alert.Root status="error" mt="4" borderRadius="sm">
            <Alert.Indicator />
            <Alert.Title>Offline</Alert.Title>
            <Alert.Description>Internet outage detected.</Alert.Description>
          </Alert.Root>
        )}

        {loading ? (
          <Skeleton height="6.5rem" rounded="sm" mt="6" />
        ) : (
          hours.length > 0 && (
            <Box mt="6">
              <SectionTitle>Next hours</SectionTitle>
              <Card.Root size="sm" variant="subtle" borderRadius="sm" mt="3">
                <Card.Body px="2" css={{ containerType: "inline-size" }}>
                  {/* One column per hour shown: a narrow card (a ¼-width
                      tile) drops the later hours rather than squeeze them. */}
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
                              visibility={
                                rain >= RAIN_SHOWN_FROM ? undefined : "hidden"
                              }
                            >
                              {rain}%
                            </Text>
                          )}
                          <Text textStyle="lg" fontWeight="medium">
                            {round(h.temperature)}°
                          </Text>
                        </VStack>
                      );
                    })}
                  </Grid>
                </Card.Body>
              </Card.Root>
            </Box>
          )
        )}
      </Box>
    </Board>
  );
}
