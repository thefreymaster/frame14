import { useEffect, useState } from "react";
import { Box, Text, HStack, Spacer, Alert } from "@chakra-ui/react";
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
      {/* Size the header's type against this card, not the viewport.
       *
       * vmin tracks the viewport's short edge, but in landscape this card only
       * gets half the width — so on a tall-ish landscape window (say 1200×980)
       * 15vmin of clock plus 14vmin of temperature is wider than the card and
       * the degree sign wraps onto its own line. cqi is a share of this box, so
       * the two rows fit at every window size and still fill the frame in
       * portrait, where the card spans both columns. */}
      <Box css={{ containerType: "inline-size" }} width="100%" minW="0">
        <HStack width="100%" align="baseline" mb="0.5vmin" minW="0">
          <Text
            fontSize="4.1cqi"
            fontWeight="400"
            letterSpacing="0.02em"
            whiteSpace="nowrap"
            minW="0"
            truncate
          >
            {day}, {month} {date}
          </Text>
          <Spacer />
          {weather && (
            <HStack gap="1vmin" align="baseline" flexShrink={0}>
              <Text
                fontSize="4.1cqi"
                color="var(--theme-fg-dim)"
                fontWeight="400"
                whiteSpace="nowrap"
              >
                {label}
              </Text>
              {weather.humidity != null && (
                <Text
                  fontSize="4.1cqi"
                  color="var(--theme-fg-dim)"
                  fontWeight="400"
                  whiteSpace="nowrap"
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
        <HStack width="100%" align="baseline" minW="0">
          <Text
            className="display-numeral"
            fontSize="16.3cqi"
            fontWeight="300"
            letterSpacing="-0.03em"
            lineHeight="0.9"
            whiteSpace="nowrap"
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
              className="display-numeral"
              fontSize="6.5cqi"
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
              className="display-numeral"
              fontSize="15.2cqi"
              fontWeight="300"
              letterSpacing="-0.03em"
              lineHeight="0.9"
              whiteSpace="nowrap"
              flexShrink={0}
            >
              <NumberFlow value={Math.round(weather.temperature)} />°
            </Text>
          )}
        </HStack>

        {/* Row 3: latest BirdNET-Go detection — renders nothing when there
            hasn't been one, so the header keeps its old height. */}
        <HStack width="100%" minW="0" mt="1.5vmin" _empty={{ display: "none" }}>
          <BirdSection />
        </HStack>
      </Box>
    </Board>
  );
}
