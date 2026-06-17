import { Box, VStack, Text } from "@chakra-ui/react";
import type { Circuit } from "../hooks/useCircuits";
import { CircuitBar } from "./CircuitBar";

interface Props {
  circuits: Circuit[];
  balanceWatts: number | null;
  totalWatts: number | null;
}

export function CircuitBreakdown({ circuits, balanceWatts, totalWatts }: Props) {
  // Scale every bar against the single largest draw so proportions read clearly.
  const maxWatts = Math.max(
    1,
    balanceWatts ?? 0,
    ...circuits.map((c) => c.watts ?? 0),
  );

  return (
    <Box display="flex" flexDirection="column" height="100%" minH="0">
      <Text
        fontSize="2.2vmin"
        letterSpacing="0.16em"
        color="var(--theme-fg-faint)"
        mb="2.5vmin"
      >
        CIRCUITS{totalWatts != null ? ` · ${(totalWatts / 1000).toFixed(1)} kW` : ""}
      </Text>
      <VStack
        align="stretch"
        gap="2.2vmin"
        flex="1"
        minH="0"
        overflowY="auto"
        pr="1vmin"
      >
        {circuits.map((c) => (
          <CircuitBar
            key={c.name}
            name={c.name}
            watts={c.watts}
            maxWatts={maxWatts}
            kwhToday={c.kwhToday}
          />
        ))}
        {balanceWatts != null && (
          <CircuitBar name="Other" watts={balanceWatts} maxWatts={maxWatts} dim />
        )}
      </VStack>
    </Box>
  );
}
