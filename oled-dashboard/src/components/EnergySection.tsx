import { useState } from "react";
import {
  Badge,
  Box,
  Flex,
  Grid,
  HStack,
  Icon,
  Progress,
  Stat,
  Text,
  VStack,
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

/** Import / export as a tinted pill: arrow and colour carry the direction. */
function GridBadge({
  energy,
  size = "panel",
  showLabel = false,
}: {
  energy: HomeEnergy;
  size?: "panel" | "lg";
  showLabel?: boolean;
}) {
  const { abs, exporting } = grid(energy);
  const big = size === "lg";
  return (
    <Badge
      variant="glow"
      size="panel"
      colorPalette={exporting ? "green" : "orange"}
      flexShrink={0}
      fontSize={big ? "3.8vmin" : undefined}
      fontWeight={big ? "300" : "500"}
      px={big ? "2.5vmin" : undefined}
      py={big ? "1.2vmin" : undefined}
      gap={big ? "1.5vmin" : undefined}
      aria-label={`${exporting ? "Exporting" : "Importing"} ${fmtW(abs)}`}
    >
      <span aria-hidden="true">{exporting ? "↑" : "↓"}</span>
      {fmtW(abs)}
      {showLabel && (
        <Text as="span" fontSize="2vmin" letterSpacing="0.12em" opacity={0.7}>
          {exporting ? "EXPORTING" : "IMPORTING"}
        </Text>
      )}
    </Badge>
  );
}

export function EnergySection({ energy }: { energy: HomeEnergy }) {
  const [open, setOpen] = useState(false);
  const { productionToday, consumptionToday } = energy;
  const pct = coverage(energy);
  const pctColor =
    pct >= 100 ? "green.500" : pct >= 50 ? "yellow.500" : "fg.dim";

  return (
    <>
      <EnergyModal energy={energy} open={open} onClose={() => setOpen(false)} />
      <Board
        collapsible
        storageKey="energy"
        title={
          <Flex
            align="center"
            gap="1.5vmin"
            rowGap="0.8vmin"
            wrap="wrap"
            width="100%"
            minW="0"
          >
            <SectionTitle icon={<IoFlash />}>ENERGY</SectionTitle>
            {/* Only the figure, so it stays on the header's first line in
                the rail. */}
            {grid(energy).active && (
              <Box ml="auto">
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
          width="100%"
          minW="0"
        >
          {/* Coverage leads; the two totals sit under it as a wrapping row, so
            this reads the same in the narrow bento rail and at full width. */}
          <Progress.Root
            value={Math.min(100, Math.max(0, pct))}
            variant="soft"
            size="thick"
            shape="full"
            colorPalette={pct >= 100 ? "green" : "yellow"}
          >
            <VStack align="stretch" gap="1.4vmin" width="100%" minW="0">
              <HStack align="baseline" gap="1.4vmin" minW="0">
                <Text
                  textStyle="numeral"
                  fontSize="7vmin"
                  letterSpacing="normal"
                  color={pctColor}
                  flexShrink={0}
                >
                  {Math.round(pct)}%
                </Text>
                <Progress.Label
                  fontSize="2vmin"
                  fontWeight="400"
                  letterSpacing="0.06em"
                  color="fg.dim"
                  truncate
                  minW="0"
                  display="block"
                >
                  solar coverage today
                </Progress.Label>
              </HStack>

              <Progress.Track>
                <Progress.Range
                  borderRadius="full"
                  transition="width 600ms ease, background-color 600ms ease"
                />
              </Progress.Track>

              <Flex gap="1.5vmin" rowGap="0.8vmin" wrap="wrap" width="100%">
                <HStack gap="1vmin" align="baseline" minW="0">
                  <Icon color="yellow.500" boxSize="2.4vmin" flexShrink={0}>
                    <PiSolarRoof />
                  </Icon>
                  <Text
                    fontSize="3vmin"
                    fontWeight="300"
                    color="yellow.600"
                    whiteSpace="nowrap"
                  >
                    {fmtKwh(productionToday)} kWh
                  </Text>
                </HStack>

                <HStack gap="1vmin" align="baseline" minW="0" ml="auto">
                  <Icon color="fg.dim" boxSize="2.4vmin" flexShrink={0}>
                    <IoFlash />
                  </Icon>
                  <Text
                    fontSize="3vmin"
                    fontWeight="300"
                    color="fg.dim"
                    whiteSpace="nowrap"
                  >
                    {fmtKwh(consumptionToday)} kWh
                  </Text>
                </HStack>
              </Flex>
            </VStack>
          </Progress.Root>
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
  const solarActive = currentProduction > 5;
  const pct = Math.round(coverage(energy));
  const pctColor =
    pct >= 100 ? "green.500" : pct >= 50 ? "yellow.500" : "fg.faint";

  return (
    <PanelDialog
      open={open}
      onClose={onClose}
      label="energy panel"
      glow={
        solarActive ? "rgba(251, 191, 36, 0.13)" : "rgba(251, 191, 36, 0.06)"
      }
    >
      <VStack gap="2.5vmin" align="stretch">
        <Text textStyle="eyebrow" color="fg.faint">
          NOW
        </Text>

        <HStack gap="2vmin" align="baseline">
          <Icon
            color={solarActive ? "yellow.400" : "fg.faint"}
            boxSize="4.5vmin"
            flexShrink={0}
          >
            <PiSolarRoof />
          </Icon>
          <Text
            textStyle="numeral"
            fontSize="11vmin"
            color={solarActive ? "yellow.300" : "fg.faint"}
            textShadow={
              solarActive ? "0 0 4vmin rgba(251,191,36,0.5)" : undefined
            }
          >
            {fmtW(currentProduction)}
          </Text>
          <Text
            fontSize="2.2vmin"
            color="fg.faint"
            letterSpacing="0.1em"
            pb="1vmin"
          >
            SOLAR
          </Text>
        </HStack>

        <HStack gap="2vmin" align="baseline">
          <Icon color="fg.dim" boxSize="4.5vmin" flexShrink={0}>
            <IoFlash />
          </Icon>
          <Text textStyle="numeral" fontSize="7.5vmin" letterSpacing="-0.03em">
            {fmtW(currentConsumption)}
          </Text>
          <Text
            fontSize="2.2vmin"
            color="fg.faint"
            letterSpacing="0.1em"
            pb="0.5vmin"
          >
            HOME
          </Text>
        </HStack>

        {grid(energy).active ? (
          <Box alignSelf="flex-start">
            <GridBadge energy={energy} size="lg" showLabel />
          </Box>
        ) : (
          <Text fontSize="2.8vmin" color="fg.faint" letterSpacing="0.06em">
            Grid idle
          </Text>
        )}
      </VStack>

      <Box borderTopWidth="1px" borderColor="divider" pt="3.5vmin">
        <Text textStyle="eyebrow" color="fg.faint" mb="2vmin">
          TODAY
        </Text>
        <Grid templateColumns="1fr 1fr 1fr" gap="2vmin">
          <Stat.Root size="panel" alignItems="flex-start">
            <Stat.ValueText
              fontFamily="display"
              fontSize="5vmin"
              lineHeight="1"
              color="yellow.600"
            >
              {fmtKwh(productionToday)} kWh
            </Stat.ValueText>
            <Stat.HelpText letterSpacing="0.12em">PRODUCED</Stat.HelpText>
          </Stat.Root>
          <Stat.Root size="panel" alignItems="center">
            <Stat.ValueText
              fontFamily="display"
              fontSize="5vmin"
              fontWeight="400"
              lineHeight="1"
              color={pctColor}
            >
              {pct}%
            </Stat.ValueText>
            <Stat.HelpText letterSpacing="0.12em">SOLAR</Stat.HelpText>
          </Stat.Root>
          <Stat.Root size="panel" alignItems="flex-end">
            <Stat.ValueText
              fontFamily="display"
              fontSize="5vmin"
              lineHeight="1"
              color="fg.dim"
            >
              {fmtKwh(consumptionToday)} kWh
            </Stat.ValueText>
            <Stat.HelpText letterSpacing="0.12em">USED</Stat.HelpText>
          </Stat.Root>
        </Grid>
      </Box>
    </PanelDialog>
  );
}
