import { Center, Spinner, Text } from "@chakra-ui/react";
import { MdElectricBolt } from "react-icons/md";
import { useCircuits } from "../hooks/useCircuits";
import { useEnergy } from "../hooks/useEnergy";
import { PowerTotals } from "../components/PowerTotals";
import { CircuitBreakdown } from "../components/CircuitBreakdown";
import { Board } from "../components/Board";
import { PageShell } from "../components/PageShell";
import { PageHeader } from "../components/PageHeader";
import { SectionTitle } from "../components/SectionTitle/SectionTitle";

export function Power() {
  const { data, isPending, isError } = useCircuits();
  const { data: energy } = useEnergy();

  const totalWatts = data?.totalWatts ?? null;

  return (
    <PageShell fill>
      <PageHeader
        icon={<MdElectricBolt />}
        iconColor="cyan.400"
        title="POWER"
      />

      <Board>
        <PowerTotals
          production={energy?.currentProduction ?? null}
          homeWatts={totalWatts}
        />
      </Board>

      <Board
        fill
        title={
          <SectionTitle>
            CIRCUITS
            {totalWatts != null
              ? ` · ${(totalWatts / 1000).toFixed(1)} kW`
              : ""}
          </SectionTitle>
        }
      >
        {isPending && (
          <Center height="100%">
            <Spinner size="lg" color="fg.faint" aria-label="Loading circuits" />
          </Center>
        )}
        {isError && (
          <Center height="100%">
            <Text fontSize="2.8vmin" color="fg.faint" letterSpacing="0.1em">
              unavailable
            </Text>
          </Center>
        )}
        {!isPending && !isError && data && (
          <CircuitBreakdown
            circuits={data.circuits}
            balanceWatts={data.balanceWatts}
          />
        )}
      </Board>
    </PageShell>
  );
}
