import { Stack } from "@chakra-ui/react";
import { IoCloudOfflineOutline } from "react-icons/io5";
import type { HomeWeather } from "../hooks/useHomeData";
import { DailyForecast } from "./DailyForecast";
import { HourlyChart } from "./HourlyChart";
import { HourlyForecast } from "./HourlyForecast";
import { PanelDialog } from "./PanelDialog";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { WeatherNowCard } from "./WeatherNowCard";
import { EmptyState } from "./ui/empty-state";

/**
 * The weather, opened by a tap on /home's weather card (the frame's time and
 * weather, the phone's weather row, the desktop's Weather card) — a sheet from
 * the bottom on a phone and the frame, a drawer from the right edge on a
 * desktop (PanelDialog, 0.150.0).
 * Back since 0.136 (ForecastDialog until 0.97, when the tap went to /weather;
 * the user: the page "feels out of place now with the drawers"), built from
 * the Weather page's parts: the weather now (WeatherNowCard — the hero, the
 * forecast's advisories, the conditions), the next 24 hours as the chart over
 * the strip, and the days ahead. A list the forecast entity didn't answer
 * with is left out; with neither, it says so. The Radar stays the page's.
 */
export function WeatherDialog({
  weather,
  open,
  onClose,
}: {
  weather?: HomeWeather | null;
  open: boolean;
  onClose: () => void;
}) {
  const hours = weather?.forecastHours ?? [];
  const days = weather?.forecastDaily ?? [];

  return (
    <PanelDialog
      open={open && weather != null}
      onClose={onClose}
      title="Weather"
    >
      {weather && (
        <>
          <WeatherNowCard weather={weather} />

          {hours.length > 0 && (
            <Stack gap="3">
              <SectionTitle>Next hours</SectionTitle>
              <HourlyChart hours={hours} height="7rem" />
              <HourlyForecast hours={hours} scroll />
            </Stack>
          )}

          {days.length > 0 && (
            <Stack gap="3">
              <SectionTitle>
                {days.length > 1 ? `${days.length}-day forecast` : "Today"}
              </SectionTitle>
              <DailyForecast days={days} current={weather.temperature} />
            </Stack>
          )}

          {hours.length === 0 && days.length === 0 && (
            <EmptyState
              icon={<IoCloudOfflineOutline />}
              title="No forecast"
              description="Home Assistant's forecast didn't answer."
            />
          )}
        </>
      )}
    </PanelDialog>
  );
}
