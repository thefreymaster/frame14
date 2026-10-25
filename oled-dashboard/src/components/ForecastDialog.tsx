import { Stack } from "@chakra-ui/react";
import { IoCloudOfflineOutline } from "react-icons/io5";
import type { HomeWeather } from "../hooks/useHomeData";
import { DailyForecast } from "./DailyForecast";
import { HourlyForecast } from "./HourlyForecast";
import { PanelDialog } from "./PanelDialog";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { WeatherHero } from "./WeatherHero";
import { EmptyState } from "./ui/empty-state";

/**
 * The forecast, opened by a tap on /home's weather card (the frame's time and
 * weather, the phone's weather row, the desktop's Weather card): the weather
 * now with today's high and low (WeatherHero), the next hours and the days
 * ahead. A list the forecast entity didn't answer with is left out; with
 * neither, it says so. /weather is the page of it.
 */
export function ForecastDialog({
  weather,
  open,
  onClose,
}: {
  weather?: HomeWeather | null;
  open: boolean;
  onClose: () => void;
}) {
  const hours = weather?.forecast ?? [];
  const days = weather?.forecastDaily ?? [];

  return (
    <PanelDialog
      open={open && weather != null}
      onClose={onClose}
      title="Forecast"
    >
      {weather && (
        <>
          <WeatherHero weather={weather} />

          {hours.length > 0 && (
            <Stack gap="3">
              <SectionTitle>Next hours</SectionTitle>
              <HourlyForecast hours={hours} />
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
