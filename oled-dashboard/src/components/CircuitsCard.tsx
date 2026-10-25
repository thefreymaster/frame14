import { Center, Spinner, Text } from "@chakra-ui/react";
import { useCircuits } from "../hooks/useCircuits";
import { Board } from "./Board";
import { CircuitBreakdown } from "./CircuitBreakdown";
import { SectionTitle } from "./SectionTitle/SectionTitle";

/**
 * The Energy page's Circuits tab: every monitored circuit's draw right now
 * as a bar against the largest (CircuitBreakdown, from /api/circuits every
 * 10s), with the whole house's draw in the header.
 */
export function CircuitsCard() {
  const { data, isPending, isError } = useCircuits();
  const totalWatts = data?.totalWatts ?? null;

  return (
    <Board
      fill
      title={
        <SectionTitle>
          Circuits
          {totalWatts != null ? ` · ${(totalWatts / 1000).toFixed(1)} kW` : ""}
        </SectionTitle>
      }
    >
      {isPending && (
        <Center height="100%">
          <Spinner size="lg" aria-label="Loading circuits" />
        </Center>
      )}
      {isError && (
        <Center height="100%">
          <Text color="fg.muted">unavailable</Text>
        </Center>
      )}
      {!isPending && !isError && data && (
        <CircuitBreakdown
          circuits={data.circuits}
          balanceWatts={data.balanceWatts}
        />
      )}
    </Board>
  );
}
