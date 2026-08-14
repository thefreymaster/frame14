import { HStack, VStack, Text, Box } from "@chakra-ui/react";
import { PiSolarRoof } from "react-icons/pi";
import { IoFlash } from "react-icons/io5";

// Net grid is meaningful only above a small deadband (matches EnergySection).
const GRID_ACTIVE_THRESHOLD = 5;

function fmtKw(watts: number | null): string {
  if (watts == null || isNaN(watts)) return "--";
  return (watts / 1000).toFixed(1);
}

interface Props {
  production: number | null;
  homeWatts: number | null;
}

export function PowerTotals({ production, homeWatts }: Props) {
  const prod = production ?? 0;
  const home = homeWatts ?? 0;
  const gridDraw = home - prod; // >0 importing, <0 exporting
  const gridAbs = Math.abs(gridDraw);
  const isExporting = gridDraw < 0;
  const gridActive = gridAbs > GRID_ACTIVE_THRESHOLD;
  const gridColor = isExporting ? "green.400" : "orange.400";

  return (
    <HStack justify="space-between" align="flex-end" px="0.5vmin">
      {/* Solar production */}
      <VStack align="flex-start" gap="0.4vmin">
        <HStack gap="1.5vmin" align="baseline">
          <Box
            color="yellow.500"
            fontSize="3.5vmin"
            lineHeight="1"
            flexShrink={0}
          >
            <PiSolarRoof />
          </Box>
          <Text
            className="display-numeral"
            fontSize="7vmin"
            fontWeight="300"
            lineHeight="1"
            color="yellow.500"
          >
            {fmtKw(production)}
            <Text as="span" fontSize="3vmin" color="yellow.700" ml="1vmin">
              kW
            </Text>
          </Text>
        </HStack>
        <Text
          fontSize="2.2vmin"
          color="var(--theme-fg-faint)"
          letterSpacing="0.1em"
        >
          SOLAR
        </Text>
      </VStack>

      {/* Net grid */}
      <VStack align="center" gap="0.4vmin">
        {gridActive ? (
          <>
            <Text
              className="display-numeral"
              fontSize="7vmin"
              fontWeight="300"
              lineHeight="1"
              color={gridColor}
            >
              {isExporting ? "↑" : "↓"}
              {fmtKw(gridAbs)}
              <Text
                as="span"
                fontSize="3vmin"
                color={gridColor}
                opacity={0.6}
                ml="1vmin"
              >
                kW
              </Text>
            </Text>
            <Text
              fontSize="2.2vmin"
              color="var(--theme-fg-faint)"
              letterSpacing="0.1em"
            >
              {isExporting ? "EXPORTING" : "FROM GRID"}
            </Text>
          </>
        ) : (
          <>
            <Text
              className="display-numeral"
              fontSize="7vmin"
              fontWeight="300"
              lineHeight="1"
              color="var(--theme-fg-faint)"
            >
              —
            </Text>
            <Text
              fontSize="2.2vmin"
              color="var(--theme-fg-faint)"
              letterSpacing="0.1em"
            >
              GRID IDLE
            </Text>
          </>
        )}
      </VStack>

      {/* Home usage */}
      <VStack align="flex-end" gap="0.4vmin">
        <HStack gap="1.5vmin" align="baseline">
          <Box
            color="var(--theme-fg-dim)"
            fontSize="3.5vmin"
            lineHeight="1"
            flexShrink={0}
          >
            <IoFlash />
          </Box>
          <Text
            className="display-numeral"
            fontSize="7vmin"
            fontWeight="300"
            lineHeight="1"
            color="var(--theme-fg-dim)"
          >
            {fmtKw(homeWatts)}
            <Text
              as="span"
              fontSize="3vmin"
              color="var(--theme-fg-faint)"
              ml="1vmin"
            >
              kW
            </Text>
          </Text>
        </HStack>
        <Text
          fontSize="2.2vmin"
          color="var(--theme-fg-faint)"
          letterSpacing="0.1em"
        >
          HOME
        </Text>
      </VStack>
    </HStack>
  );
}
