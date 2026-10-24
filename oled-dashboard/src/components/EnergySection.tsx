import { useState } from "react";
import {
  Badge,
  Box,
  Flex,
  HStack,
  Icon,
  Progress,
  Stat,
  Text,
} from "@chakra-ui/react";
import { PiSolarRoof } from "react-icons/pi";
import { IoFlash } from "react-icons/io5";
import type { HomeEnergy } from "../hooks/useHomeData";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { coverage, fmtKwh, fmtW, grid } from "../lib/energy";
import { Board } from "./Board";
import { EnergyDialog } from "./EnergyDialog";
import { EnergySkeleton } from "./skeletons/EnergySkeleton";

/** Import / export: arrow and colour carry the direction. */
function GridBadge({ energy }: { energy: HomeEnergy }) {
  const { abs, exporting } = grid(energy);
  return (
    <Badge
      colorPalette={exporting ? "green" : "orange"}
      aria-label={`${exporting ? "Exporting" : "Importing"} ${fmtW(abs)}`}
    >
      {exporting ? "↑" : "↓"} {fmtW(abs)}
    </Badge>
  );
}

export function EnergySection({
  energy,
  loading = false,
}: {
  energy: HomeEnergy;
  /** Today's totals haven't landed: a placeholder body under the real header. */
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { productionToday, consumptionToday } = energy;
  const pct = coverage(energy);
  const palette = pct >= 100 ? "green" : "yellow";

  return (
    <>
      <EnergyDialog
        energy={energy}
        open={open}
        onClose={() => setOpen(false)}
      />
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
        {loading ? (
          <EnergySkeleton />
        ) : (
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
        )}
      </Board>
    </>
  );
}
