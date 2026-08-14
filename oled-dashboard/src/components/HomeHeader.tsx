import { useEffect, useState } from "react";
import { Text, HStack, Spacer, Alert } from "@chakra-ui/react";
import NumberFlow from "@number-flow/react";
import type { HomeInternet, HomeWeather } from "../hooks/useHomeData";
import { Board } from "./Board";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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

export function HomeHeader({
  internet: { connected = true },
  weather,
  span,
}: {
  internet: HomeInternet;
  weather?: HomeWeather | null;
  span?: 1 | 2;
}) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const rawHours = now.getHours();
  const hours = rawHours % 12 || 12;
  const minutes = now.getMinutes();
  const ampm = rawHours < 12 ? "am" : "pm";
  const day = DAYS[now.getDay()];
  const month = MONTHS[now.getMonth()];
  const date = now.getDate();

  const label = weather
    ? (CONDITION_LABEL[weather.state] ?? weather.state)
    : "";

  return (
    <Board span={span} storageKey="time-weather">
      <HStack width="100%" align="baseline" mb="0.5vmin">
        <Text fontSize="3.8vmin" fontWeight="400" letterSpacing="0.02em">
          {day}, {month} {date}
        </Text>
        <Spacer />
        {weather && (
          <HStack gap="1vmin" align="baseline">
            <Text
              fontSize="3.8vmin"
              color="var(--theme-fg-dim)"
              fontWeight="400"
            >
              {label}
            </Text>
            {weather.humidity != null && (
              <Text
                fontSize="3.8vmin"
                color="var(--theme-fg-dim)"
                fontWeight="400"
              >
                {weather.humidity}%
              </Text>
            )}
          </HStack>
        )}
      </HStack>

      {connected === false && (
        <Alert.Root status="error" variant="solid" p="2">
          <Alert.Indicator />
          <Alert.Title>Offline!</Alert.Title>
          <Alert.Description>Internet outage detected.</Alert.Description>
        </Alert.Root>
      )}

      {/* Row 2: time — temp */}
      <HStack width="100%" align="baseline">
        <Text
          fontSize="15vmin"
          fontWeight="300"
          letterSpacing="-0.03em"
          lineHeight="0.9"
          flexShrink={0}
        >
          <NumberFlow
            digits={{ 2: { max: 2 } }}
            value={hours}
            prefix={hours < 10 ? "0" : ""}
            trend={1}
          />
          :
          <NumberFlow
            digits={{ 2: { max: 2 } }}
            value={minutes}
            prefix={minutes < 10 ? "0" : ""}
            trend={1}
          />
          <Text
            as="span"
            fontSize="6vmin"
            fontWeight="300"
            color="var(--theme-fg-dim)"
            ml="1vmin"
          >
            {ampm}
          </Text>
        </Text>
        <Spacer />
        {weather && weather.temperature != null && (
          <Text
            fontSize="14vmin"
            fontWeight="300"
            letterSpacing="-0.03em"
            lineHeight="0.9"
          >
            <NumberFlow value={Math.round(weather.temperature)} />°
          </Text>
        )}
      </HStack>
    </Board>
  );
}
