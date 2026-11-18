import { Center, Spinner, Text } from "@chakra-ui/react";
import { useCircuits } from "../hooks/useCircuits";
import { useBoardFrame } from "../lib/boardFrame";
import { Board } from "./Board";
import { CircuitBreakdown } from "./CircuitBreakdown";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { IoGridOutline } from "react-icons/io5";

/**
 * The Energy page's Circuits tab: every monitored circuit's draw right now
 * as a bar against the largest (CircuitBreakdown, from /api/circuits every
 * 10s), with the whole house's draw in the header.
 */
export function CircuitsCard() {
  const { data, isPending, isError } = useCircuits();
  const totalWatts = data?.totalWatts ?? null;
  // On the page the card fills what is left and its list scrolls in it; in
  // the Home card's drawer it is as tall as the list, and holds a little
  // room while there is none yet.
  const waiting = useBoardFrame() === "panel" ? { minH: "12rem" } : { height: "100%" };

  return (
    <Board
      fill
      title={
        <SectionTitle icon={<IoGridOutline />}>
          Circuits
          {totalWatts != null ? ` · ${(totalWatts / 1000).toFixed(1)} kW` : ""}
        </SectionTitle>
      }
    >
      {isPending && (
        <Center {...waiting}>
          <Spinner size="lg" aria-label="Loading circuits" />
        </Center>
      )}
      {isError && (
        <Center {...waiting}>
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
