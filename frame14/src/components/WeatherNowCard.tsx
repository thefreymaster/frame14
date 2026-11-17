import { Box, Card, Grid, SimpleGrid, Stack, Stat } from "@chakra-ui/react";
import type { HomeWeather } from "../hooks/useHomeData";
import { compassPoint, roundTemp } from "../lib/forecast";
import { weatherAdvisories } from "../lib/weatherAdvisories";
import { MoonPhase } from "./MoonPhase";
import { WeatherAdvisories } from "./WeatherAdvisories";
import { WeatherHero } from "./WeatherHero";
import { Well } from "./Well";

/**
 * /weather's Now card: the WeatherHero, the forecast's advisories, then the
 * conditions the entity reports as small Stats — feels like (when it differs
 * from the reading), humidity, wind with its compass point, pressure,
 * visibility and the UV index; a figure the entity doesn't report is left
 * out — and the moon (MoonPhase). The conditions and the moon are each a
 * well in the card, as the forecasts' hours and days are (0.174.0, the user,
 * of the conditions and the hours' chart: "These two should be concave also
 * like the forecast"): `data-weather-well` conditions / moon.
 *
 * `wide` (a desktop's card, which has the width) is a single band instead of
 * a hero over a grid spread across the page: the hero at its own size at the
 * left with the moon under it, and the conditions in three content-sized
 * columns at the right, a well as tall as the two; the advisories go under
 * the band. A card under BAND_FROM (a small window) has no room for the two
 * side by side and is a column like any other: the hero, the conditions, the
 * moon.
 */
const BAND_FROM = "54rem";

export function WeatherNowCard({
  weather,
  wide = false,
}: {
  weather: HomeWeather;
  wide?: boolean;
}) {
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
      weather.windBearing != null
        ? ` ${compassPoint(weather.windBearing)}`
        : "";
    details.push({
      label: "Wind",
      value: `${Math.round(weather.windSpeed)} ${weather.windSpeedUnit ?? "mph"}${bearing}`,
    });
  }
  if (weather.pressure != null) {
    details.push({
      label: "Pressure",
      value:
        `${Math.round(weather.pressure * 100) / 100} ${weather.pressureUnit ?? ""}`.trim(),
    });
  }
  if (weather.visibility != null) {
    details.push({
      label: "Visibility",
      value:
        `${Math.round(weather.visibility)} ${weather.visibilityUnit ?? ""}`.trim(),
    });
  }
  if (weather.uvIndex != null) {
    details.push({
      label: "UV index",
      value: `${Math.round(weather.uvIndex)}`,
    });
  }

  const advisories = (
    <WeatherAdvisories advisories={weatherAdvisories(weather)} />
  );
  const stats = details.length > 0 && (
    <Well gridArea="conditions" data-weather-well="conditions">
      {/* Centred in a well taller than its figures (the band's). */}
      <Card.Body justifyContent="center">
        <SimpleGrid
          columns={wide ? 3 : { base: 2, md: 3 }}
          gap="3"
          columnGap={wide ? "8" : undefined}
        >
          {details.map((d) => (
            <Stat.Root key={d.label} size="sm">
              <Stat.Label>{d.label}</Stat.Label>
              <Stat.ValueText textStyle="lg">{d.value}</Stat.ValueText>
            </Stat.Root>
          ))}
        </SimpleGrid>
      </Card.Body>
    </Well>
  );

  if (!wide) {
    return (
      <Stack gap="4">
        <WeatherHero weather={weather} />
        {advisories}
        {stats}
        <MoonPhase />
      </Stack>
    );
  }
  return (
    <Stack gap="4" css={{ containerType: "inline-size" }}>
      <Grid
        gap="4"
        columnGap="10"
        css={{
          gridTemplateAreas: '"hero" "conditions" "moon"',
          [`@container (min-width: ${BAND_FROM})`]: {
            // The left column at the hero's own width, so the condition sits
            // by the temperature; the conditions at the row's far end.
            gridTemplateColumns: "minmax(0, auto) 1fr",
            gridTemplateAreas: '"hero conditions" "moon conditions"',
            "& > [data-weather-well='conditions']": { justifySelf: "end" },
          },
        }}
      >
        <Box gridArea="hero" minW="0">
          <WeatherHero weather={weather} />
        </Box>
        {stats}
        <Box gridArea="moon" minW="0">
          <MoonPhase />
        </Box>
      </Grid>
      {advisories}
    </Stack>
  );
}
