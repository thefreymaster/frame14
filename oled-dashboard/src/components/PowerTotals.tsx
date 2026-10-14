import { HStack, Stat } from "@chakra-ui/react";
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

/** Solar | grid | home as three Stats. */
export function PowerTotals({ production, homeWatts }: Props) {
  const prod = production ?? 0;
  const home = homeWatts ?? 0;
  const gridDraw = home - prod; // >0 importing, <0 exporting
  const gridAbs = Math.abs(gridDraw);
  const isExporting = gridDraw < 0;
  const gridActive = gridAbs > GRID_ACTIVE_THRESHOLD;

  return (
    <HStack justify="space-between" align="flex-end">
      <Stat.Root size="lg" alignItems="flex-start">
        <Stat.Label>
          <PiSolarRoof /> Solar
        </Stat.Label>
        <Stat.ValueText color="yellow.fg">
          {fmtKw(production)} <Stat.ValueUnit>kW</Stat.ValueUnit>
        </Stat.ValueText>
      </Stat.Root>

      <Stat.Root size="lg" alignItems="center">
        <Stat.Label>
          {gridActive ? (isExporting ? "Exporting" : "From grid") : "Grid idle"}
        </Stat.Label>
        {gridActive ? (
          <Stat.ValueText color={isExporting ? "green.fg" : "orange.fg"}>
            {isExporting ? "↑" : "↓"}
            {fmtKw(gridAbs)} <Stat.ValueUnit>kW</Stat.ValueUnit>
          </Stat.ValueText>
        ) : (
          <Stat.ValueText color="fg.muted">—</Stat.ValueText>
        )}
      </Stat.Root>

      <Stat.Root size="lg" alignItems="flex-end">
        <Stat.Label>
          <IoFlash /> Home
        </Stat.Label>
        <Stat.ValueText>
          {fmtKw(homeWatts)} <Stat.ValueUnit>kW</Stat.ValueUnit>
        </Stat.ValueText>
      </Stat.Root>
    </HStack>
  );
}
