import { useState } from "react";
import {
  Badge,
  Box,
  Flex,
  HStack,
  Icon,
  Progress,
  SimpleGrid,
  Stat,
  Text,
} from "@chakra-ui/react";
import { PiSolarRoof } from "react-icons/pi";
import { IoFlash } from "react-icons/io5";
import type { HomeEnergy } from "../hooks/useHomeData";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { Board } from "./Board";
import { PanelDialog } from "./PanelDialog";

function fmtKwh(n: number) {
  return isNaN(n) ? "--" : n.toFixed(0);
}

function fmtW(watts: number): string {
  if (isNaN(watts)) return "--";
  return `${(watts / 1000).toFixed(1)} kW`;
}

const GRID_ACTIVE_THRESHOLD = 5;

function coverage(energy: HomeEnergy) {
  const { productionToday, consumptionToday } = energy;
  return consumptionToday > 0 ? (productionToday / consumptionToday) * 100 : 0;
}

function grid(energy: HomeEnergy) {
  const draw = energy.currentConsumption - energy.currentProduction;
  const abs = Math.abs(draw);
  return { abs, exporting: draw < 0, active: abs > GRID_ACTIVE_THRESHOLD };
}

/** Import / export: arrow and colour carry the direction. */
function GridBadge({
  energy,
  size = "md",
}: {
  energy: HomeEnergy;
  size?: "md" | "lg";
}) {
  const { abs, exporting } = grid(energy);
  return (
    <Badge
      size={size}
      colorPalette={exporting ? "green" : "orange"}
      aria-label={`${exporting ? "Exporting" : "Importing"} ${fmtW(abs)}`}
    >
      {exporting ? "↑" : "↓"} {fmtW(abs)}
    </Badge>
  );
}

export function EnergySection({ energy }: { energy: HomeEnergy }) {
  const [open, setOpen] = useState(false);
  const { productionToday, consumptionToday } = energy;
  const pct = coverage(energy);
  const palette = pct >= 100 ? "green" : "yellow";

  return (
    <>
      <EnergyModal energy={energy} open={open} onClose={() => setOpen(false)} />
      <Board
        collapsible
        storageKey="energy"
        title={
          <Flex align="center" gap="3" rowGap="2" wrap="wrap" width="100%">
            <SectionTitle icon={<IoFlash />}>Energy</SectionTitle>
            {grid(energy).active && (
              <Box ms="auto">
                <GridBadge energy={energy} />
              </Box>
            )}
          </Flex>
        }
      >
        <Box
          role="button"
          aria-label="Show energy detail"
          onClick={() => setOpen(true)}
          cursor="pointer"
        >
          <Progress.Root
            value={Math.min(100, Math.max(0, pct))}
            colorPalette={palette}
            size="lg"
          >
            <Stat.Root>
              <Stat.Label>Solar coverage today</Stat.Label>
              <Stat.ValueText>{Math.round(pct)}%</Stat.ValueText>
            </Stat.Root>
            <Progress.Track mt="3">
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>

          <Flex gap="4" rowGap="2" wrap="wrap" mt="4" textStyle="lg">
            <HStack gap="2">
              <Icon color="yellow.500">
                <PiSolarRoof />
              </Icon>
              <Text>{fmtKwh(productionToday)} kWh</Text>
            </HStack>
            <HStack gap="2" ms="auto">
              <Icon color="fg.muted">
                <IoFlash />
              </Icon>
              <Text>{fmtKwh(consumptionToday)} kWh</Text>
            </HStack>
          </Flex>
        </Box>
      </Board>
    </>
  );
}

function EnergyModal({
  energy,
  open,
  onClose,
}: {
  energy: HomeEnergy;
  open: boolean;
  onClose: () => void;
}) {
  const {
    currentProduction,
    currentConsumption,
    productionToday,
    consumptionToday,
  } = energy;
  const pct = Math.round(coverage(energy));

  return (
    <PanelDialog open={open} onClose={onClose} title="Energy">
      <SimpleGrid columns={2} gap="6">
        <Stat.Root>
          <Stat.Label>
            <PiSolarRoof /> Solar now
          </Stat.Label>
          <Stat.ValueText>{fmtW(currentProduction)}</Stat.ValueText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label>
            <IoFlash /> Home now
          </Stat.Label>
          <Stat.ValueText>{fmtW(currentConsumption)}</Stat.ValueText>
        </Stat.Root>
      </SimpleGrid>

      <Box>
        {grid(energy).active ? (
          <GridBadge energy={energy} size="lg" />
        ) : (
          <Text color="fg.muted">Grid idle</Text>
        )}
      </Box>

      <Box borderTopWidth="1px" pt="6">
        <Text textStyle="sm" fontWeight="medium" color="fg.muted" mb="3">
          Today
        </Text>
        <SimpleGrid columns={3} gap="6">
          <Stat.Root>
            <Stat.Label>Produced</Stat.Label>
            <Stat.ValueText>
              {fmtKwh(productionToday)} <Stat.ValueUnit>kWh</Stat.ValueUnit>
            </Stat.ValueText>
          </Stat.Root>
          <Stat.Root>
            <Stat.Label>Solar</Stat.Label>
            <Stat.ValueText>{pct}%</Stat.ValueText>
          </Stat.Root>
          <Stat.Root>
            <Stat.Label>Used</Stat.Label>
            <Stat.ValueText>
              {fmtKwh(consumptionToday)} <Stat.ValueUnit>kWh</Stat.ValueUnit>
            </Stat.ValueText>
          </Stat.Root>
        </SimpleGrid>
      </Box>
    </PanelDialog>
  );
}
