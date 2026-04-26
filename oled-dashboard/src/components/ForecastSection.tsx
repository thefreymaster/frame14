import { Box } from "@chakra-ui/react";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { WeatherForecast } from "./WeatherForecast";
import type { HomeForecastPeriod } from "../hooks/useHomeData";

interface Props {
  forecast: HomeForecastPeriod[];
  count?: number;
}

export function ForecastSection({ forecast, count = 6 }: Props) {
  if (!forecast.length) return null;
  return (
    <Box width="100%" mt="2vmin">
      <SectionTitle>FORECAST</SectionTitle>
      <WeatherForecast forecast={forecast} count={count} />
    </Box>
  );
}

export function getTodayHighLow(forecast: HomeForecastPeriod[]): {
  high: number | null;
  low: number | null;
} {
  const today = new Date().toDateString();
  const todays = forecast.filter(
    (p) => new Date(p.datetime).toDateString() === today,
  );
  if (!todays.length) return { high: null, low: null };
  const highs = todays
    .map((p) => p.temperature)
    .filter((t): t is number => t != null);
  const lows = todays
    .map((p) => p.templow ?? p.temperature)
    .filter((t): t is number => t != null);
  return {
    high: highs.length ? Math.max(...highs) : null,
    low: lows.length ? Math.min(...lows) : null,
  };
}
