import { Box, HStack, Text } from "@chakra-ui/react";
import { MdElectricBolt } from "react-icons/md";
import { useCircuits } from "../hooks/useCircuits";
import { useEnergy } from "../hooks/useEnergy";
import { PowerTotals } from "../components/PowerTotals";
import { CircuitBreakdown } from "../components/CircuitBreakdown";

export function Power() {
  const { data, isPending, isError } = useCircuits();
  const { data: energy } = useEnergy();

  return (
    <Box
      width="100%"
      height="100%"
      bg="var(--theme-bg)"
      display="flex"
      flexDirection="column"
      px="6vmin"
      pt="5vmin"
      pb="3vmin"
      overflow="hidden"
    >
      {/* Header */}
      <HStack gap="2vmin" align="center" mb="4vmin">
        <Box color="cyan.400" fontSize="5vmin" lineHeight="1">
          <MdElectricBolt />
        </Box>
        <Text
          fontSize="3vmin"
          fontWeight="500"
          letterSpacing="0.14em"
          color="var(--theme-fg-dim)"
        >
          POWER
        </Text>
      </HStack>

      {/* Totals */}
      <Box mb="5vmin">
        <PowerTotals
          production={energy?.currentProduction ?? null}
          homeWatts={data?.totalWatts ?? null}
        />
      </Box>

      {/* Breakdown */}
      <Box flex="1" minH="0">
        {(isPending || isError) && (
          <Box
            height="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text
              fontSize="2.8vmin"
              color="var(--theme-fg-faint)"
              letterSpacing="0.1em"
            >
              {isError ? "unavailable" : "loading"}
            </Text>
          </Box>
        )}
        {!isPending && !isError && data && (
          <CircuitBreakdown
            circuits={data.circuits}
            balanceWatts={data.balanceWatts}
            totalWatts={data.totalWatts}
          />
        )}
      </Box>
    </Box>
  );
}
