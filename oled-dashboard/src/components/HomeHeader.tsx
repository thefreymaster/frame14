import { useEffect, useState } from "react";
import { Text, HStack, Spacer, Alert, Skeleton } from "@chakra-ui/react";
import NumberFlow from "@number-flow/react";
import type { HomeInternet, HomeWeather } from "../hooks/useHomeData";
import { BirdSection } from "./BirdSection";
import { Board } from "./Board";
import { HERO_SUFFIX_SIZE, HERO_TEXT } from "../lib/hero";

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

/**
 * The date, the clock and the weather now. The clock is the device's own, so
 * it shows at once; while the weather is loading its two figures are
 * placeholders.
 */
export function HomeHeader({
  internet: { connected = true },
  weather,
  loading = false,
}: {
  internet: HomeInternet;
  weather?: HomeWeather | null;
  loading?: boolean;
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
        {loading && <Skeleton height="1em" width="6em" flexShrink={0} />}
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

      <HStack
        width="100%"
        align="baseline"
        mt="2"
        minW="0"
        // The hero figures size themselves from this row; see lib/hero.ts.
        css={{ containerType: "inline-size" }}
      >
        <Text {...HERO_TEXT}>
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
            fontSize={HERO_SUFFIX_SIZE}
            fontWeight="medium"
            color="fg.muted"
            ms="2"
          >
            {ampm}
          </Text>
        </Text>
        <Spacer />
        {loading && (
          <Text {...HERO_TEXT}>
            <Skeleton
              as="span"
              display="inline-block"
              height="0.75em"
              width="1.6em"
            />
          </Text>
        )}
        {weather && weather.temperature != null && (
          <Text {...HERO_TEXT}>
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
