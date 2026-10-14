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
  const active = value > 0;

  return (
    <Progress.Root
      value={pct}
      variant="soft"
      size="hair"
      shape="full"
      width="100%"
      colorPalette="cyan"
    >
      <HStack justify="space-between" align="baseline" mb="0.8vmin">
        <Progress.Label
          fontSize="2.4vmin"
          fontWeight="400"
          color={dim ? "fg.faint" : "fg.dim"}
          letterSpacing="0.01em"
          truncate
          display="block"
        >
          {name}
        </Progress.Label>
        <HStack gap="1.5vmin" align="baseline" flexShrink={0}>
          {kwhToday != null && (
            <Text fontSize="1.9vmin" color="fg.faint" letterSpacing="0.04em">
              {kwhToday.toFixed(1)} kWh
            </Text>
          )}
          <Progress.ValueText
            fontSize="2.4vmin"
            fontWeight="300"
            lineHeight="1.5"
            color={active && !dim ? "fg" : "fg.faint"}
            minW="11vmin"
            textAlign="right"
          >
            {fmtW(watts)}
          </Progress.ValueText>
        </HStack>
      </HStack>
      <Progress.Track>
        <Progress.Range
          // The themed fill rather than a white alpha — an rgba(255,255,255,…)
          // fill disappears against the bright palette's near-white card.
          bg={dim ? "fg.faint" : "#38BDF8"}
          transition="width 0.6s ease"
        />
      </Progress.Track>
    </Progress.Root>
  );
}
