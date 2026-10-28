import { useNavigate } from "react-router";
import {
  Alert,
  Box,
  Flex,
  HStack,
  Skeleton,
  Spacer,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import NumberFlow from "@number-flow/react";
import { IoPartlySunnyOutline } from "react-icons/io5";
import type { HomeInternet, HomeWeather } from "../hooks/useHomeData";
import { Board } from "./Board";
import { HourlyForecast } from "./HourlyForecast";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { roundTemp as round } from "../lib/forecast";
import { conditionLabel, weatherIcon } from "../lib/weatherIcons";

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

/**
 * /home's first card on a desktop, in place of HomeHeader (the header has the
 * clock there): the weather now and the next 8 hours, from the WeatherKit
 * forecasts in useHomeData. Built from the board's own parts — a collapsible
 * Board with a SectionTitle, today's high and low as its summary, and a
 * subtle `sm` well like the calendar's rows (HourlyForecast). Same card id
 * ("header"), so a saved layout keeps its place. A tap on the body (the header
 * collapses it) opens /weather.
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
  const navigate = useNavigate();
  const now = new Date();
  const hours = weather?.forecast ?? [];
  const today = weather?.forecastDaily?.[0];
  const current = round(weather?.temperature);

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
      <Box
        css={NARROW_CSS}
        role={weather ? "button" : undefined}
        tabIndex={weather ? 0 : undefined}
        aria-label={weather ? "Open the weather page" : undefined}
        cursor={weather ? "pointer" : undefined}
        onClick={weather ? () => void navigate("/weather") : undefined}
        onKeyDown={
          weather
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void navigate("/weather");
                }
              }
            : undefined
        }
      >
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
                <Text
                  textStyle="2xl"
                  fontWeight="medium"
                  truncate
                  maxW="100%"
                >
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
            <Stack gap="3" mt="6">
              <SectionTitle>Next hours</SectionTitle>
              <HourlyForecast hours={hours} />
            </Stack>
          )
        )}
      </Box>
    </Board>
  );
}
