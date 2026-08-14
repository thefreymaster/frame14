import { Box, HStack, Text } from "@chakra-ui/react";

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

  const labelColor = dim ? "var(--theme-fg-faint)" : "var(--theme-fg-dim)";
  const valueColor =
    active && !dim ? "var(--theme-fg)" : "var(--theme-fg-faint)";
  // Themed rather than a white alpha — an rgba(255,255,255,…) fill disappears
  // against the bright palette's near-white card.
  const fillColor = dim ? "var(--theme-fg-faint)" : "#38BDF8";

  return (
    <Box width="100%">
      <HStack justify="space-between" align="baseline" mb="0.8vmin">
        <Text
          fontSize="2.4vmin"
          fontWeight="400"
          color={labelColor}
          letterSpacing="0.01em"
          truncate
        >
          {name}
        </Text>
        <HStack gap="1.5vmin" align="baseline" flexShrink={0}>
          {kwhToday != null && (
            <Text
              fontSize="1.9vmin"
              color="var(--theme-fg-faint)"
              letterSpacing="0.04em"
            >
              {kwhToday.toFixed(1)} kWh
            </Text>
          )}
          <Text
            fontSize="2.4vmin"
            fontWeight="300"
            color={valueColor}
            minW="11vmin"
            textAlign="right"
          >
            {fmtW(watts)}
          </Text>
        </HStack>
      </HStack>
      <Box
        position="relative"
        height="0.8vmin"
        borderRadius="full"
        bg="var(--theme-surface-2)"
      >
        <Box
          position="absolute"
          top="0"
          left="0"
          height="100%"
          borderRadius="full"
          style={{
            width: `${pct}%`,
            background: fillColor,
            transition: "width 0.6s ease",
          }}
        />
      </Box>
    </Box>
  );
}
