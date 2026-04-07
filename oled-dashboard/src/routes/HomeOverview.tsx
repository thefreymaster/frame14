import { useEffect, useState } from "react";
import { Box, Text, HStack, VStack } from "@chakra-ui/react";
import { useHomeData } from "../hooks/useHomeData";
import type {
  HomeClimate,
  HomeEnergy,
  HomePrinter,
  HomeWeather,
  HomePerson,
} from "../hooks/useHomeData";

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

function fmtW(n: number) {
  if (isNaN(n)) return "--";
  return n >= 1000 ? `${(n / 1000).toFixed(1)}kW` : `${Math.round(n)}W`;
}

function fmtKwh(n: number) {
  return isNaN(n) ? "--" : n.toFixed(1);
}

function fmtMins(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider() {
  return <Box width="100%" height="1px" bg="gray.900" flexShrink={0} />;
}

// ── Header: date + time + temp ────────────────────────────────────────────────

function Header({ weather }: { weather: HomeWeather | null }) {
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
      <Text fontSize="3.2vw" color="gray.600" fontWeight="400" letterSpacing="0.02em" mb="0.5vw">
        {day}, {month} {date}
      </Text>

      {/* Time + Temperature on one row */}
      <HStack justify="space-between" align="baseline" width="100%">
        <Text
          fontSize="16vw"
          fontWeight="300"
          letterSpacing="-0.03em"
          color="white"
          lineHeight="0.9"
        >
          {hours}:{minutes}
          <Text as="span" fontSize="7vw" fontWeight="300" color="gray.500" ml="1.5vw">
            {ampm}
          </Text>
        </Text>

        {weather?.temperature != null && (
          <Text
            fontSize="16vw"
            fontWeight="300"
            letterSpacing="-0.03em"
            color="gray.300"
            lineHeight="0.9"
          >
            {weather.temperature}°
          </Text>
        )}
      </HStack>
    </Box>
  );
}

// ── Weather row ───────────────────────────────────────────────────────────────

function WeatherRow({ weather }: { weather: HomeWeather }) {
  const label = CONDITION_LABEL[weather.state] ?? weather.state;
  return (
    <HStack width="100%" justify="space-between" align="center">
      <Text fontSize="3.5vw" color="gray.500" fontWeight="300">
        {label}
      </Text>
      {weather.humidity != null && (
        <Text fontSize="3vw" color="gray.700">
          {weather.humidity}% humidity
        </Text>
      )}
    </HStack>
  );
}

// ── Climate ───────────────────────────────────────────────────────────────────

function ClimateRow({ unit }: { unit: HomeClimate }) {
  const isOff = unit.state === "off" || unit.state === "unknown";
  const modeColor = HVAC_COLOR[unit.state] ?? "gray.700";

  return (
    <HStack justify="space-between" align="baseline" width="100%">
      <Text fontSize="3.2vw" color="gray.500" fontWeight="400" minW="22vw">
        {unit.name}
      </Text>
      <Text fontSize="2.8vw" color={modeColor} minW="10vw">
        {unit.state}
      </Text>
      {!isOff && unit.currentTemp != null ? (
        <HStack align="baseline" gap="1vw" flex="1" justify="flex-end">
          <Text fontSize="4vw" color="white" fontWeight="300" lineHeight="1">
            {unit.currentTemp}°
          </Text>
          {unit.targetTemp != null && (
            <Text fontSize="2.8vw" color="gray.700">
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
      <Text fontSize="2.2vw" color="gray.700" letterSpacing="0.14em" mb="1.2vw">
        CLIMATE
      </Text>
      <VStack gap="0.8vw" align="stretch" width="100%">
        {climate.map((unit) => (
          <ClimateRow key={unit.name} unit={unit} />
        ))}
      </VStack>
    </Box>
  );
}

// ── Energy ────────────────────────────────────────────────────────────────────

function EnergySection({ energy }: { energy: HomeEnergy }) {
  const { currentProduction, currentConsumption, productionToday, consumptionToday } = energy;
  const pct = consumptionToday > 0 ? (productionToday / consumptionToday) * 100 : 0;
  const pctColor = pct >= 100 ? "green.500" : pct >= 50 ? "yellow.500" : "gray.600";

  return (
    <Box width="100%">
      <Text fontSize="2.2vw" color="gray.700" letterSpacing="0.14em" mb="1.2vw">
        ENERGY
      </Text>
      <HStack width="100%" justify="space-between" align="baseline">
        {/* Live */}
        <VStack align="flex-start" gap="0.2vw">
          <Text fontSize="2.2vw" color="gray.700" letterSpacing="0.1em">NOW</Text>
          <HStack align="baseline" gap="1.5vw">
            <Text fontSize="4.5vw" color="yellow.500" fontWeight="300" lineHeight="1">
              {fmtW(currentProduction)}
            </Text>
            <Text fontSize="3vw" color="gray.600">↑</Text>
            <Text fontSize="4.5vw" color="gray.400" fontWeight="300" lineHeight="1">
              {fmtW(currentConsumption)}
            </Text>
            <Text fontSize="3vw" color="gray.600">↓</Text>
          </HStack>
        </VStack>

        {/* Today */}
        <VStack align="flex-end" gap="0.2vw">
          <Text fontSize="2.2vw" color="gray.700" letterSpacing="0.1em">TODAY</Text>
          <HStack align="baseline" gap="1vw">
            <Text fontSize="4.5vw" color="yellow.600" fontWeight="300" lineHeight="1">
              {fmtKwh(productionToday)}
            </Text>
            <Text fontSize="2.5vw" color="gray.600">kWh</Text>
            <Text fontSize="3vw" color={pctColor} fontWeight="400">
              ({Math.round(pct)}%)
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
      <Text fontSize="2.2vw" color="gray.700" letterSpacing="0.14em" mb="1.2vw">
        3D PRINTER
      </Text>
      <HStack width="100%" justify="space-between" align="baseline">
        <Text
          fontSize="3.2vw"
          color="gray.500"
          fontWeight="300"
          overflow="hidden"
          whiteSpace="nowrap"
          textOverflow="ellipsis"
          maxW="45vw"
        >
          {printer.taskName ?? "—"}
        </Text>
        <HStack align="baseline" gap="4vw">
          <Text fontSize="4.5vw" color="green.500" fontWeight="300" lineHeight="1">
            {Math.round(printer.progress)}%
          </Text>
          <Text fontSize="3.5vw" color="gray.500" fontWeight="300">
            {fmtMins(printer.remainingTime)}
          </Text>
        </HStack>
      </HStack>
    </Box>
  );
}

// ── People ────────────────────────────────────────────────────────────────────

function PeopleSection({ people }: { people: HomePerson[] }) {
  return (
    <HStack width="100%" gap="6vw">
      {people.map((person) => {
        const isHome = person.state === "home" || person.state === "Home";
        return (
          <HStack key={person.name} align="baseline" gap="1.5vw">
            <Text fontSize="3.2vw" color="gray.600" fontWeight="400">
              {person.name}
            </Text>
            <Text fontSize="3vw" color={isHome ? "green.600" : "gray.700"} fontWeight="300">
              {isHome ? "home" : person.state}
            </Text>
          </HStack>
        );
      })}
    </HStack>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function HomeOverview() {
  const { data, isError, isPending } = useHomeData();

  if (isPending) {
    return (
      <Box width="100vw" height="100vh" bg="black" display="flex" alignItems="center" justifyContent="center">
        <Text fontSize="3vw" color="gray.800" letterSpacing="0.12em">loading</Text>
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box width="100vw" height="100vh" bg="black" display="flex" alignItems="center" justifyContent="center">
        <Text fontSize="3vw" color="gray.800">unavailable</Text>
      </Box>
    );
  }

  const printerActive =
    data.printer.status === "running" ||
    data.printer.status === "printing" ||
    data.printer.status === "pause";

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
      <Header weather={data.weather} />

      <Divider />

      {data.weather && <WeatherRow weather={data.weather} />}

      <Divider />

      <ClimateSection climate={data.climate} />

      <Divider />

      <EnergySection energy={data.energy} />

      {printerActive && (
        <>
          <Divider />
          <PrinterSection printer={data.printer} />
        </>
      )}

      <Divider />

      <PeopleSection people={data.people} />
    </Box>
  );
}
