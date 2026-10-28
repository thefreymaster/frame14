import {
  Alert,
  Box,
  HStack,
  Skeleton,
  Spacer,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useNavigate } from "react-router";
import NumberFlow from "@number-flow/react";
import type { HomeInternet, HomeWeather } from "../hooks/useHomeData";
import { Board } from "./Board";
import { roundTemp as round } from "../lib/forecast";
import { conditionLabel, weatherIcon } from "../lib/weatherIcons";

/**
 * The weather now, in one row — what /home's first card is on a phone in
 * place of HomeHeader. No clock (the phone shows one): the icon and the
 * temperature, with today's high and low under it (from the daily forecast,
 * as the desktop card's header has them), on the left; the condition and
 * humidity on the right. Same card id ("header"), so a saved layout keeps
 * its place. A tap opens /weather.
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
  const navigate = useNavigate();
  const today = weather?.forecastDaily?.[0];
  const high = round(today?.temperature);
  const low = round(today?.templow);

  return (
    <Board
      storageKey="time-weather"
      onClick={weather ? () => void navigate("/weather") : undefined}
      label="Open the weather page"
    >
      <HStack gap="3" align="center" minW="0">
        {loading ? (
          <Skeleton boxSize="3rem" rounded="full" flexShrink={0} />
        ) : (
          weather && (
            <Box fontSize="3rem" lineHeight="1" flexShrink={0} aria-hidden>
              {weatherIcon(weather.state, new Date().toISOString())}
            </Box>
          )
        )}
        {loading ? (
          <VStack align="start" gap="1.5">
            <Skeleton height="2.5rem" width="4rem" />
            <Skeleton height="0.875rem" width="5.5rem" />
          </VStack>
        ) : (
          weather?.temperature != null && (
            <VStack align="start" gap="1">
              <Text textStyle="5xl" fontWeight="semibold" lineHeight="1">
                <NumberFlow value={Math.round(weather.temperature)} />°
              </Text>
              {high != null && low != null && (
                <Text textStyle="sm" color="fg.muted" whiteSpace="nowrap">
                  H {high}° · L {low}°
                </Text>
              )}
            </VStack>
          )
        )}
        <Spacer />
        {loading ? (
          <VStack align="end" gap="1.5">
            <Skeleton height="1.25rem" width="5rem" />
            <Skeleton height="1rem" width="6rem" />
          </VStack>
        ) : (
          weather && (
            <VStack align="end" gap="0" minW="0" textAlign="end">
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
      </HStack>

      {connected === false && (
        <Alert.Root status="error" mt="3" borderRadius="sm">
          <Alert.Indicator />
          <Alert.Title>Offline</Alert.Title>
          <Alert.Description>Internet outage detected.</Alert.Description>
        </Alert.Root>
      )}
    </Board>
  );
}
