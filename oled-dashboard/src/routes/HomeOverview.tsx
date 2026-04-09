import { useEffect, useState } from "react";
import { Box, Text, HStack, VStack, Spacer } from "@chakra-ui/react";
import { useHomeData } from "../hooks/useHomeData";
import type {
  HomeClimate,
  HomeEnergy,
  HomeInternet,
  HomePrinter,
  HomeWeather,
  HomeCalendarEvent,
} from "../hooks/useHomeData";

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

const HVAC_COLOR: Record<string, string> = {
  cool: "blue.400",
  heat: "orange.400",
  off: "gray.800",
  auto: "green.500",
  unknown: "gray.800",
};

function fmtKwh(n: number) {
  return isNaN(n) ? "--" : n.toFixed(0);
}

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

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider() {
  return <Box width="100%" height="1px" bg="gray.900" flexShrink={0} />;
}

// ── Header: date + time + temp ────────────────────────────────────────────────

function Header({ internet }: { internet: HomeInternet }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const rawHours = now.getHours();
  const hours = pad(rawHours % 12 || 12);
  const minutes = pad(now.getMinutes());
  const ampm = rawHours < 12 ? "am" : "pm";
  const day = DAYS[now.getDay()];
  const month = MONTHS[now.getMonth()];
  const date = now.getDate();

  return (
    <Box width="100%">
      {/* Date line */}
      <HStack align="baseline" gap="2vmin" mb="0.8vmin">
        <Text
          fontSize="3.8vmin"
          color="gray.600"
          fontWeight="400"
          letterSpacing="0.02em"
        >
          {day}, {month} {date}
        </Text>
        <Spacer />
        {!internet.connected && (
          <Text fontSize="3vmin" color="red.500" fontWeight="400">
            Offline
          </Text>
        )}
      </HStack>

      {/* Time */}
      <Text
        fontSize="18vmin"
        fontWeight="300"
        letterSpacing="-0.03em"
        color="white"
        lineHeight="0.9"
      >
        {hours}:{minutes}
        <Text
          as="span"
          fontSize="8vmin"
          fontWeight="300"
          color="gray.500"
          ml="1.5vmin"
        >
          {ampm}
        </Text>
      </Text>
    </Box>
  );
}

// ── Weather condition icons ───────────────────────────────────────────────────

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

// ── Wind direction helpers ────────────────────────────────────────────────────

const WIND_DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

function degToCompass(deg: number) {
  const idx = Math.round(deg / 45) % 8;
  return WIND_DIRS[idx];
}

// ── Weather section ──────────────────────────────────────────────────────────

function WeatherSection({ weather }: { weather: HomeWeather }) {
  const label = CONDITION_LABEL[weather.state] ?? weather.state;
  const emoji = CONDITION_EMOJI[weather.state] ?? "🌡️";

  return (
    <HStack width="100%" gap="4vmin" align="center">
      {/* Icon */}
      <Text
        fontSize="14vmin"
        lineHeight="1"
        flexShrink={0}
        role="img"
        aria-label={weather.state}
      >
        {emoji}
      </Text>

      <VStack display="flex" alignItems="flex-start" lineHeight={1}>
        {/* Temperature */}
        {weather.temperature != null && (
          <Text
            fontSize="14vmin"
            fontWeight="300"
            letterSpacing="-0.03em"
            color="gray.300"
            lineHeight="1"
            flexShrink={0}
          >
            {Math.round(weather.temperature)}°
          </Text>
        )}

        {/* Condition label */}
        <Text fontSize="6vmin" color="gray.200" fontWeight="300" flexShrink={0}>
          {label}
        </Text>
      </VStack>

      {/* Stats pushed to the right */}
      <VStack flex="1" gap="4vmin" justify="flex-end" align="center">
        {weather.humidity != null && (
          <VStack align="center" gap="0.3vmin">
            <Text fontSize="2.6vmin" color="gray.700" letterSpacing="0.1em">
              HUMIDITY
            </Text>
            <Text fontSize="4vmin" color="gray.400" fontWeight="300">
              {weather.humidity}%
            </Text>
          </VStack>
        )}
        {weather.windSpeed != null && (
          <VStack align="center" gap="0.3vmin">
            <Text fontSize="2.6vmin" color="gray.700" letterSpacing="0.1em">
              WIND
            </Text>
            <Text fontSize="4vmin" color="gray.400" fontWeight="300">
              {Math.round(weather.windSpeed)}
              {weather.windDirection != null
                ? ` ${degToCompass(weather.windDirection)}`
                : " mph"}
            </Text>
          </VStack>
        )}
      </VStack>
    </HStack>
  );
}

// ── Climate ───────────────────────────────────────────────────────────────────

function ClimateRow({ unit }: { unit: HomeClimate }) {
  const isOff = unit.state === "off" || unit.state === "unknown";
  const modeColor = HVAC_COLOR[unit.state] ?? "gray.700";

  return (
    <HStack justify="space-between" align="baseline" width="100%">
      <Text fontSize="3.8vmin" color="gray.500" fontWeight="400" minW="22vmin">
        {unit.name}
      </Text>
      <Text fontSize="3.4vmin" color={modeColor} minW="10vmin">
        {unit.state}
      </Text>
      {!isOff && unit.currentTemp != null ? (
        <HStack align="baseline" gap="1vmin" flex="1" justify="flex-end">
          <Text fontSize="5vmin" color="white" fontWeight="300" lineHeight="1">
            {unit.currentTemp}°
          </Text>
          {unit.targetTemp != null && (
            <Text fontSize="3.4vmin" color="gray.700">
              → {unit.targetTemp}°
            </Text>
          )}
        </HStack>
      ) : (
        <Box flex="1" />
      )}
    </HStack>
  );
}

function ClimateSection({ climate }: { climate: HomeClimate[] }) {
  return (
    <Box width="100%">
      <Text
        fontSize="2.6vmin"
        color="gray.700"
        letterSpacing="0.14em"
        mb="1.5vmin"
      >
        CLIMATE
      </Text>
      <VStack gap="1.2vmin" align="stretch" width="100%">
        {climate.map((unit) => (
          <ClimateRow key={unit.name} unit={unit} />
        ))}
      </VStack>
    </Box>
  );
}

// ── Energy ────────────────────────────────────────────────────────────────────

function EnergySection({ energy }: { energy: HomeEnergy }) {
  const { productionToday, consumptionToday } = energy;
  const pct =
    consumptionToday > 0 ? (productionToday / consumptionToday) * 100 : 0;
  const pctColor =
    pct >= 100 ? "green.500" : pct >= 50 ? "yellow.500" : "gray.600";

  return (
    <Box width="100%">
      <Text
        fontSize="2.6vmin"
        color="gray.700"
        letterSpacing="0.14em"
        mb="1.5vmin"
      >
        ENERGY kWh
      </Text>
      <HStack width="100%" justify="space-between" align="flex-start">
        {/* Today totals */}
        <VStack align="flex-end" gap="0.4vmin" width="100%">
          <Text fontSize="2.6vmin" color="gray.700" letterSpacing="0.1em">
            TODAY
          </Text>
          <HStack
            align="baseline"
            gap="1.5vmin"
            display="flex"
            alignItems="center"
            width="100%"
          >
            <Text fontSize="3.5vmin" lineHeight="1">
              ☀️
            </Text>
            <Text
              fontSize="5.5vmin"
              color="yellow.600"
              fontWeight="300"
              lineHeight="1"
            >
              {fmtKwh(productionToday)} kWh
            </Text>
            <Text fontSize="3.5vmin" lineHeight="1">
              ⚡
            </Text>
            <Text
              fontSize="5.5vmin"
              color="gray.400"
              fontWeight="300"
              lineHeight="1"
            >
              {fmtKwh(consumptionToday)} kWh
            </Text>
            <Spacer />
            <Text fontSize="5.5vmin" color={pctColor} fontWeight="400">
              {Math.round(pct)}%
            </Text>
          </HStack>
        </VStack>
      </HStack>
    </Box>
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
    <Box width="100%">
      <Text
        fontSize="2.6vmin"
        color="gray.700"
        letterSpacing="0.14em"
        mb="1.5vmin"
      >
        3D PRINTER
      </Text>
      <HStack width="100%" justify="space-between" align="baseline">
        <Text
          fontSize="3.8vmin"
          color="gray.500"
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
            {Math.round(printer.progress)}%
          </Text>
          <Text fontSize="4vmin" color="gray.500" fontWeight="300">
            {fmtMins(printer.remainingTime)}
          </Text>
        </HStack>
      </HStack>
    </Box>
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
//             <Text fontSize="4vmin" color="gray.600" fontWeight="400">
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

function EventList({
  events,
  max = 5,
}: {
  events: HomeCalendarEvent[];
  max?: number;
}) {
  return (
    <VStack gap="1vmin" align="stretch" width="100%">
      {events.slice(0, max).map((event, i) => (
        <HStack key={i} justify="space-between" align="baseline" width="100%">
          <Text
            fontSize="3.8vmin"
            color="gray.400"
            fontWeight="300"
            overflow="hidden"
            whiteSpace="nowrap"
            textOverflow="ellipsis"
            flex="1"
            mr="3vmin"
          >
            {event.summary}
          </Text>
          <Text
            fontSize="3.2vmin"
            color="gray.600"
            fontWeight="300"
            flexShrink={0}
          >
            {event.allDay ? "all day" : formatEventTime(event.start)}
          </Text>
        </HStack>
      ))}
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
    <Box width="100%">
      {today.length > 0 && (
        <>
          <Text
            fontSize="2.6vmin"
            color="gray.700"
            letterSpacing="0.14em"
            mb="1.5vmin"
          >
            TODAY
          </Text>
          <EventList events={today} />
        </>
      )}
      {tomorrow.length > 0 && (
        <Box mt={today.length > 0 ? "2.5vmin" : "0"}>
          <Text
            fontSize="2.6vmin"
            color="gray.700"
            letterSpacing="0.14em"
            mb="1.5vmin"
          >
            TOMORROW
          </Text>
          <EventList events={tomorrow} />
        </Box>
      )}
    </Box>
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
        bg="#000"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize="3vmin" color="gray.800" letterSpacing="0.12em">
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
        bg="#000"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize="3vmin" color="gray.800">
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
    <Box
      width="100%"
      height="100vh"
      bg="#000"
      overflow="hidden"
      display="flex"
      flexDirection={isLandscape ? "row" : "column"}
      alignItems={isLandscape ? "flex-start" : "center"}
      justifyContent="flex-start"
      px={isLandscape ? "3vmin" : "6vmin"}
      py="4vh"
      gap={isLandscape ? "4vmin" : "2vmin"}
    >
      {isLandscape ? (
        <>
          {/* Left column — time & weather */}
          <Box
            flex="1"
            display="flex"
            flexDirection="column"
            justifyContent="flex-start"
            gap="3vmin"
          >
            <Header internet={data.internet} />
            {data.weather && (
              <>
                <Divider />
                <WeatherSection weather={data.weather} />
              </>
            )}
          </Box>

          {/* Right column — details */}
          <Box
            flex="1"
            display="flex"
            flexDirection="column"
            justifyContent="flex-start"
            gap="2vmin"
            overflowY="auto"
          >
            {hasCalendar && (
              <>
                <CalendarSection
                  today={data.calendar.today}
                  tomorrow={data.calendar.tomorrow}
                />
                <Divider />
              </>
            )}
            <ClimateSection climate={data.climate} />
            <Divider />
            <EnergySection energy={data.energy} />
            {printerActive && (
              <>
                <Divider />
                <PrinterSection printer={data.printer} />
              </>
            )}
          </Box>
        </>
      ) : (
        <>
          <Header internet={data.internet} />
          <Divider />
          {data.weather && <WeatherSection weather={data.weather} />}
          <Divider />
          {hasCalendar && (
            <>
              <CalendarSection
                today={data.calendar.today}
                tomorrow={data.calendar.tomorrow}
              />
              <Divider />
            </>
          )}
          <ClimateSection climate={data.climate} />
          <Divider />
          <EnergySection energy={data.energy} />
          {printerActive && (
            <>
              <Divider />
              <PrinterSection printer={data.printer} />
            </>
          )}
        </>
      )}
    </Box>
  );
}
