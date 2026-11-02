import type { HomeForecastPeriod, HomeWeather } from "../hooks/useHomeData";
import { roundTemp } from "./forecast";

/**
 * What the forecast says is worth a heads-up: the same signals the user's
 * Home Assistant weather automations watch (built 2026-10-13: freeze, storm
 * approaching, rain starting soon, high winds, snow or ice, a rapid
 * temperature drop), read here from the forecast the page already has rather
 * than from an alerts feed — the NWS integration is disabled and WeatherKit
 * has no alerts.
 */
export interface WeatherAdvisory {
  key: string;
  /** Chakra's Alert status: `warning` for the ones that bite, `info` for rain. */
  status: "warning" | "info";
  title: string;
  detail: string;
}

const RAIN = new Set(["rainy", "pouring", "lightning-rainy"]);
const STORM = new Set(["lightning", "lightning-rainy"]);
const SNOW = new Set(["snowy", "snowy-rainy", "hail"]);

/** A rain chance that counts as rain on the way, %. */
const RAIN_SOON_FROM = 50;
/** A wind that counts as high, in the forecast's own unit (mph here). */
const WIND_FROM = 30;
/** A fall of this many degrees within DROP_HOURS hours. */
const DROP_DEGREES = 15;
const DROP_HOURS = 6;
/** Freezing, by the entity's unit. */
const FREEZE = { "°F": 32, "°C": 0 } as Record<string, number>;

const isNumber = (n: number | null | undefined): n is number => n != null;

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

/** "at 3 PM" today, "tomorrow 3 AM" after that. */
function atHour(iso: string, now: Date): string {
  const d = new Date(iso);
  const hour = d.toLocaleTimeString([], { hour: "numeric" });
  if (sameDay(d, now)) return `at ${hour}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(d, tomorrow)) return `tomorrow ${hour}`;
  return `${d.toLocaleDateString([], { weekday: "long" })} ${hour}`;
}

/** "tonight" for today's row, "Tuesday night" after that. */
function nightOf(iso: string, now: Date): string {
  const d = new Date(iso);
  if (sameDay(d, now)) return "tonight";
  return `${d.toLocaleDateString([], { weekday: "long" })} night`;
}

/** "today", "tomorrow", then the weekday. */
function dayOf(iso: string, now: Date): string {
  const d = new Date(iso);
  if (sameDay(d, now)) return "today";
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(d, tomorrow)) return "tomorrow";
  return d.toLocaleDateString([], { weekday: "long" });
}

function chance(period: HomeForecastPeriod): string | null {
  const p = period.precipitationProbability;
  return p == null ? null : `${Math.round(p)}% chance`;
}

export function weatherAdvisories(
  weather: HomeWeather,
  now = new Date(),
): WeatherAdvisory[] {
  const out: WeatherAdvisory[] = [];
  const hours = (
    weather.forecastHours.length ? weather.forecastHours : weather.forecast
  ).filter((h) => Date.parse(h.datetime) >= now.getTime() - 3600e3);
  const days = weather.forecastDaily;
  const freezing = FREEZE[weather.temperatureUnit ?? "°F"] ?? 32;

  // Freeze: the first of the next two nights whose low reaches freezing.
  const freeze = days
    .slice(0, 2)
    .find((d) => isNumber(d.templow) && d.templow <= freezing);
  if (freeze) {
    out.push({
      key: "freeze",
      status: "warning",
      title: `Freeze ${nightOf(freeze.datetime, now)}`,
      detail: `Low ${roundTemp(freeze.templow)}°`,
    });
  }

  // Storms: the first hour of lightning ahead.
  const storm = hours.find((h) => h.condition && STORM.has(h.condition));
  if (storm) {
    out.push({
      key: "storm",
      status: "warning",
      title: `Thunderstorms ${atHour(storm.datetime, now)}`,
      detail: chance(storm) ?? "In the hourly forecast",
    });
  }

  // Snow or ice: the first hour ahead, else the first of the next three days.
  const snowHour = hours.find((h) => h.condition && SNOW.has(h.condition));
  const snowDay = snowHour
    ? null
    : days.slice(0, 3).find((d) => d.condition && SNOW.has(d.condition));
  if (snowHour || snowDay) {
    const when = snowHour
      ? atHour(snowHour.datetime, now)
      : dayOf(snowDay!.datetime, now);
    const period = snowHour ?? snowDay!;
    out.push({
      key: "snow",
      status: "warning",
      title: `${period.condition === "snowy-rainy" ? "Sleet" : period.condition === "hail" ? "Hail" : "Snow"} ${when}`,
      detail: chance(period) ?? "In the forecast",
    });
  }

  // High winds: the windiest hour ahead, when it is windy enough.
  const windiest = hours.reduce<HomeForecastPeriod | null>(
    (best, h) =>
      isNumber(h.windSpeed) && h.windSpeed > (best?.windSpeed ?? -1) ? h : best,
    null,
  );
  if (windiest && isNumber(windiest.windSpeed) && windiest.windSpeed >= WIND_FROM) {
    out.push({
      key: "wind",
      status: "warning",
      title: `High winds ${atHour(windiest.datetime, now)}`,
      detail: `${Math.round(windiest.windSpeed)} ${weather.windSpeedUnit ?? "mph"}`,
    });
  }

  // A rapid temperature drop: DROP_DEGREES within DROP_HOURS hours.
  drop: for (let i = 0; i < hours.length; i++) {
    const from = hours[i].temperature;
    if (!isNumber(from)) continue;
    for (let j = i + 1; j < Math.min(hours.length, i + DROP_HOURS + 1); j++) {
      const to = hours[j].temperature;
      if (!isNumber(to)) continue;
      if (from - to >= DROP_DEGREES) {
        out.push({
          key: "drop",
          status: "warning",
          title: `Temperature drops ${Math.round(from - to)}° by ${atHour(hours[j].datetime, now).replace(/^at /, "")}`,
          detail: `${roundTemp(from)}° to ${roundTemp(to)}°`,
        });
        break drop;
      }
    }
  }

  // Rain starting: not raining now, and an hour ahead that likely is.
  if (!RAIN.has(weather.state)) {
    const rain = hours.find(
      (h) =>
        (h.precipitationProbability ?? 0) >= RAIN_SOON_FROM &&
        h.condition &&
        RAIN.has(h.condition),
    );
    if (rain) {
      out.push({
        key: "rain",
        status: "info",
        title: `Rain ${atHour(rain.datetime, now)}`,
        detail: chance(rain) ?? "In the hourly forecast",
      });
    }
  }

  return out;
}
