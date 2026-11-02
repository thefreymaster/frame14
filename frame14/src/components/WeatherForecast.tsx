import { useState } from "react";
import { Button, Grid, Icon, Text } from "@chakra-ui/react";
import type { HomeForecastPeriod } from "../hooks/useHomeData";
import { weatherIcon } from "../lib/weatherIcons";
import { ForecastDetailModal } from "./ForecastDetailModal";

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
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selected =
    selectedIndex != null ? (periods[selectedIndex] ?? null) : null;

  return (
    <>
      <ForecastDetailModal
        period={selected}
        open={open}
        onClose={() => setOpen(false)}
      />
      {/* Each period is its own chip: the surface replaces the divider rules,
          and the soonest period carries the "on" fill instead of looking
          identical to the rest. */}
      <Grid
        width="100%"
        templateColumns={`repeat(${periods.length}, 1fr)`}
        gap="2"
        alignItems="stretch"
      >
        {periods.map((period, i) => {
          const soonest = i === 0;
          const precip = period.precipitationProbability;
          return (
            <Button
              key={period.datetime ?? i}
              variant={soonest ? "subtle" : "outline"}
              aria-label={`Show forecast detail for ${formatHour(period.datetime)}`}
              onClick={() => {
                setSelectedIndex(i);
                setOpen(true);
              }}
              flexDirection="column"
              height="auto"
              py="3"
              px="1"
              gap="1"
            >
              <Text textStyle="sm" color="fg.muted">
                {formatHour(period.datetime)}
              </Text>
              <Icon boxSize="8">
                {weatherIcon(period.condition ?? "", period.datetime)}
              </Icon>
              <Text textStyle="xl">
                {period.temperature != null
                  ? `${Math.round(period.temperature)}°`
                  : "—"}
              </Text>
              {/* Always rendered so temps stay on one baseline across chips. */}
              <Text
                textStyle="xs"
                color="blue.fg"
                visibility={precip != null && precip > 0 ? "visible" : "hidden"}
              >
                {precip != null && precip > 0 ? `${precip}%` : "0%"}
              </Text>
            </Button>
          );
        })}
      </Grid>
    </>
  );
}
