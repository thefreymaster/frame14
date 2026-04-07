import { useEffect, useState } from "react";
import { Box, Text, HStack, VStack, Spinner } from "@chakra-ui/react";
import { useWeather } from "../hooks/useWeather";
import { useEnergy } from "../hooks/useEnergy";
import type { ForecastPeriod } from "../hooks/useWeather";
import type { EnergyData } from "../hooks/useEnergy";

// ── Utilities ─────────────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const DAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

const CONDITION_LABEL: Record<string, string> = {
  "clear-night": "Clear",
  cloudy: "Cloudy",
  exceptional: "Exceptional",
  fog: "Fog",
  hail: "Hail",
  lightning: "Lightning",
  "lightning-rainy": "Storms",
  partlycloudy: "Partly Cloudy",
  pouring: "Heavy Rain",
  rainy: "Rain",
  snowy: "Snow",
  "snowy-rainy": "Sleet",
  sunny: "Sunny",
  windy: "Windy",
  "windy-variant": "Windy",
};

function formatHour(datetime: string) {
  const d = new Date(datetime);
  const h = d.getHours();
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

function formatWindSpeed(raw: string | number) {
  const str = String(raw ?? "");
  const match = str.match(/([\d.]+)\s*(\w+)?/);
  if (!match) return str;
  const value = Math.round(parseFloat(match[1]));
  const unit = match[2] ?? "mph";
  return `${value} ${unit}`;
}

function fmtW(n: number) {
  if (isNaN(n)) return "--";
  return n >= 1000 ? `${(n / 1000).toFixed(1)}kW` : `${Math.round(n)}W`;
}

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider() {
  return <Box width="100%" height="1px" bg="gray.900" flexShrink={0} />;
}

// ── Header: date + time + temp ────────────────────────────────────────────────

function Header({ temperature }: { temperature?: number }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const rawHours = now.getHours();
  const hours = pad(rawHours % 12 || 12);
  const minutes = pad(now.getMinutes());
  const ampm = rawHours < 12 ? "am" : "pm";

  return (
    <Box width="100%">
      <Text fontSize="3.2vw" color="gray.600" fontWeight="400" letterSpacing="0.02em" mb="0.5vw">
        {DAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}
      </Text>
      <HStack justify="space-between" align="baseline" width="100%">
        <Text
          fontSize="21vw"
          fontWeight="300"
          letterSpacing="-0.03em"
          color="white"
          lineHeight="0.85"
        >
          {hours}:{minutes}
          <Text as="span" fontSize="8vw" fontWeight="300" color="gray.500" ml="2vw">
            {ampm}
          </Text>
        </Text>
        {temperature != null && (
          <Text
            fontSize="21vw"
            fontWeight="300"
            letterSpacing="-0.03em"
            color="gray.300"
            lineHeight="0.85"
          >
            {Math.round(temperature)}°
          </Text>
        )}
      </HStack>
    </Box>
  );
}

// ── Condition row ─────────────────────────────────────────────────────────────

interface WeatherRowProps {
  state: string;
  humidity: number;
  windSpeed: string | number;
}

function WeatherRow({ state, humidity, windSpeed }: WeatherRowProps) {
  const label = CONDITION_LABEL[state] ?? state;
  return (
    <HStack width="100%" justify="space-between" align="center">
      <Text fontSize="4vw" color="gray.500" fontWeight="300">
        {label}
      </Text>
      <HStack gap="4vw">
        <Text fontSize="3.2vw" color="gray.700">
          {humidity}%
        </Text>
        <Text fontSize="3.2vw" color="gray.700">
          {formatWindSpeed(windSpeed)}
        </Text>
      </HStack>
    </HStack>
  );
}

// ── Forecast strip ────────────────────────────────────────────────────────────

function ForecastStrip({ forecast }: { forecast: ForecastPeriod[] }) {
  const periods = forecast.slice(0, 5);
  return (
    <HStack justify="space-between" width="100%" align="flex-start">
      {periods.map((period, i) => (
        <VStack
          key={i}
          align="center"
          gap="1vw"
          flex={1}
          opacity={i === 0 ? 1 : 0.55 + i * 0.02}
        >
          <Text fontSize="2.8vw" color="gray.600" letterSpacing="0.04em">
            {formatHour(period.datetime)}
          </Text>
          <Text fontSize="6vw" lineHeight="1" role="img">
            {CONDITION_EMOJI[period.condition] ?? "🌡️"}
          </Text>
          <Text fontSize="4vw" color="gray.300" fontWeight="300">
            {period.temperature}°
          </Text>
          {period.precipitationProbability != null && period.precipitationProbability > 0 ? (
            <Text fontSize="2.8vw" color="blue.500">
              {period.precipitationProbability}%
            </Text>
          ) : (
            <Box height="2.8vw" />
          )}
        </VStack>
      ))}
    </HStack>
  );
}

// ── Energy row ────────────────────────────────────────────────────────────────

function EnergyRow({ energy }: { energy: EnergyData }) {
  const { production, consumption, productionUnit } = energy;
  const pct = consumption > 0 ? (production / consumption) * 100 : 0;
  const pctColor = pct >= 100 ? "green.500" : pct >= 50 ? "yellow.500" : "gray.600";

  return (
    <HStack width="100%" justify="space-between" align="baseline">
      <HStack align="baseline" gap="3vw">
        <Text fontSize="4.5vw" color="yellow.500" fontWeight="300" lineHeight="1">
          {fmtW(production)}
        </Text>
        <Text fontSize="3vw" color="gray.700">↑</Text>
        <Text fontSize="4.5vw" color="gray.400" fontWeight="300" lineHeight="1">
          {fmtW(consumption)}
        </Text>
        <Text fontSize="3vw" color="gray.700">↓</Text>
      </HStack>
      <HStack align="baseline" gap="1.5vw">
        <Text fontSize="4.5vw" color="yellow.700" fontWeight="300" lineHeight="1">
          {isNaN(production) ? "--" : production.toFixed(1)}
        </Text>
        <Text fontSize="2.5vw" color="gray.700">
          {productionUnit ?? "kWh"} today
        </Text>
        <Text fontSize="3.5vw" color={pctColor} fontWeight="400">
          ({Math.round(pct)}%)
        </Text>
      </HStack>
    </HStack>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ClockWeather() {
  const { data: weather, isError: weatherError, isPending: weatherPending } = useWeather();
  const { data: energy, isError: energyError } = useEnergy();

  return (
    <Box
      width="100vw"
      height="100vh"
      bg="black"
      overflow="hidden"
      px="6vw"
      py="5vw"
      display="flex"
      flexDirection="column"
      gap="3vw"
    >
      <Header temperature={weather?.temperature} />

      <Divider />

      {weatherPending && <Spinner size="sm" color="gray.800" alignSelf="flex-start" />}

      {weatherError && (
        <Text fontSize="3vw" color="gray.800">weather unavailable</Text>
      )}

      {weather && (
        <WeatherRow
          state={weather.state}
          humidity={weather.humidity}
          windSpeed={weather.windSpeed}
        />
      )}

      <Divider />

      {weather && <ForecastStrip forecast={weather.forecast} />}

      <Divider />

      {!energyError && energy && <EnergyRow energy={energy} />}

      {energyError && (
        <Text fontSize="3vw" color="gray.800">energy unavailable</Text>
      )}
    </Box>
  );
}
