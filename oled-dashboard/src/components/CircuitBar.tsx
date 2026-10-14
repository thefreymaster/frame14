import { HStack, Progress, Text } from "@chakra-ui/react";

function fmtW(watts: number | null): string {
  if (watts == null || isNaN(watts)) return "--";
  if (watts >= 1000) return `${(watts / 1000).toFixed(1)} kW`;
  return `${Math.round(watts)} W`;
}

interface Props {
  name: string;
  watts: number | null;
  maxWatts: number;
  kwhToday?: number | null;
  dim?: boolean;
}

/** One circuit: a Progress bar scaled against the largest draw. */
export function CircuitBar({
  name,
  watts,
  maxWatts,
  kwhToday,
  dim = false,
}: Props) {
  const value = watts ?? 0;
  const pct = maxWatts > 0 ? Math.min(100, (value / maxWatts) * 100) : 0;

  return (
    <Progress.Root
      value={pct}
      colorPalette={dim ? "gray" : "blue"}
      width="100%"
    >
      <HStack justify="space-between" mb="2">
        <Progress.Label color={dim ? "fg.muted" : undefined} truncate>
          {name}
        </Progress.Label>
        <HStack gap="3" flexShrink={0}>
          {kwhToday != null && (
            <Text textStyle="sm" color="fg.muted">
              {kwhToday.toFixed(1)} kWh
            </Text>
          )}
          <Progress.ValueText
            color={value > 0 && !dim ? undefined : "fg.muted"}
          >
            {fmtW(watts)}
          </Progress.ValueText>
        </HStack>
      </HStack>
      <Progress.Track>
        <Progress.Range />
      </Progress.Track>
    </Progress.Root>
  );
}
