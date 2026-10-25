import { SimpleGrid, Stack, Stat } from "@chakra-ui/react";
import type { HomeWeather } from "../hooks/useHomeData";
import { compassPoint, roundTemp } from "../lib/forecast";
import { weatherAdvisories } from "../lib/weatherAdvisories";
import { WeatherAdvisories } from "./WeatherAdvisories";
import { WeatherHero } from "./WeatherHero";

/**
 * /weather's Now card: the WeatherHero, the forecast's advisories, then the
 * conditions the entity reports as small Stats — feels like (when it differs
 * from the reading), humidity, wind with its compass point, pressure,
 * visibility and the UV index; a figure the entity doesn't report is left
 * out.
 */
export function WeatherNowCard({ weather }: { weather: HomeWeather }) {
  const current = roundTemp(weather.temperature);
  const feels = roundTemp(weather.apparentTemperature);
  const details: { label: string; value: string }[] = [];
  if (feels != null && feels !== current) {
    details.push({ label: "Feels like", value: `${feels}°` });
  }
  if (weather.humidity != null) {
    details.push({
      label: "Humidity",
      value: `${Math.round(weather.humidity)}%`,
    });
  }
  if (weather.windSpeed != null) {
    const bearing =
      weather.windBearing != null ? ` ${compassPoint(weather.windBearing)}` : "";
    details.push({
      label: "Wind",
      value: `${Math.round(weather.windSpeed)} ${weather.windSpeedUnit ?? "mph"}${bearing}`,
    });
  }
  if (weather.pressure != null) {
    details.push({
      label: "Pressure",
      value: `${Math.round(weather.pressure * 100) / 100} ${weather.pressureUnit ?? ""}`.trim(),
    });
  }
  if (weather.visibility != null) {
    details.push({
      label: "Visibility",
      value: `${Math.round(weather.visibility)} ${weather.visibilityUnit ?? ""}`.trim(),
    });
  }
  if (weather.uvIndex != null) {
    details.push({ label: "UV index", value: `${Math.round(weather.uvIndex)}` });
  }

  return (
    <Stack gap="4">
      <WeatherHero weather={weather} />
      <WeatherAdvisories advisories={weatherAdvisories(weather)} />
      {details.length > 0 && (
        <SimpleGrid columns={{ base: 2, md: 3 }} gap="3">
          {details.map((d) => (
            <Stat.Root key={d.label} size="sm">
              <Stat.Label>{d.label}</Stat.Label>
              <Stat.ValueText textStyle="lg">{d.value}</Stat.ValueText>
            </Stat.Root>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}
