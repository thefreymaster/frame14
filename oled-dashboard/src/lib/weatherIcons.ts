import { createElement, type ComponentType, type ReactElement } from "react";
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

export type WeatherIcon = ComponentType<{
  size?: string | number;
  color?: string;
}>;

const DAY_ICONS: Record<string, WeatherIcon> = {
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

const NIGHT_ICONS: Record<string, WeatherIcon> = {
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

/**
 * The HA weather condition's icon, with the night variant after 8pm. Returned
 * as an element so callers don't pick a component during render.
 */
export function weatherIcon(condition: string, datetime: string): ReactElement {
  const map = isNight(datetime) ? NIGHT_ICONS : DAY_ICONS;
  return createElement(map[condition] ?? WiNa);
}
