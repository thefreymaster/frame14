import { Box, HStack, VStack, Text } from "@chakra-ui/react";
import type { ForecastPeriod } from "../hooks/useWeather";

const CONDITION_EMOJI: Record<string, string> = {
  "clear-night": "🌙",
  cloudy: "☁️",
  exceptional: "⚠️",
  fog: "🌫️",
  hail: "🌨️",
  lightning: "⚡",
  "lightning-rainy": "⛈️",
  partlycloudy: "⛅",
  pouring: "🌧️",
  rainy: "🌧️",
  snowy: "❄️",
  "snowy-rainy": "🌨️",
  sunny: "☀️",
  windy: "💨",
  "windy-variant": "💨",
};

function conditionEmoji(condition: string) {
  return CONDITION_EMOJI[condition] ?? "🌡️";
}

function formatHour(datetime: string) {
  const d = new Date(datetime);
  const h = d.getHours();
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

interface Props {
  forecast: ForecastPeriod[];
}

export function WeatherForecast({ forecast }: Props) {
  // Show 5 periods — fits portrait width evenly
  const periods = forecast.slice(0, 5);

  return (
    <Box width="100%" px="2vmin">
      <HStack gap={0} justify="space-between" align="stretch">
        {periods.map((period, i) => (
          <VStack
            key={i}
            gap="1vmin"
            align="center"
            flex={1}
            opacity={i === 0 ? 1 : 0.65}
            py="2vmin"
          >
            <Text
              
              fontSize="2.8vmin"
              color="gray.500"
              letterSpacing="0.05em"
            >
              {formatHour(period.datetime)}
            </Text>
            <Text fontSize="7vmin" lineHeight="1" role="img" aria-label={period.condition}>
              {conditionEmoji(period.condition)}
            </Text>
            <Text
              
              fontSize="4.5vmin"
              color="gray.200"
              fontWeight="300"
            >
              {period.temperature}°
            </Text>
            {period.precipitationProbability != null &&
              period.precipitationProbability > 0 ? (
              <Text  fontSize="2.8vmin" color="blue.400">
                {period.precipitationProbability}%
              </Text>
            ) : (
              <Box height="2.8vmin" />
            )}
          </VStack>
        ))}
      </HStack>
    </Box>
  );
}
