import { useEffect, useState } from "react";
import { Box, Text, HStack, Spacer, Alert } from "@chakra-ui/react";
// import {
//   WiMoonAltWaningCrescent4,
//   WiCloudy,
//   WiNa,
//   WiFog,
//   WiHail,
//   WiLightning,
//   WiThunderstorm,
//   WiDayCloudy,
//   WiRain,
//   WiShowers,
//   WiSnow,
//   WiRainMix,
//   WiDaySunny,
//   WiStrongWind,
// } from "react-icons/wi";
import NumberFlow from "@number-flow/react";
import { useHomeData } from "../hooks/useHomeData";
import type { HomeInternet, HomeWeather } from "../hooks/useHomeData";
import { StatusBanner } from "../components/StatusBanner";
import { EnergySection } from "../components/EnergySection";
import { ClimateSection } from "../components/ClimateSection";
import { ForecastSection } from "../components/ForecastSection";
import { PrinterSection } from "../components/PrinterSection";
import { VacuumSection } from "../components/VacuumSection";
import { FanSection } from "../components/FanSection";
import { BirdSection } from "../components/BirdSection";
import { Board } from "../components/Board";
import { CalendarSection } from "../components/CalendarSection";

// ── Utilities ─────────────────────────────────────────────────────────────────

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

// const CONDITION_ICON: Record<
//   string,
//   React.ComponentType<{ size?: string | number; color?: string }>
// > = {
//   "clear-night": WiMoonAltWaningCrescent4,
//   cloudy: WiCloudy,
//   exceptional: WiNa,
//   fog: WiFog,
//   hail: WiHail,
//   lightning: WiLightning,
//   "lightning-rainy": WiThunderstorm,
//   partlycloudy: WiDayCloudy,
//   pouring: WiRain,
//   rainy: WiShowers,
//   snowy: WiSnow,
//   "snowy-rainy": WiRainMix,
//   sunny: WiDaySunny,
//   windy: WiStrongWind,
//   "windy-variant": WiStrongWind,
// };

// ── Orientation hook ─────────────────────────────────────────────────────────

function useIsLandscape() {
  const [landscape, setLandscape] = useState(
    () => window.innerWidth > window.innerHeight,
  );
  useEffect(() => {
    const mql = window.matchMedia("(orientation: landscape)");
    const handler = (e: MediaQueryListEvent) => setLandscape(e.matches);
    mql.addEventListener("change", handler);
    setLandscape(mql.matches);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return landscape;
}

// ── Header: date + time + temp ────────────────────────────────────────────────

function Header({
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
  // const Icon = weather ? (CONDITION_ICON[weather.state] ?? WiDaySunny) : null;

  return (
    <Board storageKey="time-weather">
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

// ── People ────────────────────────────────────────────────────────────────────

// function PeopleSection({ people }: { people: HomePerson[] }) {
//   return (
//     <HStack width="100%" gap="6vmin" justify="center">
//       {people.map((person) => {
//         const isHome = person.state === "home" || person.state === "Home";
//         return (
//           <HStack key={person.name} align="baseline" gap="1.5vmin">
//             <Text fontSize="4vmin" color="var(--theme-fg-muted)" fontWeight="400">
//               {person.name}
//             </Text>
//             <Text
//               fontSize="3.8vmin"
//               color={isHome ? "green.600" : "gray.700"}
//               fontWeight="300"
//             >
//               {isHome ? "home" : "away"}
//             </Text>
//           </HStack>
//         );
//       })}
//     </HStack>
//   );
// }

// ── Page ──────────────────────────────────────────────────────────────────────

export function HomeOverview() {
  const { data, isError, isPending } = useHomeData();
  const isLandscape = useIsLandscape();

  if (isPending) {
    return (
      <Box
        width="100%"
        height="100vh"
        bg="var(--theme-bg)"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text
          fontSize="3vmin"
          color="var(--theme-fg-faint)"
          letterSpacing="0.12em"
        >
          loading
        </Text>
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box
        width="100%"
        height="100vh"
        bg="var(--theme-bg)"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize="3vmin" color="var(--theme-fg-faint)">
          unavailable
        </Text>
      </Box>
    );
  }

  return (
    <>
      <StatusBanner />
      <Box
        width="100%"
        height={isLandscape ? "100%" : "auto"}
        minHeight={isLandscape ? undefined : "100%"}
        bg="var(--theme-bg)"
        overflow={isLandscape ? "hidden" : "visible"}
        display="flex"
        flexDirection={isLandscape ? "row" : "column"}
        alignItems={isLandscape ? "flex-start" : "stretch"}
        justifyContent="flex-start"
        gap={2}
        padding="2"
      >
        {isLandscape ? (
          <>
            {/* Left column — time & weather */}
            <Box
              flex="1"
              display="flex"
              flexDirection="column"
              justifyContent="flex-start"
              gap="1"
            >
              <Header internet={data.internet} weather={data.weather} />
              {data.weather && (
                <ForecastSection forecast={data.weather.forecast} count={6} />
              )}
              <EnergySection energy={data.energy} />
              <FanSection fan={data.fan} />
              <PrinterSection printer={data.printer} />
              <VacuumSection vacuum={data.vacuum} />
            </Box>

            {/* Right column — details */}
            <Box
              flex="1"
              display="flex"
              flexDirection="column"
              justifyContent="flex-start"
              gap="1"
              overflowY="auto"
            >
              <ClimateSection climate={data.climate} />
              <CalendarSection
                today={data.calendar?.today ?? []}
                tomorrow={data.calendar?.tomorrow ?? []}
              />
              <BirdSection />
            </Box>
          </>
        ) : (
          <>
            <Header internet={data.internet} weather={data.weather} />
            {data.weather && (
              <ForecastSection forecast={data.weather.forecast} count={6} />
            )}
            <CalendarSection
              today={data.calendar?.today ?? []}
              tomorrow={data.calendar?.tomorrow ?? []}
            />
            <BirdSection />
            <ClimateSection climate={data.climate} />
            <EnergySection energy={data.energy} />
            <FanSection fan={data.fan} />
            <PrinterSection printer={data.printer} />
            <VacuumSection vacuum={data.vacuum} />
          </>
        )}
      </Box>
    </>
  );
}
