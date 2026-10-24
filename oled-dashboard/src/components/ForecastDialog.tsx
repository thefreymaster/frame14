import { Box, HStack, Spacer, Stack, Text, VStack } from "@chakra-ui/react";
import { IoCloudOfflineOutline } from "react-icons/io5";
import type { HomeWeather } from "../hooks/useHomeData";
import { roundTemp } from "../lib/forecast";
import { conditionLabel, weatherIcon } from "../lib/weatherIcons";
import { DailyForecast } from "./DailyForecast";
import { HourlyForecast } from "./HourlyForecast";
import { PanelDialog } from "./PanelDialog";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { EmptyState } from "./ui/empty-state";

/**
 * The forecast, opened by a tap on /home's weather card (the frame's time and
 * weather, the phone's weather row, the desktop's Weather card): the weather
 * now with today's high and low, the next hours and the days ahead. A list
 * the forecast entity didn't answer with is left out; with neither, it says
 * so.
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
  const now = new Date();
  const hours = weather?.forecast ?? [];
  const days = weather?.forecastDaily ?? [];
  const today = days[0];
  const current = roundTemp(weather?.temperature);

  return (
    <PanelDialog
      open={open && weather != null}
      onClose={onClose}
      title="Forecast"
    >
      {weather && (
        <>
          <HStack gap="4" align="center" minW="0">
            <Box fontSize="5rem" lineHeight="1" flexShrink={0} aria-hidden>
              {weatherIcon(weather.state, now.toISOString())}
            </Box>
            {current != null && (
              <Text
                textStyle="6xl"
                fontWeight="semibold"
                lineHeight="1"
                whiteSpace="nowrap"
              >
                {current}°
              </Text>
            )}
            <Spacer />
            <VStack align="end" gap="0.5" minW="0" textAlign="end">
              <Text textStyle="xl" fontWeight="medium" truncate maxW="100%">
                {conditionLabel(weather.state)}
              </Text>
              {today?.temperature != null && today.templow != null && (
                <Text color="fg.muted" whiteSpace="nowrap">
                  H {roundTemp(today.temperature)}° · L{" "}
                  {roundTemp(today.templow)}°
                </Text>
              )}
            </VStack>
          </HStack>

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
