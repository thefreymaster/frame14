import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { callClimateService, type HvacMode } from "../lib/callService";
import {
  Box,
  Text,
  HStack,
  VStack,
  Grid,
  Spacer,
  Alert,
} from "@chakra-ui/react";
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
import { PiSolarRoof } from "react-icons/pi";
import NumberFlow from "@number-flow/react";
import {
  IoAdd,
  IoClose,
  IoFlame,
  IoFlash,
  IoPowerOutline,
  IoRemove,
  IoSnow,
} from "react-icons/io5";
import { WeatherForecast } from "../components/WeatherForecast";
import { useHomeData } from "../hooks/useHomeData";
import type {
  HomeClimate,
  HomeEnergy,
  HomeInternet,
  HomePrinter,
  HomeWeather,
  HomeCalendarEvent,
} from "../hooks/useHomeData";
import { SectionTitle } from "../components/SectionTitle/SectionTitle";

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

type ClimateVisualMode = "heat" | "cool" | "off";

const HVAC_COLOR: Record<string, string> = {
  cool: "blue.400",
  heat: "orange.400",
  off: "var(--theme-fg-faint)",
  auto: "green.500",
  unknown: "var(--theme-fg-faint)",
};

const ACTIVE_HVAC_ACTION: Record<string, ClimateVisualMode> = {
  heating: "heat",
  cooling: "cool",
};

function fmtKwh(n: number) {
  return isNaN(n) ? "--" : n.toFixed(0);
}

function fmtW(watts: number): string {
  if (isNaN(watts)) return "--";
  return `${(watts / 1000).toFixed(1)} kW`;
}

// function fmtKw(watts: number) {
//   if (isNaN(watts)) return "--";
//   return watts.toFixed(0);
// }

function fmtMins(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function normalizeClimateMode(
  mode: string | null | undefined,
): ClimateVisualMode {
  if (mode === "heat" || mode === "cool") return mode;
  return "off";
}

function fmtClimateTemp(temp: number | null | undefined) {
  return temp == null ? null : Math.round(temp);
}

function getClimateAction(
  mode: ClimateVisualMode,
  unit: HomeClimate,
  targetTemp: number,
): ClimateVisualMode | null {
  const liveAction = unit.hvacAction
    ? ACTIVE_HVAC_ACTION[unit.hvacAction.toLowerCase()]
    : null;
  if (liveAction) return liveAction;
  if (mode === "off") return null;

  const currentTemp = fmtClimateTemp(unit.currentTemp);
  if (currentTemp == null) return null;
  if (mode === "heat" && currentTemp <= targetTemp - 1) return "heat";
  if (mode === "cool" && currentTemp >= targetTemp + 1) return "cool";
  return null;
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
    <Box width="100%">
      {connected === false && (
        <Alert.Root status="error" variant="solid" p="2">
          <Alert.Indicator />
          <Alert.Title>Offline!</Alert.Title>
          <Alert.Description>Internet outage detected.</Alert.Description>
        </Alert.Root>
      )}
      {/* Row 1: date — condition/humidity */}
      <HStack width="100%" align="baseline" mb="0.8vmin">
        <Text fontSize="3.8vmin" fontWeight="400" letterSpacing="0.02em">
          {day}, {month} {date}
        </Text>
        <Spacer />
        {weather && (
          <HStack gap="1vmin" align="baseline">
            <Text
              fontSize="3.5vmin"
              color="var(--theme-fg-dim)"
              fontWeight="300"
            >
              {label}
            </Text>
            {weather.humidity != null && (
              <Text
                fontSize="3.5vmin"
                color="var(--theme-fg-faint)"
                fontWeight="300"
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

      {weather && weather.forecast.length > 0 && (
        <Box width="100%" mt="2vmin">
          <SectionTitle>FORECAST</SectionTitle>
          <WeatherForecast forecast={weather.forecast} count={6} />
        </Box>
      )}
    </Box>
  );
}

// ── Climate ───────────────────────────────────────────────────────────────────

const HVAC_MODES: { key: ClimateVisualMode; label: string }[] = [
  { key: "heat", label: "HEAT" },
  { key: "cool", label: "COOL" },
  { key: "off", label: "OFF" },
];

const THERMOSTAT_EXIT_MS = 260;

function ClimateModal({
  unit,
  onClose,
}: {
  unit: HomeClimate;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mode, setMode] = useState<ClimateVisualMode>(
    normalizeClimateMode(unit.hvacMode ?? unit.state),
  );
  const [temp, setTemp] = useState(fmtClimateTemp(unit.targetTemp) ?? 72);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);
    setMode(normalizeClimateMode(unit.hvacMode ?? unit.state));
    setTemp(fmtClimateTemp(unit.targetTemp) ?? 72);
  }, [unit.entity_id, unit.hvacMode, unit.state, unit.targetTemp]);

  function requestClose() {
    if (isClosing) return;
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, THERMOSTAT_EXIT_MS);
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isClosing, onClose]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  const activeAction = getClimateAction(mode, unit, temp);
  const isOff = mode === "off";
  const isActive = activeAction === mode && !isOff;
  const currentTemp = fmtClimateTemp(unit.currentTemp);
  const previousTarget = fmtClimateTemp(unit.targetTemp);
  const displayedTemp = isOff ? (currentTemp ?? previousTarget ?? temp) : temp;
  const displayLabel = isOff
    ? currentTemp != null
      ? "Indoor temperature"
      : previousTarget != null
        ? "Last target"
        : "Thermostat"
    : "Target temperature";
  const detailLabel = isOff
    ? previousTarget != null
      ? `Last target ${previousTarget}°`
      : "Choose heat or cool to wake it up"
    : currentTemp != null
      ? `Indoor ${currentTemp}°`
      : "Connected to Home Assistant";
  const statusLabel =
    activeAction === "heat"
      ? "Heating now"
      : activeAction === "cool"
        ? "Cooling now"
        : mode === "heat"
          ? "Heat standby"
          : mode === "cool"
            ? "Cool standby"
            : "System off";
  const AccentIcon =
    activeAction === "heat"
      ? IoFlame
      : activeAction === "cool"
        ? IoSnow
        : mode === "heat"
          ? IoFlame
          : mode === "cool"
            ? IoSnow
            : IoPowerOutline;

  function applyMode(newMode: ClimateVisualMode) {
    if (newMode === mode) return;
    setMode(newMode);
    callClimateService(unit.entity_id, "set_hvac_mode", {
      hvac_mode: newMode as HvacMode,
    });
    setTimeout(
      () =>
        void queryClient.invalidateQueries({ queryKey: ["home", "climate"] }),
      2500,
    );
  }

  function adjustTemp(delta: number) {
    const newTemp = Math.min(85, Math.max(60, temp + delta));
    if (newTemp === temp) return;
    setTemp(newTemp);
    callClimateService(unit.entity_id, "set_temperature", {
      temperature: newTemp,
    });
    setTimeout(
      () =>
        void queryClient.invalidateQueries({ queryKey: ["home", "climate"] }),
      2500,
    );
  }

  return (
    <Box
      className={`thermostat-modal thermostat-modal--${mode}${isClosing ? " thermostat-modal--closing" : ""}`}
      position="fixed"
      inset="0"
      zIndex={200}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p="4vmin"
      onClick={requestClose}
    >
      <Box
        className="thermostat-panel"
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap="3vmin"
        onClick={(event) => event.stopPropagation()}
      >
        <Box
          as="button"
          className="thermostat-close"
          aria-label="Close thermostat controls"
          onClick={requestClose}
        >
          <IoClose />
        </Box>

        <Box
          className={`thermostat-dial thermostat-dial--${mode}${isActive ? " thermostat-dial--active" : ""}`}
        >
          <Box className="thermostat-dial__edge" />
          <Box className="thermostat-dial__weather" />
          <Box className="thermostat-particles" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <Box key={index} as="span" className="thermostat-particle" />
            ))}
          </Box>
          {!isOff && (
            <>
              <Box
                as="button"
                className="thermostat-step thermostat-step--down"
                aria-label="Decrease target temperature"
                onClick={() => adjustTemp(-1)}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <IoRemove />
              </Box>
              <Box
                as="button"
                className="thermostat-step thermostat-step--up"
                aria-label="Increase target temperature"
                onClick={() => adjustTemp(1)}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <IoAdd />
              </Box>
            </>
          )}

          <VStack className="thermostat-dial__content" gap="0">
            <Text className="thermostat-room">{unit.name}</Text>
            <HStack className="thermostat-status" gap="1.2vmin">
              <AccentIcon />
              <Text as="span">{statusLabel}</Text>
            </HStack>
            <Text className="thermostat-temp">{displayedTemp}°</Text>
            <Text className="thermostat-temp-label">{displayLabel}</Text>
            <Text className="thermostat-detail">{detailLabel}</Text>
          </VStack>
        </Box>

        <HStack className="thermostat-mode-strip" gap="1.4vmin">
          {HVAC_MODES.map(({ key, label }) => {
            const active = mode === key;
            const ModeIcon =
              key === "heat"
                ? IoFlame
                : key === "cool"
                  ? IoSnow
                  : IoPowerOutline;

            return (
              <Box
                key={key}
                as="button"
                className={`thermostat-mode-button${active ? " thermostat-mode-button--active" : ""}`}
                onClick={() => applyMode(key)}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <ModeIcon />
                <Text as="span">{label}</Text>
              </Box>
            );
          })}
        </HStack>
      </Box>
    </Box>
  );
}

function ClimateRow({ unit, onTap }: { unit: HomeClimate; onTap: () => void }) {
  const displayMode = unit.hvacMode ?? unit.state;
  const activeAction =
    unit.hvacAction === "heating"
      ? "heating"
      : unit.hvacAction === "cooling"
        ? "cooling"
        : null;
  const statusLabel = activeAction ?? displayMode;
  const statusColor =
    activeAction != null
      ? HVAC_COLOR[activeAction === "heating" ? "heat" : "cool"]
      : (HVAC_COLOR[displayMode] ?? "var(--theme-fg-faint)");
  const isOff = normalizeClimateMode(displayMode) === "off";
  const currentTemp = fmtClimateTemp(unit.currentTemp);
  const targetTemp = fmtClimateTemp(unit.targetTemp);

  return (
    <HStack
      justify="space-between"
      align="baseline"
      width="100%"
      cursor="pointer"
      py="0.8vmin"
      onClick={onTap}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <Text
        fontSize="3.4vmin"
        color="var(--theme-fg-dim)"
        fontWeight="400"
        minW="22vmin"
      >
        {unit.name}
      </Text>
      <Text fontSize="3.4vmin" color={statusColor} minW="12vmin">
        {statusLabel}
      </Text>
      {currentTemp != null ? (
        <HStack align="baseline" gap="1vmin" flex="1" justify="flex-end">
          <Text fontSize="3.4vmin" fontWeight="300" lineHeight="1">
            {currentTemp}°
          </Text>
          {!isOff && targetTemp != null && (
            <Text fontSize="3.4vmin" color="var(--theme-fg-faint)">
              → {targetTemp}°
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
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const selectedUnit =
    climate.find((unit) => unit.entity_id === selectedEntityId) ?? null;

  return (
    <Box width="100%">
      <SectionTitle>CLIMATE</SectionTitle>
      <VStack gap="0" align="stretch" width="100%">
        {climate.map((unit) => (
          <ClimateRow
            key={unit.entity_id || unit.name}
            unit={unit}
            onTap={() => setSelectedEntityId(unit.entity_id)}
          />
        ))}
      </VStack>
      {selectedUnit && (
        <ClimateModal
          unit={selectedUnit}
          onClose={() => setSelectedEntityId(null)}
        />
      )}
    </Box>
  );
}

// ── Energy ────────────────────────────────────────────────────────────────────

function EnergySection({ energy }: { energy: HomeEnergy }) {
  const [showModal, setShowModal] = useState(false);
  const { productionToday, consumptionToday } = energy;
  const pct =
    consumptionToday > 0 ? (productionToday / consumptionToday) * 100 : 0;
  const pctColor =
    pct >= 100
      ? "green.500"
      : pct >= 50
        ? "yellow.500"
        : "var(--theme-fg-faint)";

  return (
    <>
      {showModal && (
        <EnergyModal energy={energy} onClose={() => setShowModal(false)} />
      )}
      <Box
        width="100%"
        cursor="pointer"
        onClick={() => setShowModal(true)}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <SectionTitle>ENERGY</SectionTitle>
        <Grid templateColumns="1fr 1fr 1fr" gap="2vmin" width="100%">
          <VStack align="flex-start" gap="0.5vmin">
            <HStack gap="1.2vmin" align="baseline">
              <Box
                color="yellow.500"
                fontSize="3.5vmin"
                lineHeight="1"
                flexShrink={0}
              >
                <PiSolarRoof />
              </Box>
              <Text
                fontSize="5vmin"
                fontWeight="300"
                color="yellow.600"
                lineHeight="1"
                whiteSpace="nowrap"
              >
                {fmtKwh(productionToday)} kWh
              </Text>
            </HStack>
            <Text
              fontSize="2vmin"
              letterSpacing="0.12em"
              color="var(--theme-fg-faint)"
            >
              PRODUCED
            </Text>
          </VStack>

          <VStack align="center" gap="0.5vmin">
            <Text
              fontSize="5vmin"
              fontWeight="400"
              color={pctColor}
              lineHeight="1"
            >
              {Math.round(pct)}%
            </Text>
            <Text
              fontSize="2vmin"
              letterSpacing="0.12em"
              color="var(--theme-fg-faint)"
            >
              SOLAR
            </Text>
          </VStack>

          <VStack align="flex-end" gap="0.5vmin">
            <HStack gap="1.2vmin" align="baseline">
              <Box
                fontSize="3.5vmin"
                lineHeight="1"
                color="var(--theme-fg-dim)"
                flexShrink={0}
              >
                <IoFlash />
              </Box>
              <Text
                fontSize="5vmin"
                fontWeight="300"
                color="var(--theme-fg-dim)"
                lineHeight="1"
                whiteSpace="nowrap"
              >
                {fmtKwh(consumptionToday)} kWh
              </Text>
            </HStack>
            <Text
              fontSize="2vmin"
              letterSpacing="0.12em"
              color="var(--theme-fg-faint)"
              textAlign="right"
            >
              USED
            </Text>
          </VStack>
        </Grid>
      </Box>
    </>
  );
}

// ── Energy Modal ──────────────────────────────────────────────────────────────

const ENERGY_EXIT_MS = 260;

function EnergyModal({
  energy,
  onClose,
}: {
  energy: HomeEnergy;
  onClose: () => void;
}) {
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  function requestClose() {
    if (isClosing) return;
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, ENERGY_EXIT_MS);
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isClosing]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  const {
    currentProduction,
    currentConsumption,
    productionToday,
    consumptionToday,
  } = energy;
  const gridDraw = currentConsumption - currentProduction;
  const isExporting = gridDraw < 0;
  const gridAbs = Math.abs(gridDraw);
  const solarActive = currentProduction > 5;
  const gridActive = gridAbs > 5;
  const pct =
    consumptionToday > 0
      ? Math.round((productionToday / consumptionToday) * 100)
      : 0;
  const pctColor =
    pct >= 100 ? "#22c55e" : pct >= 50 ? "#eab308" : "var(--theme-fg-faint)";

  return (
    <Box
      className={`energy-modal${solarActive ? " energy-modal--solar" : ""}${isClosing ? " energy-modal--closing" : ""}`}
      position="fixed"
      inset="0"
      zIndex={200}
      display="flex"
      alignItems="center"
      justifyContent="center"
      onClick={requestClose}
    >
      <Box
        className="energy-panel"
        borderRadius="3.5vmin"
        p="6vmin"
        minW="70vmin"
        maxW="90vmin"
        display="flex"
        flexDirection="column"
        alignItems="stretch"
        gap="4vmin"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <Box
          as="button"
          className="energy-close"
          aria-label="Close energy panel"
          onClick={requestClose}
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <IoClose />
        </Box>

        {/* Real-time */}
        <VStack gap="2.5vmin" align="stretch">
          <Text
            fontSize="2.2vmin"
            letterSpacing="0.16em"
            color="var(--theme-fg-faint)"
          >
            NOW
          </Text>

          {/* Solar — hero number */}
          <HStack gap="2vmin" align="baseline">
            <Box
              color={solarActive ? "yellow.400" : "var(--theme-fg-faint)"}
              fontSize="4.5vmin"
              lineHeight="1"
              flexShrink={0}
            >
              <PiSolarRoof />
            </Box>
            <Text
              fontSize="11vmin"
              fontWeight="300"
              letterSpacing="-0.04em"
              lineHeight="1"
              color={solarActive ? "yellow.300" : "var(--theme-fg-faint)"}
              style={
                solarActive
                  ? { textShadow: "0 0 4vmin rgba(251,191,36,0.5)" }
                  : undefined
              }
            >
              {fmtW(currentProduction)}
            </Text>
            <Text
              fontSize="2.2vmin"
              color="var(--theme-fg-faint)"
              letterSpacing="0.1em"
              pb="1vmin"
            >
              SOLAR
            </Text>
          </HStack>

          {/* Home consumption */}
          <HStack gap="2vmin" align="baseline">
            <Box
              fontSize="4.5vmin"
              lineHeight="1"
              color="var(--theme-fg-dim)"
              flexShrink={0}
            >
              <IoFlash />
            </Box>
            <Text
              fontSize="7.5vmin"
              fontWeight="300"
              letterSpacing="-0.03em"
              lineHeight="1"
            >
              {fmtW(currentConsumption)}
            </Text>
            <Text
              fontSize="2.2vmin"
              color="var(--theme-fg-faint)"
              letterSpacing="0.1em"
              pb="0.5vmin"
            >
              HOME
            </Text>
          </HStack>

          {/* Grid status */}
          {gridActive ? (
            <Box
              display="inline-flex"
              alignSelf="flex-start"
              alignItems="center"
              gap="1.5vmin"
              px="2.5vmin"
              py="1.2vmin"
              borderRadius="999px"
              border="1px solid"
              borderColor={
                isExporting ? "rgba(34,197,94,0.22)" : "rgba(249,115,22,0.22)"
              }
              bg={
                isExporting ? "rgba(34,197,94,0.07)" : "rgba(249,115,22,0.07)"
              }
            >
              <Text
                fontSize="3.8vmin"
                fontWeight="300"
                color={isExporting ? "green.400" : "orange.400"}
                letterSpacing="-0.01em"
              >
                {isExporting ? "↑" : "↓"} {fmtW(gridAbs)}
              </Text>
              <Text
                fontSize="2vmin"
                letterSpacing="0.12em"
                color={isExporting ? "green.700" : "orange.700"}
              >
                {isExporting ? "EXPORTING" : "IMPORTING"}
              </Text>
            </Box>
          ) : (
            <Text
              fontSize="2.8vmin"
              color="var(--theme-fg-faint)"
              letterSpacing="0.06em"
            >
              Grid idle
            </Text>
          )}
        </VStack>

        {/* Today summary */}
        <Box borderTop="1px solid var(--theme-divider)" pt="3.5vmin">
          <Text
            fontSize="2.2vmin"
            letterSpacing="0.16em"
            color="var(--theme-fg-faint)"
            mb="2vmin"
          >
            TODAY
          </Text>
          <Grid templateColumns="1fr 1fr 1fr" gap="2vmin">
            <VStack align="flex-start" gap="0.5vmin">
              <Text
                fontSize="5vmin"
                fontWeight="300"
                color="yellow.600"
                lineHeight="1"
              >
                {fmtKwh(productionToday)} kWh
              </Text>
              <Text
                fontSize="2vmin"
                letterSpacing="0.12em"
                color="var(--theme-fg-faint)"
              >
                PRODUCED
              </Text>
            </VStack>
            <VStack align="center" gap="0.5vmin">
              <Text
                fontSize="5vmin"
                fontWeight="400"
                color={pctColor}
                lineHeight="1"
              >
                {pct}%
              </Text>
              <Text
                fontSize="2vmin"
                letterSpacing="0.12em"
                color="var(--theme-fg-faint)"
              >
                SOLAR
              </Text>
            </VStack>
            <VStack align="flex-end" gap="0.5vmin">
              <Text
                fontSize="5vmin"
                fontWeight="300"
                color="var(--theme-fg-dim)"
                lineHeight="1"
              >
                {fmtKwh(consumptionToday)} kWh
              </Text>
              <Text
                fontSize="2vmin"
                letterSpacing="0.12em"
                color="var(--theme-fg-faint)"
              >
                USED
              </Text>
            </VStack>
          </Grid>
        </Box>
      </Box>
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
        color="var(--theme-fg-faint)"
        letterSpacing="0.14em"
        mb="1.5vmin"
      >
        3D PRINTER
      </Text>
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
    <Box width="100%">
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
    <Box
      width="100%"
      height="100%"
      bg="var(--theme-bg)"
      overflow="hidden"
      display="flex"
      flexDirection={isLandscape ? "row" : "column"}
      alignItems={isLandscape ? "flex-start" : "center"}
      justifyContent={isLandscape ? "flex-start" : "space-between"}
      p={isLandscape ? "8" : { base: "6", md: "16" }}
      gap={isLandscape ? "4vmin" : "0"}
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
            <Header internet={data.internet} weather={data.weather} />
            {printerActive && (
              <>
                <PrinterSection printer={data.printer} />
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
            <ClimateSection climate={data.climate} />
            <EnergySection energy={data.energy} />
            {hasCalendar && (
              <>
                <CalendarSection
                  today={data.calendar.today}
                  tomorrow={data.calendar.tomorrow}
                />
              </>
            )}
          </Box>
        </>
      ) : (
        <>
          <Header internet={data.internet} weather={data.weather} />
          {hasCalendar && (
            <>
              <CalendarSection
                today={data.calendar.today}
                tomorrow={data.calendar.tomorrow}
              />
            </>
          )}
          <ClimateSection climate={data.climate} />
          <EnergySection energy={data.energy} />
          {printerActive && (
            <>
              <PrinterSection printer={data.printer} />
            </>
          )}
        </>
      )}
    </Box>
  );
}
