import { Box, HStack, Spacer, Text, VStack } from "@chakra-ui/react";
import type { HomeWeather } from "../hooks/useHomeData";
import { roundTemp } from "../lib/forecast";
import { conditionLabel, weatherIcon } from "../lib/weatherIcons";

/**
 * The weather now in one row: the condition's icon and the temperature at
 * the left, the condition's words and today's high and low at the right. The
 * forecast dialog's and /weather's Now card's (the desktop Home card draws its
 * own, with a NumberFlow and a narrow-card container query).
 */
export function WeatherHero({ weather }: { weather: HomeWeather }) {
  const now = new Date();
  const today = weather.forecastDaily[0];
  const current = roundTemp(weather.temperature);

  return (
    <HStack gap="4" align="center" minW="0">
      <Box fontSize="5rem" lineHeight="1" flexShrink={0} aria-hidden>
        {weatherIcon(weather.state, now.toISOString())}
      </Box>
      {current != null && (
        <Text
          textStyle="6xl"
          fontWeight="semibold"
          lineHeight="1"
          whiteSpace="nowrap"
        >
          {current}°
        </Text>
      )}
      <Spacer />
      <VStack align="end" gap="0.5" minW="0" textAlign="end">
        <Text textStyle="xl" fontWeight="medium" truncate maxW="100%">
          {conditionLabel(weather.state)}
        </Text>
        {today?.temperature != null && today.templow != null && (
          <Text color="fg.muted" whiteSpace="nowrap">
            H {roundTemp(today.temperature)}° · L {roundTemp(today.templow)}°
          </Text>
        )}
      </VStack>
    </HStack>
  );
}
