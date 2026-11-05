import { Alert, Box, Grid, Skeleton, Text, VStack } from "@chakra-ui/react";
import { useState } from "react";
import NumberFlow from "@number-flow/react";
import type { HomeInternet, HomeWeather } from "../hooks/useHomeData";
import { Board } from "./Board";
import { roundTemp as round } from "../lib/forecast";
import { conditionLabel, weatherIcon } from "../lib/weatherIcons";
import { WeatherDialog } from "./WeatherDialog";

/**
 * The weather now — what /home's first card is on a phone in place of
 * HomeHeader. No clock (the phone shows one): the icon centred on the
 * temperature, today's high and low under both from the card's left edge
 * (0.159.1, the user's ask; from the daily forecast, as the desktop card's
 * header has them), and the condition and humidity on the right, centred on
 * the two rows. Same card id ("header"), so a saved layout keeps its place.
 * A tap opens WeatherDialog (0.136; it went to /weather from 0.97).
 */
export function HomeWeatherCard({
  internet: { connected = true },
  weather,
  loading = false,
}: {
  internet: HomeInternet;
  weather?: HomeWeather | null;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const today = weather?.forecastDaily?.[0];
  const high = round(today?.temperature);
  const low = round(today?.templow);

  return (
    <>
      <Board
        storageKey="time-weather"
        onClick={weather ? () => setOpen(true) : undefined}
        label="Show the weather"
      >
        <Grid
          templateColumns="auto auto minmax(0, 1fr)"
          columnGap="3"
          rowGap="1"
          alignItems="center"
        >
          {loading ? (
            <Skeleton boxSize="3rem" rounded="full" />
          ) : (
            weather && (
              <Box
                fontSize="3rem"
                lineHeight="1"
                data-weather-icon
                aria-hidden
              >
                {weatherIcon(weather.state, new Date().toISOString())}
              </Box>
            )
          )}
          {loading ? (
            <Skeleton height="2.5rem" width="4rem" />
          ) : (
            weather?.temperature != null && (
              <Text
                textStyle="5xl"
                fontWeight="semibold"
                lineHeight="1"
                data-weather-temperature
              >
                <NumberFlow value={Math.round(weather.temperature)} />°
              </Text>
            )
          )}
          {loading ? (
            <VStack
              align="end"
              gap="1.5"
              gridColumn="3"
              gridRow="1 / span 2"
              justifySelf="end"
            >
              <Skeleton height="1.25rem" width="5rem" />
              <Skeleton height="1rem" width="6rem" />
            </VStack>
          ) : (
            weather && (
              <VStack
                align="end"
                gap="0"
                minW="0"
                maxW="100%"
                textAlign="end"
                gridColumn="3"
                gridRow="1 / span 2"
                justifySelf="end"
              >
                <Text textStyle="lg" fontWeight="medium" truncate maxW="100%">
                  {conditionLabel(weather.state)}
                </Text>
                {weather.humidity != null && (
                  <Text textStyle="sm" color="fg.muted">
                    {weather.humidity}% humidity
                  </Text>
                )}
              </VStack>
            )
          )}
          {loading ? (
            <Skeleton
              height="0.875rem"
              width="5.5rem"
              gridColumn="1 / span 2"
              gridRow="2"
            />
          ) : (
            high != null &&
            low != null && (
              <Text
                textStyle="sm"
                color="fg.muted"
                whiteSpace="nowrap"
                gridColumn="1 / span 2"
                gridRow="2"
              >
                H {high}° · L {low}°
              </Text>
            )
          )}
        </Grid>

        {connected === false && (
          <Alert.Root status="error" mt="3" borderRadius="sm">
            <Alert.Indicator />
            <Alert.Title>Offline</Alert.Title>
            <Alert.Description>Internet outage detected.</Alert.Description>
          </Alert.Root>
        )}
      </Board>
      <WeatherDialog
        weather={weather}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
