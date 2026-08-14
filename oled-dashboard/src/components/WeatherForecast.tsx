import { useState } from "react";
import { Box, Text, VStack } from "@chakra-ui/react";
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
import { ForecastDetailModal } from "./ForecastDetailModal";
import { CHIP_GAP, CHIP_PADDING_Y, CHIP_RADIUS } from "../lib/surfaces";

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

function formatHour(datetime: string) {
  const d = new Date(datetime);
  const h = d.getHours();
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

interface Props {
  forecast: HomeForecastPeriod[];
  count?: number;
}

export function WeatherForecast({ forecast, count = 5 }: Props) {
  const periods = forecast.slice(0, count);
  const cols = periods.length;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selected = selectedIndex != null ? periods[selectedIndex] : null;

  return (
    <>
      {selected && (
        <ForecastDetailModal
          period={selected}
          onClose={() => setSelectedIndex(null)}
        />
      )}
      {/* Each period is its own chip: the surface replaces the divider rules,
          and the soonest period can carry state instead of looking identical
          to the other five. */}
      <Box
        width="100%"
        display="grid"
        gridTemplateColumns={`repeat(${cols}, 1fr)`}
        gap={CHIP_GAP}
        alignItems="stretch"
      >
        {periods.map((period, i) => {
          const Icon = getIcon(period.condition ?? "", period.datetime);
          const soonest = i === 0;
          const precip = period.precipitationProbability;
          return (
            <VStack
              key={period.datetime ?? i}
              as="button"
              aria-label={`Show forecast detail for ${formatHour(period.datetime)}`}
              onClick={() => setSelectedIndex(i)}
              gap="1vmin"
              minW="0"
              bg={
                soonest
                  ? "var(--theme-surface-2-on)"
                  : "var(--theme-surface-2)"
              }
              borderRadius={CHIP_RADIUS}
              px="0.6vmin"
              py={CHIP_PADDING_Y}
              cursor="pointer"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <Text
                fontSize="2.4vmin"
                color={
                  soonest ? "var(--theme-fg-dim)" : "var(--theme-fg-faint)"
                }
                letterSpacing="0.05em"
              >
                {formatHour(period.datetime)}
              </Text>
              <Box
                fontSize="6vmin"
                lineHeight="1"
                color="var(--theme-fg-dim)"
              >
                <Icon size="1em" />
              </Box>
              <Text fontSize="3.6vmin" fontWeight="300">
                {period.temperature != null
                  ? `${Math.round(period.temperature)}°`
                  : "—"}
              </Text>
              {/* Always rendered so temps stay on one baseline across chips. */}
              <Text
                fontSize="2.2vmin"
                color="blue.400"
                opacity={precip != null && precip > 0 ? 1 : 0}
              >
                {precip != null && precip > 0 ? `${precip}%` : " "}
              </Text>
            </VStack>
          );
        })}
      </Box>
    </>
  );
}
