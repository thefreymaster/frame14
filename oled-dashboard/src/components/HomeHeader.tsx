import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Text, HStack, Spacer, Alert, Skeleton } from "@chakra-ui/react";
import NumberFlow from "@number-flow/react";
import type { HomeInternet, HomeWeather } from "../hooks/useHomeData";
import { Board } from "./Board";
import { HERO_SUFFIX_SIZE, HERO_TEXT } from "../lib/hero";
import { conditionLabel } from "../lib/weatherIcons";

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

/**
 * The date, the clock and the weather now — the condition, humidity and
 * today's high and low (0.127) on the top line, the temperature beside the
 * clock. The clock is the device's own, so it shows at once; while the
 * weather is loading its two figures are placeholders. Once it has landed, a
 * tap opens /weather.
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
  const navigate = useNavigate();
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

  const label = weather ? conditionLabel(weather.state) : "";
  // Today's high and low: the daily forecast's first day is today.
  const today = weather?.forecastDaily[0];
  const high = today?.temperature != null ? Math.round(today.temperature) : null;
  const low = today?.templow != null ? Math.round(today.templow) : null;

  return (
    <Board
      storageKey="time-weather"
      onClick={weather ? () => void navigate("/weather") : undefined}
      label="Open the weather page"
    >
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
            {high != null && low != null && ` · H ${high}° · L ${low}°`}
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
    </Board>
  );
}
