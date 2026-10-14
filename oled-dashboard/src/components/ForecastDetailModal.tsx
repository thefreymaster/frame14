import { HStack, Icon, SimpleGrid, Stat, Text, VStack } from "@chakra-ui/react";
import type { HomeForecastPeriod } from "../hooks/useHomeData";
import { weatherIcon } from "../lib/weatherIcons";
import { PanelDialog } from "./PanelDialog";

function formatConditionLabel(condition: string | null) {
  if (!condition) return "Unknown";
  return condition
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(" ");
}

function formatFullTime(datetime: string) {
  const d = new Date(datetime);
  const day = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${time}`;
}

const CARDINALS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
];

function bearingToCardinal(deg: number) {
  return CARDINALS[Math.round((deg % 360) / 22.5) % 16];
}

interface Props {
  period: HomeForecastPeriod | null;
  open: boolean;
  onClose: () => void;
}

/** One forecast period in full: a Dialog of Stats. */
export function ForecastDetailModal({ period, open, onClose }: Props) {
  return (
    <PanelDialog
      open={open && period != null}
      onClose={onClose}
      title={period ? formatFullTime(period.datetime) : "Forecast"}
    >
      {period && <ForecastDetail period={period} />}
    </PanelDialog>
  );
}

function ForecastDetail({ period }: { period: HomeForecastPeriod }) {
  return (
    <>
      <HStack gap="6">
        <Icon boxSize="20" color="fg.muted">
          {weatherIcon(period.condition ?? "", period.datetime)}
        </Icon>
        <VStack align="start" gap="1">
          <Text textStyle="6xl" fontWeight="light" lineHeight="1">
            {period.temperature != null
              ? `${Math.round(period.temperature)}°`
              : "—"}
          </Text>
          <Text color="fg.muted">{formatConditionLabel(period.condition)}</Text>
        </VStack>
      </HStack>

      <SimpleGrid columns={2} gap="6" borderTopWidth="1px" pt="6">
        <Stat.Root>
          <Stat.Label>Low</Stat.Label>
          <Stat.ValueText>
            {period.templow != null ? `${Math.round(period.templow)}°` : "—"}
          </Stat.ValueText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label>Precip chance</Stat.Label>
          <Stat.ValueText>
            {period.precipitationProbability != null
              ? `${period.precipitationProbability}%`
              : "—"}
          </Stat.ValueText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label>Precip amount</Stat.Label>
          <Stat.ValueText>
            {period.precipitation != null ? `${period.precipitation} mm` : "—"}
          </Stat.ValueText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label>Wind</Stat.Label>
          <Stat.ValueText>
            {period.windSpeed != null
              ? `${Math.round(period.windSpeed)}${
                  period.windBearing != null
                    ? ` ${bearingToCardinal(period.windBearing)}`
                    : ""
                }`
              : "—"}
          </Stat.ValueText>
        </Stat.Root>
      </SimpleGrid>
    </>
  );
}
