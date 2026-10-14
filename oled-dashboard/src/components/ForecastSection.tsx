import { HStack, Text } from "@chakra-ui/react";
import { IoPartlySunnyOutline } from "react-icons/io5";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { WeatherForecast } from "./WeatherForecast";
import { Board } from "./Board";
import type { HomeForecastPeriod } from "../hooks/useHomeData";

interface Props {
  forecast: HomeForecastPeriod[];
  count?: number;
  span?: 1 | 2;
}

export function ForecastSection({ forecast, count = 6, span }: Props) {
  if (!forecast.length) return null;
  const { high, low } = getTodayHighLow(forecast);
  return (
    <Board
      span={span}
      collapsible
      storageKey="forecast"
      title={
        <HStack justify="space-between" width="100%" gap="3">
          <SectionTitle icon={<IoPartlySunnyOutline />}>Forecast</SectionTitle>
          {(high != null || low != null) && (
            <Text textStyle="sm" color="fg.muted">
              {high != null && `H ${Math.round(high)}°`}
              {high != null && low != null && "  "}
              {low != null && `L ${Math.round(low)}°`}
            </Text>
          )}
        </HStack>
      }
    >
      <WeatherForecast forecast={forecast} count={count} />
    </Board>
  );
}

function getTodayHighLow(forecast: HomeForecastPeriod[]): {
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
