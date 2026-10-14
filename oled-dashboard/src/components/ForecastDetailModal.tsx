import { Box, Grid, HStack, Icon, Stat, Text, VStack } from "@chakra-ui/react";
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

/** One forecast period in full: a Dialog of Stat tiles. */
export function ForecastDetailModal({ period, open, onClose }: Props) {
  return (
    <PanelDialog
      open={open && period != null}
      onClose={onClose}
      label="forecast detail"
    >
      {period && <ForecastDetail period={period} />}
    </PanelDialog>
  );
}

function ForecastDetail({ period }: { period: HomeForecastPeriod }) {
  return (
    <>
      <VStack gap="1vmin" align="stretch">
        <Text textStyle="eyebrow" color="fg.faint">
          FORECAST
        </Text>
        <Text fontSize="3vmin" color="fg.dim">
          {formatFullTime(period.datetime)}
        </Text>
      </VStack>

      <HStack gap="3vmin" align="center">
        <Icon color="fg.dim" boxSize="14vmin" flexShrink={0}>
          {weatherIcon(period.condition ?? "", period.datetime)}
        </Icon>
        <VStack align="flex-start" gap="0.5vmin">
          <Text textStyle="numeral" fontSize="11vmin">
            {period.temperature != null
              ? `${Math.round(period.temperature)}°`
              : "—"}
          </Text>
          <Text fontSize="2.6vmin" color="fg.faint" letterSpacing="0.06em">
            {formatConditionLabel(period.condition)}
          </Text>
        </VStack>
      </HStack>

      <Box borderTopWidth="1px" borderColor="divider" pt="3vmin">
        <Grid templateColumns="1fr 1fr" gap="2.5vmin">
          <Detail
            label="LOW"
            value={
              period.templow != null ? `${Math.round(period.templow)}°` : "—"
            }
          />
          <Detail
            label="PRECIP CHANCE"
            value={
              period.precipitationProbability != null
                ? `${period.precipitationProbability}%`
                : "—"
            }
            accent={
              (period.precipitationProbability ?? 0) > 0
                ? "blue.400"
                : undefined
            }
          />
          <Detail
            label="PRECIP AMOUNT"
            value={
              period.precipitation != null ? `${period.precipitation} mm` : "—"
            }
          />
          <Detail
            label="WIND"
            value={
              period.windSpeed != null
                ? `${Math.round(period.windSpeed)}${
                    period.windBearing != null
                      ? ` ${bearingToCardinal(period.windBearing)}`
                      : ""
                  }`
                : "—"
            }
          />
        </Grid>
      </Box>
    </>
  );
}

function Detail({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Stat.Root size="panel">
      <Stat.Label fontSize="1.8vmin">{label}</Stat.Label>
      <Stat.ValueText
        fontSize="4.2vmin"
        lineHeight="1"
        color={accent ?? "fg.dim"}
      >
        {value}
      </Stat.ValueText>
    </Stat.Root>
  );
}
