import { HStack, Box, Text } from "@chakra-ui/react";
import type { EnergyData } from "../hooks/useEnergy";

interface Props {
  energy: EnergyData | null;
  isError?: boolean;
}

export function EnergyPanel({ energy, isError }: Props) {
  const fmt = (val: number | undefined) =>
    val == null || isNaN(val) ? "--" : val.toFixed(1);

  const unit = (u: string | undefined) => u ?? "kWh";

  if (isError) {
    return (
      <Text fontSize="3vmin" color="gray.800" letterSpacing="0.08em">
        energy unavailable
      </Text>
    );
  }

  return (
    <HStack gap="8vmin" justify="center" width="100%">
      <Box textAlign="center">
        <Text fontSize="3vmin" color="gray.600" letterSpacing="0.08em">
          SOLAR TODAY
        </Text>
        <Text fontSize="6vmin" color="yellow.400" fontWeight="200" lineHeight="1.2">
          {fmt(energy?.production)}
          <Text as="span" fontSize="3vmin" color="gray.500" ml="1vmin">
            {unit(energy?.productionUnit)}
          </Text>
        </Text>
      </Box>

      <Box textAlign="center">
        <Text fontSize="3vmin" color="gray.600" letterSpacing="0.08em">
          USAGE TODAY
        </Text>
        <Text fontSize="6vmin" color="gray.300" fontWeight="200" lineHeight="1.2">
          {fmt(energy?.consumption)}
          <Text as="span" fontSize="3vmin" color="gray.500" ml="1vmin">
            {unit(energy?.consumptionUnit)}
          </Text>
        </Text>
      </Box>
    </HStack>
  );
}
