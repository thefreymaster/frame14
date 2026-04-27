import { useState } from "react";
import { Box, Text } from "@chakra-ui/react";
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
      <Box
        width="100%"
        position="relative"
        display="grid"
        gridTemplateColumns={`repeat(${cols}, 1fr)`}
        gridTemplateRows="auto auto auto auto"
        rowGap="1vmin"
        alignItems="center"
        justifyItems="center"
      >
        {Array.from({ length: cols - 1 }, (_, i) => (
          <Box
            key={`divider-${i}`}
            position="absolute"
            top="0"
            bottom="0"
            left={`${((i + 1) * 100) / cols}%`}
            width="1px"
            bg="var(--theme-fg-dim)"
            opacity={0.2}
            pointerEvents="none"
          />
        ))}
        {periods.map((period, i) => (
          <Text
            key={`hour-${i}`}
            gridRow={1}
            fontSize="2.8vmin"
            color="var(--theme-fg-dim)"
            letterSpacing="0.05em"
            textAlign="center"
          >
            {formatHour(period.datetime)}
          </Text>
        ))}
        {periods.map((period, i) => (
          <Box
            key={`icon-${i}`}
            gridRow={2}
            fontSize="7vmin"
            lineHeight="1"
            color="var(--theme-fg-dim)"
          >
            {(() => {
              const Icon = getIcon(period.condition ?? "", period.datetime);
              return <Icon size="1em" />;
            })()}
          </Box>
        ))}
        {periods.map((period, i) => (
          <Text
            key={`temp-${i}`}
            gridRow={3}
            fontSize="4.5vmin"
            color="var(--theme-fg-dim)"
            fontWeight="300"
            textAlign="center"
            opacity={i === 0 ? 1 : 0.65}
          >
            {period.temperature != null
              ? `${Math.round(period.temperature)}°`
              : "—"}
          </Text>
        ))}
        {periods.map((period, i) =>
          period.precipitationProbability != null &&
          period.precipitationProbability > 0 ? (
            <Text
              key={`precip-${i}`}
              gridRow={4}
              fontSize="2.8vmin"
              color="blue.400"
              textAlign="center"
              opacity={i === 0 ? 1 : 0.65}
            >
              {period.precipitationProbability}%
            </Text>
          ) : null,
        )}
        {periods.map((_, i) => (
          <Box
            key={`hit-${i}`}
            as="button"
            aria-label={`Show forecast detail for ${formatHour(periods[i].datetime)}`}
            position="absolute"
            top="0"
            bottom="0"
            left={`${(i * 100) / cols}%`}
            width={`${100 / cols}%`}
            bg="transparent"
            border="none"
            cursor="pointer"
            zIndex={1}
            onClick={() => setSelectedIndex(i)}
            style={{ WebkitTapHighlightColor: "transparent" }}
          />
        ))}
      </Box>
    </>
  );
}
