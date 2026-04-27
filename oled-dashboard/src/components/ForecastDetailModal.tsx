import { useEffect, useRef, useState } from "react";
import { Box, Text, HStack, VStack, Grid } from "@chakra-ui/react";
import { IoClose } from "react-icons/io5";
import {
  WiDaySunny,
  WiNightClear,
  WiDayCloudy,
  WiNightAltPartlyCloudy,
  WiCloudy,
  WiFog,
  WiHail,
  WiLightning,
  WiThunderstorm,
  WiNightAltThunderstorm,
  WiRain,
  WiShowers,
  WiNightAltShowers,
  WiSnow,
  WiNightAltSnow,
  WiRainMix,
  WiStrongWind,
  WiNa,
} from "react-icons/wi";
import type { HomeForecastPeriod } from "../hooks/useHomeData";

const FORECAST_EXIT_MS = 260;

type IconComponent = React.ComponentType<{
  size?: string | number;
  color?: string;
}>;

const DAY_ICONS: Record<string, IconComponent> = {
  sunny: WiDaySunny,
  "clear-night": WiNightClear,
  partlycloudy: WiDayCloudy,
  cloudy: WiCloudy,
  fog: WiFog,
  hail: WiHail,
  lightning: WiLightning,
  "lightning-rainy": WiThunderstorm,
  pouring: WiRain,
  rainy: WiShowers,
  snowy: WiSnow,
  "snowy-rainy": WiRainMix,
  windy: WiStrongWind,
  "windy-variant": WiStrongWind,
  exceptional: WiNa,
};

const NIGHT_ICONS: Record<string, IconComponent> = {
  ...DAY_ICONS,
  sunny: WiNightClear,
  partlycloudy: WiNightAltPartlyCloudy,
  "lightning-rainy": WiNightAltThunderstorm,
  rainy: WiNightAltShowers,
  snowy: WiNightAltSnow,
};

function isNight(datetime: string) {
  const h = new Date(datetime).getHours();
  return h >= 20 || h < 6;
}

function getIcon(condition: string, datetime: string): IconComponent {
  const map = isNight(datetime) ? NIGHT_ICONS : DAY_ICONS;
  return map[condition] ?? WiNa;
}

function formatConditionLabel(condition: string | null) {
  if (!condition) return "Unknown";
  return condition
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(" ");
}

function formatFullTime(datetime: string) {
  const d = new Date(datetime);
  const day = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${time}`;
}

function bearingToCardinal(deg: number) {
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return dirs[Math.round(((deg % 360) / 22.5)) % 16];
}

interface Props {
  period: HomeForecastPeriod;
  onClose: () => void;
}

export function ForecastDetailModal({ period, onClose }: Props) {
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  function requestClose() {
    if (isClosing) return;
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, FORECAST_EXIT_MS);
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

  const Icon = getIcon(period.condition ?? "", period.datetime);

  return (
    <Box
      className={`energy-modal${isClosing ? " energy-modal--closing" : ""}`}
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
        gap="3.5vmin"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <Box
          as="button"
          className="energy-close"
          aria-label="Close forecast detail"
          onClick={requestClose}
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <IoClose />
        </Box>

        <VStack gap="1vmin" align="stretch">
          <Text
            fontSize="2.2vmin"
            letterSpacing="0.16em"
            color="var(--theme-fg-faint)"
          >
            FORECAST
          </Text>
          <Text fontSize="3vmin" color="var(--theme-fg-dim)">
            {formatFullTime(period.datetime)}
          </Text>
        </VStack>

        <HStack gap="3vmin" align="center">
          <Box
            color="var(--theme-fg-dim)"
            fontSize="14vmin"
            lineHeight="1"
            flexShrink={0}
          >
            <Icon size="1em" />
          </Box>
          <VStack align="flex-start" gap="0.5vmin">
            <Text
              fontSize="11vmin"
              fontWeight="300"
              letterSpacing="-0.04em"
              lineHeight="1"
            >
              {period.temperature != null
                ? `${Math.round(period.temperature)}°`
                : "—"}
            </Text>
            <Text
              fontSize="2.6vmin"
              color="var(--theme-fg-faint)"
              letterSpacing="0.06em"
            >
              {formatConditionLabel(period.condition)}
            </Text>
          </VStack>
        </HStack>

        <Box borderTop="1px solid var(--theme-divider)" pt="3vmin">
          <Grid templateColumns="1fr 1fr" gap="2.5vmin">
            <DetailRow
              label="LOW"
              value={
                period.templow != null ? `${Math.round(period.templow)}°` : "—"
              }
            />
            <DetailRow
              label="PRECIP CHANCE"
              value={
                period.precipitationProbability != null
                  ? `${period.precipitationProbability}%`
                  : "—"
              }
              accent={
                (period.precipitationProbability ?? 0) > 0
                  ? "blue.400"
                  : undefined
              }
            />
            <DetailRow
              label="PRECIP AMOUNT"
              value={
                period.precipitation != null
                  ? `${period.precipitation} mm`
                  : "—"
              }
            />
            <DetailRow
              label="WIND"
              value={
                period.windSpeed != null
                  ? `${Math.round(period.windSpeed)}${
                      period.windBearing != null
                        ? ` ${bearingToCardinal(period.windBearing)}`
                        : ""
                    }`
                  : "—"
              }
            />
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}

function DetailRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <VStack align="flex-start" gap="0.4vmin">
      <Text
        fontSize="1.8vmin"
        letterSpacing="0.14em"
        color="var(--theme-fg-faint)"
      >
        {label}
      </Text>
      <Text
        fontSize="4.2vmin"
        fontWeight="300"
        lineHeight="1"
        color={accent ?? "var(--theme-fg-dim)"}
      >
        {value}
      </Text>
    </VStack>
  );
}
