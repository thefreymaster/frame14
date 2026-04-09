import { Text, VStack, HStack, Box } from "@chakra-ui/react";
import type { WeatherData } from "../hooks/useWeather";

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

function formatWindSpeed(raw: string | number) {
  const str = String(raw ?? "");
  const match = str.match(/([\d.]+)\s*(\w+)?/);
  if (!match) return str;
  const value = Math.round(parseFloat(match[1]));
  const unit = match[2] ?? "mph";
  return `${value} ${unit}`;
}

function formatCondition(condition: string) {
  return condition
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface Props {
  weather: WeatherData;
}

export function WeatherCurrent({ weather }: Props) {
  return (
    <VStack gap="2vmin" align="center" width="100%">
      {/* Emoji + temperature on the same row */}
      <HStack gap="4vmin" align="center" justify="center">
        <Text fontSize="16vmin" lineHeight="1" role="img" aria-label={weather.state}>
          {conditionEmoji(weather.state)}
        </Text>
        <Text fontSize="16vmin" color="white" fontWeight="200" lineHeight="1">
          {weather.temperature}°
        </Text>
      </HStack>

      {/* Condition label */}
      <Text fontSize="5vmin" color="gray.400" letterSpacing="0.08em">
        {formatCondition(weather.state)}
      </Text>

      {/* Detail row */}
      <HStack gap="6vmin" justify="center">
        <Box textAlign="center">
          <Text fontSize="3vmin" color="gray.600">
            HUMIDITY
          </Text>
          <Text fontSize="4vmin" color="gray.400">
            {weather.humidity}%
          </Text>
        </Box>
        <Box textAlign="center">
          <Text fontSize="3vmin" color="gray.600">
            WIND
          </Text>
          <Text fontSize="4vmin" color="gray.400">
            {formatWindSpeed(weather.windSpeed)}
          </Text>
        </Box>
        {weather.visibility != null && (
          <Box textAlign="center">
            <Text fontSize="3vmin" color="gray.600">
              VISIBILITY
            </Text>
            <Text fontSize="4vmin" color="gray.400">
              {weather.visibility} mi
            </Text>
          </Box>
        )}
      </HStack>
    </VStack>
  );
}
