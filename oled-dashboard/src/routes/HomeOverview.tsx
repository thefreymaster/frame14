import { useEffect, useState } from "react";
import { Box, Text, HStack, VStack, Spacer, Alert } from "@chakra-ui/react";
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
import type {
  HomeInternet,
  HomePrinter,
  HomeWeather,
  HomeCalendarEvent,
} from "../hooks/useHomeData";
import { SectionTitle } from "../components/SectionTitle/SectionTitle";
import { StatusBanner } from "../components/StatusBanner";
import { EnergySection } from "../components/EnergySection";
import { ClimateSection } from "../components/ClimateSection";
import { ForecastSection } from "../components/ForecastSection";
import { Board } from "../components/Board";

// ── Utilities ─────────────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, "0");
}

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

function fmtMins(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

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
    <Board>
      {connected === false && (
        <Alert.Root status="error" variant="solid" p="2">
          <Alert.Indicator />
          <Alert.Title>Offline!</Alert.Title>
          <Alert.Description>Internet outage detected.</Alert.Description>
        </Alert.Root>
      )}
      {/* Row 1: date — condition/humidity */}
      <HStack width="100%" align="baseline" mb="0">
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

      {weather && <ForecastSection forecast={weather.forecast} count={6} />}
    </Board>
  );
}

// ── Printer ───────────────────────────────────────────────────────────────────

function PrinterSection({ printer }: { printer: HomePrinter }) {
  const isActive =
    printer.status === "running" ||
    printer.status === "printing" ||
    printer.status === "pause";
  if (!isActive) return null;

  return (
    <Board>
      <SectionTitle>3D PRINTER</SectionTitle>
      <HStack width="100%" justify="space-between" align="baseline">
        <Text
          fontSize="3.8vmin"
          color="var(--theme-fg-dim)"
          fontWeight="300"
          overflow="hidden"
          whiteSpace="nowrap"
          textOverflow="ellipsis"
          maxW="45vmin"
        >
          {printer.taskName ?? "—"}
        </Text>
        <HStack align="baseline" gap="4vmin">
          <Text
            fontSize="5.5vmin"
            color="green.500"
            fontWeight="300"
            lineHeight="1"
          >
            <NumberFlow value={printer.progress} />%
          </Text>
          <Text fontSize="4vmin" color="var(--theme-fg-dim)" fontWeight="300">
            {fmtMins(printer.remainingTime)}
          </Text>
        </HStack>
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

// ── Calendar ─────────────────────────────────────────────────────────────────

function formatEventTime(isoStr: string | null) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const h = d.getHours() % 12 || 12;
  const m = pad(d.getMinutes());
  const ampm = d.getHours() < 12 ? "a" : "p";
  return `${h}:${m}${ampm}`;
}

function isPast(event: HomeCalendarEvent): boolean {
  if (event.allDay) return false;
  const end = event.end ?? event.start;
  if (!end) return false;
  return new Date(end) < new Date();
}

function EventList({
  events,
  max = 5,
}: {
  events: HomeCalendarEvent[];
  max?: number;
}) {
  return (
    <VStack gap="1vmin" align="stretch" width="100%">
      {events.slice(0, max).map((event, i) => {
        const past = isPast(event);
        return (
          <HStack key={i} justify="space-between" align="baseline" width="100%">
            <Text
              fontSize="3.8vmin"
              fontWeight="300"
              overflow="hidden"
              whiteSpace="nowrap"
              textOverflow="ellipsis"
              flex="1"
              mr="3vmin"
              textDecoration={past ? "line-through" : undefined}
              color={past ? "var(--theme-fg-faint)" : undefined}
            >
              {event.summary}
            </Text>
            <Text
              fontSize="3.2vmin"
              color={past ? "var(--theme-fg-faint)" : "var(--theme-fg-muted)"}
              fontWeight="300"
              flexShrink={0}
              textDecoration={past ? "line-through" : undefined}
            >
              {event.allDay ? "all day" : formatEventTime(event.start)}
            </Text>
          </HStack>
        );
      })}
    </VStack>
  );
}

function CalendarSection({
  today,
  tomorrow,
}: {
  today: HomeCalendarEvent[];
  tomorrow: HomeCalendarEvent[];
}) {
  if (today.length === 0 && tomorrow.length === 0) return null;

  return (
    <Board>
      {today.length > 0 && (
        <>
          <SectionTitle>TODAY</SectionTitle>
          <EventList events={today} />
        </>
      )}
      {tomorrow.length > 0 && (
        <Box mt={today.length > 0 ? "2.5vmin" : "0"}>
          <SectionTitle>TOMORROW</SectionTitle>
          <EventList events={tomorrow} />
        </Box>
      )}
    </Board>
  );
}

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

  const printerActive =
    data.printer.status === "running" ||
    data.printer.status === "printing" ||
    data.printer.status === "pause";

  const hasCalendar =
    data.calendar?.today?.length > 0 || data.calendar?.tomorrow?.length > 0;

  return (
    <>
      <StatusBanner />
      <Box
        width="100%"
        height="100%"
        bg="var(--theme-bg)"
        overflow="hidden"
        display="flex"
        flexDirection={isLandscape ? "row" : "column"}
        alignItems={isLandscape ? "flex-start" : "center"}
        justifyContent={isLandscape ? "flex-start" : "space-between"}
        gap={1}
        padding="1"
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
              {printerActive && <PrinterSection printer={data.printer} />}
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
              <EnergySection energy={data.energy} />
              {hasCalendar && (
                <CalendarSection
                  today={data.calendar.today}
                  tomorrow={data.calendar.tomorrow}
                />
              )}
            </Box>
          </>
        ) : (
          <>
            <Header internet={data.internet} weather={data.weather} />
            {hasCalendar && (
              <CalendarSection
                today={data.calendar.today}
                tomorrow={data.calendar.tomorrow}
              />
            )}
            <ClimateSection climate={data.climate} />
            <EnergySection energy={data.energy} />
            {printerActive && <PrinterSection printer={data.printer} />}
          </>
        )}
      </Box>
    </>
  );
}
