import { useEffect, useState } from "react";
import { Text, HStack, Spacer, Alert } from "@chakra-ui/react";
import NumberFlow from "@number-flow/react";
import type { HomeInternet, HomeWeather } from "../hooks/useHomeData";
import { BirdSection } from "./BirdSection";
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
}: {
  internet: HomeInternet;
  weather?: HomeWeather | null;
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

  // The hero figures climb Chakra's type scale with the breakpoints, topping
  // out at 9xl on the panel. Landscape gives this card half the width, so it
  // climbs slower there. A fixed 9xl overflowed phones and crowded laptops.
  const hero = {
    base: "5xl",
    sm: "6xl",
    md: "8xl",
    "2xl": "9xl",
    _landscape: { base: "5xl", lg: "6xl", xl: "7xl", "2xl": "8xl" },
  };

  return (
    <Board storageKey="time-weather">
      <HStack
        width="100%"
        align="baseline"
        textStyle={{ base: "md", sm: "lg", md: "2xl" }}
        minW="0"
      >
        <Text truncate minW="0">
          {day}, {month} {date}
        </Text>
        <Spacer />
        {weather && (
          <Text color="fg.muted" flexShrink={0}>
            {label}
            {weather.humidity != null && ` ${weather.humidity}%`}
          </Text>
        )}
      </HStack>

      {connected === false && (
        <Alert.Root status="error" mt="4" borderRadius="sm">
          <Alert.Indicator />
          <Alert.Title>Offline</Alert.Title>
          <Alert.Description>Internet outage detected.</Alert.Description>
        </Alert.Root>
      )}

      <HStack width="100%" align="baseline" mt="2" minW="0">
        <Text
          fontSize={hero}
          fontWeight="light"
          lineHeight="1"
          whiteSpace="nowrap"
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
            textStyle={{ base: "xl", md: "4xl" }}
            color="fg.muted"
            ms="2"
          >
            {ampm}
          </Text>
        </Text>
        <Spacer />
        {weather && weather.temperature != null && (
          <Text
            fontSize={hero}
            fontWeight="light"
            lineHeight="1"
            whiteSpace="nowrap"
          >
            <NumberFlow value={Math.round(weather.temperature)} />°
          </Text>
        )}
      </HStack>

      {/* Latest BirdNET-Go detection — renders nothing when there hasn't been
          one, so the header keeps its height. */}
      <HStack width="100%" minW="0" mt="4" _empty={{ display: "none" }}>
        <BirdSection />
      </HStack>
    </Board>
  );
}
