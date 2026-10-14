import { HStack, Icon, Stat } from "@chakra-ui/react";
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

/** Solar | grid | home as three display-size Stats. */
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
      <Stat.Root size="display" alignItems="flex-start">
        <Stat.ValueText color="yellow.500" gap="1.5vmin">
          <Icon boxSize="3.5vmin" alignSelf="center">
            <PiSolarRoof />
          </Icon>
          {fmtKw(production)}
          <Stat.ValueUnit color="yellow.700">kW</Stat.ValueUnit>
        </Stat.ValueText>
        <Stat.HelpText>SOLAR</Stat.HelpText>
      </Stat.Root>

      <Stat.Root size="display" alignItems="center">
        {gridActive ? (
          <>
            <Stat.ValueText color={gridColor}>
              {isExporting ? "↑" : "↓"}
              {fmtKw(gridAbs)}
              <Stat.ValueUnit color={gridColor} opacity={0.6}>
                kW
              </Stat.ValueUnit>
            </Stat.ValueText>
            <Stat.HelpText>
              {isExporting ? "EXPORTING" : "FROM GRID"}
            </Stat.HelpText>
          </>
        ) : (
          <>
            <Stat.ValueText color="fg.faint">—</Stat.ValueText>
            <Stat.HelpText>GRID IDLE</Stat.HelpText>
          </>
        )}
      </Stat.Root>

      <Stat.Root size="display" alignItems="flex-end">
        <Stat.ValueText color="fg.dim" gap="1.5vmin">
          <Icon boxSize="3.5vmin" alignSelf="center">
            <IoFlash />
          </Icon>
          {fmtKw(homeWatts)}
          <Stat.ValueUnit>kW</Stat.ValueUnit>
        </Stat.ValueText>
        <Stat.HelpText>HOME</Stat.HelpText>
      </Stat.Root>
    </HStack>
  );
}
