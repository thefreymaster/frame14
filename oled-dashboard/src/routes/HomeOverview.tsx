import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { callClimateService, type HvacMode } from "../lib/callService";
import {
  Box,
  Text,
  HStack,
  VStack,
  Grid,
  GridItem,
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
import { Divider } from "../components/Divider";
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
  if (watts >= 1000) return `${(watts / 1000).toFixed(1)} kW`;
  return `${Math.round(watts)} W`;
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

function normalizeClimateMode(mode: string | null | undefined): ClimateVisualMode {
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
      {/* Date line */}
      <HStack align="baseline" gap="2vmin" mb="0.8vmin">
        <Text fontSize="3.8vmin" fontWeight="400" letterSpacing="0.02em">
          {day}, {month} {date}
        </Text>
        <Spacer />
      </HStack>

      <HStack width="100%" align="start" justify="space-between">
        {/* Time */}
        <Text
          fontSize="17vmin"
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

        {/* Weather — right of time */}
        {weather && (
          <VStack align="flex-end" gap="0.5vmin" pb="0.5vmin">
            <HStack align="start" gap="1.5vmin">
              {weather.temperature != null && (
                <Text
                  fontSize="14vmin"
                  fontWeight="300"
                  letterSpacing="-0.03em"
                  lineHeight="1"
                >
                  <NumberFlow value={Math.round(weather.temperature)} />°
                </Text>
              )}
            </HStack>
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
          </VStack>
        )}
      </HStack>

      {weather && weather.forecast.length > 0 && (
        <Box width="100%" mt="2vmin">
          <Divider mb="2vmin" />
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
  const displayedTemp = isOff ? currentTemp ?? previousTarget ?? temp : temp;
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
              <Box
                key={index}
                as="span"
                className="thermostat-particle"
              />
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
              key === "heat" ? IoFlame : key === "cool" ? IoSnow : IoPowerOutline;

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
      <Text
        fontSize="2.6vmin"
        color="var(--theme-fg-faint)"
        letterSpacing="0.14em"
        mb="1.5vmin"
      >
        CLIMATE
      </Text>
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
        <Text
          fontSize="2.6vmin"
          color="var(--theme-fg-faint)"
          letterSpacing="0.14em"
          mb="1.5vmin"
        >
          ENERGY
        </Text>
        <VStack width="100%" align="stretch" gap="0.4vmin">
          {/* Today totals */}
          <VStack align="flex-start" gap="0.4vmin" width="100%">
            <Grid
              templateColumns="repeat(12, 1fr)"
              gap="1.5vmin"
              alignItems="center"
              width="100%"
            >
              <GridItem colSpan={4}>
                <HStack gap="1.5vmin" align="center">
                  <Box
                    fontSize="3.5vmin"
                    lineHeight="1"
                    color="yellow.500"
                    flexShrink={0}
                  >
                    <PiSolarRoof size="1.4em" />
                  </Box>
                  <Text
                    fontSize="5.5vmin"
                    color="yellow.600"
                    fontWeight="300"
                    lineHeight="1"
                    whiteSpace="nowrap"
                  >
                    {fmtKwh(productionToday)} kWh
                  </Text>
                </HStack>
              </GridItem>
              <GridItem colSpan={4}>
                <HStack gap="1.5vmin" align="center">
                  <Box fontSize="3.5vmin" lineHeight="1" flexShrink={0}>
                    <IoFlash size="1em" />
                  </Box>
                  <Text
                    fontSize="5.5vmin"
                    fontWeight="300"
                    lineHeight="1"
                    whiteSpace="nowrap"
                  >
                    {fmtKwh(consumptionToday)} kWh
                  </Text>
                </HStack>
              </GridItem>
              <GridItem colSpan={4} justifySelf="flex-end">
                <Text fontSize="5.5vmin" color={pctColor} fontWeight="400">
                  {Math.round(pct)}%
                </Text>
              </GridItem>
            </Grid>
          </VStack>

          {/* Real-time power */}
          {/* <VStack align="flex-start" gap="0.4vmin" width="100%">
          <Text
            fontSize="2.6vmin"
            color="var(--theme-fg-faint)"
            letterSpacing="0.1em"
          >
            NOW
          </Text>
          <Grid
            templateColumns="repeat(12, 1fr)"
            gap="1.5vmin"
            alignItems="center"
            width="100%"
          >
            <GridItem colSpan={4}>
              <HStack gap="1.5vmin" align="center">
                <Box
                  fontSize="3.5vmin"
                  lineHeight="1"
                  color="yellow.600"
                  flexShrink={0}
                >
                  <LuMoveDown size="1em" />
                </Box>
                <Text
                  fontSize="5.5vmin"
                  color="yellow.600"
                  fontWeight="300"
                  lineHeight="1"
                  whiteSpace="nowrap"
                >
                  {fmtKw(currentProduction)} kW
                </Text>
              </HStack>
            </GridItem>
            <GridItem colSpan={4}>
              <HStack gap="1.5vmin" align="center">
                <Box
                  fontSize="3.5vmin"
                  lineHeight="1"
                  
                  flexShrink={0}
                >
                  <LuMoveUp size="1em" />
                </Box>
                <Text
                  fontSize="5.5vmin"
                  
                  fontWeight="300"
                  lineHeight="1"
                  whiteSpace="nowrap"
                >
                  {fmtKw(currentConsumption)} kW
                </Text>
              </HStack>
            </GridItem>
          </Grid>
        </VStack> */}
        </VStack>
      </Box>
    </>
  );
}

// ── Energy Modal ──────────────────────────────────────────────────────────────

function FlowDots({
  x1,
  y1,
  x2,
  y2,
  active,
  color,
  numDots = 4,
  duration = 1.6,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  active: boolean;
  color: string;
  numDots?: number;
  duration?: number;
}) {
  const pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}
        strokeWidth="1.5"
        strokeDasharray="3 6"
      />
      {active &&
        Array.from({ length: numDots }, (_, i) => (
          <circle key={i} r="3" fill={color} opacity="0.85">
            <animateMotion
              dur={`${duration}s`}
              begin={`${-(i / numDots) * duration}s`}
              repeatCount="indefinite"
              path={pathD}
            />
          </circle>
        ))}
    </g>
  );
}

function EnergyModal({
  energy,
  onClose,
}: {
  energy: HomeEnergy;
  onClose: () => void;
}) {
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
    pct >= 100 ? "#22c55e" : pct >= 50 ? "#eab308" : "rgba(255,255,255,0.3)";

  // SVG layout — icons left of center, labels right
  const W = 250,
    H = 330;
  const IX = 95; // icon center X
  const LX = 148; // label left X

  const SC = { x: IX, y: 68 }; // solar
  const HC = { x: IX, y: 182 }; // house
  const GC = { x: IX, y: 290 }; // grid

  const solarBottomY = SC.y + 25;
  const houseTipY = HC.y - 50;
  const houseBottomY = HC.y + 30;
  const gridTopY = GC.y - 22;

  return (
    <Box
      position="fixed"
      inset="0"
      bg="rgba(0,0,0,0.93)"
      zIndex={200}
      display="flex"
      alignItems="center"
      justifyContent="center"
      onClick={onClose}
    >
      <Box
        bg="#0d0d0d"
        p="5vmin"
        borderRadius="3vmin"
        minW="62vmin"
        maxW="86vmin"
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap="3vmin"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <Text
          fontSize="3.8vmin"
          fontWeight="400"
          color="var(--theme-fg-dim)"
          letterSpacing="0.1em"
        >
          ENERGY
        </Text>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "50vmin", height: "66vmin" }}
        >
          {/* ── Flow lines ── */}
          <FlowDots
            x1={SC.x}
            y1={solarBottomY}
            x2={HC.x}
            y2={houseTipY}
            active={solarActive}
            color="#fbbf24"
            duration={1.3}
          />
          <FlowDots
            x1={isExporting ? HC.x : GC.x}
            y1={isExporting ? houseBottomY : gridTopY}
            x2={isExporting ? GC.x : HC.x}
            y2={isExporting ? gridTopY : houseBottomY}
            active={gridActive}
            color={isExporting ? "#22c55e" : "#f97316"}
            duration={1.8}
          />

          {/* ── Sun ── */}
          <circle cx={SC.x} cy={SC.y - 34} r="7" fill="#fbbf24" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const r = (deg * Math.PI) / 180;
            return (
              <line
                key={deg}
                x1={SC.x + Math.cos(r) * 10}
                y1={SC.y - 34 + Math.sin(r) * 10}
                x2={SC.x + Math.cos(r) * 14}
                y2={SC.y - 34 + Math.sin(r) * 14}
                stroke="#fbbf24"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            );
          })}

          {/* ── Solar panel ── */}
          <rect
            x={SC.x - 27}
            y={SC.y - 18}
            width="54"
            height="37"
            rx="2"
            fill="rgba(59,130,246,0.18)"
            stroke="#60a5fa"
            strokeWidth="1.5"
          />
          <line
            x1={SC.x - 9}
            y1={SC.y - 18}
            x2={SC.x - 9}
            y2={SC.y + 19}
            stroke="#60a5fa"
            strokeWidth="0.6"
            opacity="0.5"
          />
          <line
            x1={SC.x + 9}
            y1={SC.y - 18}
            x2={SC.x + 9}
            y2={SC.y + 19}
            stroke="#60a5fa"
            strokeWidth="0.6"
            opacity="0.5"
          />
          <line
            x1={SC.x - 27}
            y1={SC.y + 1}
            x2={SC.x + 27}
            y2={SC.y + 1}
            stroke="#60a5fa"
            strokeWidth="0.6"
            opacity="0.5"
          />

          {/* Solar labels */}
          <text
            x={LX}
            y={SC.y - 5}
            fill={solarActive ? "#fbbf24" : "rgba(255,255,255,0.4)"}
            fontSize="13"
            fontWeight="600"
            fontFamily="Inter,sans-serif"
          >
            {fmtW(currentProduction)}
          </text>
          <text
            x={LX}
            y={SC.y + 10}
            fill="rgba(255,255,255,0.3)"
            fontSize="9.5"
            fontFamily="Inter,sans-serif"
          >
            SOLAR
          </text>

          {/* ── House ── */}
          {/* roof */}
          <polygon
            points={`${HC.x},${HC.y - 50} ${HC.x - 33},${HC.y - 18} ${HC.x + 33},${HC.y - 18}`}
            fill="rgba(255,255,255,0.07)"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* body */}
          <rect
            x={HC.x - 29}
            y={HC.y - 18}
            width="58"
            height="48"
            fill="rgba(255,255,255,0.04)"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="1.5"
          />
          {/* door */}
          <rect
            x={HC.x - 10}
            y={HC.y + 5}
            width="20"
            height="25"
            fill="rgba(255,255,255,0.08)"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1"
            rx="1"
          />
          {/* windows */}
          <rect
            x={HC.x - 27}
            y={HC.y - 9}
            width="14"
            height="12"
            fill="rgba(251,191,36,0.12)"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1"
          />
          <rect
            x={HC.x + 13}
            y={HC.y - 9}
            width="14"
            height="12"
            fill="rgba(251,191,36,0.12)"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1"
          />

          {/* House labels */}
          <text
            x={LX}
            y={HC.y - 5}
            fill="rgba(255,255,255,0.85)"
            fontSize="13"
            fontWeight="600"
            fontFamily="Inter,sans-serif"
          >
            {fmtW(currentConsumption)}
          </text>
          <text
            x={LX}
            y={HC.y + 10}
            fill="rgba(255,255,255,0.3)"
            fontSize="9.5"
            fontFamily="Inter,sans-serif"
          >
            HOME
          </text>

          {/* ── Power tower (grid) ── */}
          <line
            x1={GC.x}
            y1={GC.y - 22}
            x2={GC.x}
            y2={GC.y + 20}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
          />
          <line
            x1={GC.x - 22}
            y1={GC.y - 14}
            x2={GC.x + 22}
            y2={GC.y - 14}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
          />
          <line
            x1={GC.x - 16}
            y1={GC.y - 4}
            x2={GC.x + 16}
            y2={GC.y - 4}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
          />
          <line
            x1={GC.x - 8}
            y1={GC.y + 20}
            x2={GC.x + 8}
            y2={GC.y + 20}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1.2"
          />
          {[-22, -12, 12, 22].map((off) => (
            <circle
              key={off}
              cx={GC.x + off}
              cy={GC.y - 14}
              r="2"
              fill="rgba(255,255,255,0.2)"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="0.5"
            />
          ))}
          <line
            x1={GC.x - 36}
            y1={GC.y - 14}
            x2={GC.x - 22}
            y2={GC.y - 14}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
          />
          <line
            x1={GC.x + 22}
            y1={GC.y - 14}
            x2={GC.x + 36}
            y2={GC.y - 14}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
          />

          {/* Grid labels */}
          <text
            x={LX}
            y={GC.y - 5}
            fill={
              gridActive
                ? isExporting
                  ? "#22c55e"
                  : "#f97316"
                : "rgba(255,255,255,0.25)"
            }
            fontSize="13"
            fontWeight="600"
            fontFamily="Inter,sans-serif"
          >
            {gridActive ? fmtW(gridAbs) : "—"}
          </text>
          <text
            x={LX}
            y={GC.y + 10}
            fill="rgba(255,255,255,0.3)"
            fontSize="9.5"
            fontFamily="Inter,sans-serif"
          >
            {!gridActive ? "GRID" : isExporting ? "EXPORTING" : "IMPORTING"}
          </text>
        </svg>

        {/* Today summary */}
        <HStack justify="space-between" width="100%" px="1vmin">
          <Text fontSize="2.8vmin" color="yellow.600" fontWeight="300">
            {fmtKwh(productionToday)} kWh
          </Text>
          <Text fontSize="2.8vmin" fontWeight="600" color={pctColor}>
            {pct}% solar
          </Text>
          <Text fontSize="2.8vmin" color="var(--theme-fg-dim)" fontWeight="300">
            {fmtKwh(consumptionToday)} kWh
          </Text>
        </HStack>
        <HStack justify="space-between" width="100%" px="1vmin">
          <Text
            fontSize="2.2vmin"
            color="var(--theme-fg-faint)"
            letterSpacing="0.08em"
          >
            PRODUCED
          </Text>
          <Text
            fontSize="2.2vmin"
            color="var(--theme-fg-faint)"
            letterSpacing="0.08em"
          >
            TODAY
          </Text>
          <Text
            fontSize="2.2vmin"
            color="var(--theme-fg-faint)"
            letterSpacing="0.08em"
          >
            USED
          </Text>
        </HStack>

        <Box
          as="button"
          px="6vmin"
          py="2vmin"
          fontSize="3vmin"
          color="var(--theme-fg-faint)"
          letterSpacing="0.1em"
          cursor="pointer"
          onClick={onClose}
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          DONE
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
          <Text
            fontSize="2.6vmin"
            color="var(--theme-fg-faint)"
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
            color="var(--theme-fg-faint)"
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
                <Divider />
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
            <Divider />
            <EnergySection energy={data.energy} />
            {hasCalendar && (
              <>
                <Divider />
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
