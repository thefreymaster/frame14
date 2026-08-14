import { Box, VStack } from "@chakra-ui/react";
import type { Circuit } from "../hooks/useCircuits";
import { CircuitBar } from "./CircuitBar";

interface Props {
  circuits: Circuit[];
  balanceWatts: number | null;
}

export function CircuitBreakdown({ circuits, balanceWatts }: Props) {
  // Scale every bar against the single largest draw so proportions read clearly.
  const maxWatts = Math.max(
    1,
    balanceWatts ?? 0,
    ...circuits.map((c) => c.watts ?? 0),
  );

  return (
    <Box display="flex" flexDirection="column" height="100%" minH="0">
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
          <CircuitBar
            name="Other"
            watts={balanceWatts}
            maxWatts={maxWatts}
            dim
          />
        )}
      </VStack>
    </Box>
  );
}
