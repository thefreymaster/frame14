import { useState } from "react";
import {
  Box,
  Flex,
  HStack,
  Icon,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { IoFlash, IoHome } from "react-icons/io5";
import { PiSolarRoof } from "react-icons/pi";
import type { HomeEnergy } from "../hooks/useHomeData";
import { useEnergyToday } from "../hooks/useEnergyToday";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import {
  ENERGY_COLORS,
  SPARKLINE_HEIGHT,
  coverage,
  fmtKwh,
  grid,
} from "../lib/energy";
import { Board } from "./Board";
import { EnergyDialog } from "./EnergyDialog";
import { GridBadge } from "./GridBadge";
import { PowerFlow } from "./PowerFlow";
import { TodaySparkline } from "./TodaySparkline";
import { EnergySkeleton } from "./skeletons/EnergySkeleton";

/**
 * A day total keyed to its line in the strip by the flow's own icon for it,
 * in the line's colour: the panels for the solar, the house for its use.
 */
function Total({
  icon,
  color,
  kwh,
  label,
}: {
  icon: React.ReactNode;
  color: "solar" | "home";
  kwh: number;
  label: string;
}) {
  return (
    <HStack gap="1.5" whiteSpace="nowrap" aria-label={`${label} ${fmtKwh(kwh)} kWh`}>
      <Icon boxSize="4" color={ENERGY_COLORS[color]} aria-hidden>
        {icon}
      </Icon>
      <Text fontWeight="semibold">
        {fmtKwh(kwh)}{" "}
        <Text as="span" fontWeight="normal" color="fg.muted">
          kWh
        </Text>
      </Text>
    </HStack>
  );
}

/**
 * The energy card: where the power is going now (PowerFlow, the dialog's
 * diagram at its small size), then today — how much of the day's use the
 * solar covered, as the one big figure, beside the day's curve
 * (TodaySparkline) with the two totals over it. A tap on the body opens
 * EnergyDialog, which has the full chart and the split totals.
 */
export function EnergySection({
  energy,
  loading = false,
}: {
  energy: HomeEnergy;
  /** Today's totals haven't landed: a placeholder body under the real header. */
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const today = useEnergyToday();
  const { productionToday, consumptionToday } = energy;
  const pct = coverage(energy);

  return (
    <>
      <EnergyDialog
        energy={energy}
        today={today}
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
          <Stack
            gap="3"
            role="button"
            aria-label="Show energy detail"
            onClick={() => setOpen(true)}
            cursor="pointer"
          >
            <PowerFlow energy={energy} size="sm" />

            <HStack gap="4" align="stretch">
              <Stack gap="1" justify="center" flexShrink={0}>
                <Text
                  textStyle="4xl"
                  fontWeight="semibold"
                  lineHeight="1"
                  letterSpacing="tight"
                  color={pct >= 100 ? "fg.success" : "fg"}
                  aria-label={`Solar covered ${Math.round(pct)}% of today's use`}
                >
                  {Math.round(pct)}%
                </Text>
                <Text textStyle="xs" color="fg.muted" whiteSpace="nowrap">
                  Solar covered today
                </Text>
              </Stack>

              <Stack gap="2" flex="1" minW="0" justify="end">
                <HStack gap="4" rowGap="0.5" wrap="wrap" textStyle="sm">
                  <Total
                    icon={<PiSolarRoof />}
                    color="solar"
                    kwh={productionToday}
                    label="Solar produced"
                  />
                  <Total
                    icon={<IoHome />}
                    color="home"
                    kwh={consumptionToday}
                    label="Home used"
                  />
                </HStack>
                {today.data ? (
                  <TodaySparkline
                    points={today.data.points}
                    start={Date.parse(today.data.start)}
                    end={Date.parse(today.data.end)}
                    live={{
                      production: energy.currentProduction,
                      consumption: energy.currentConsumption,
                    }}
                    height={SPARKLINE_HEIGHT}
                  />
                ) : today.isError ? (
                  // No curve: the strip stays, empty, so the card keeps its size.
                  <Box
                    height={SPARKLINE_HEIGHT}
                    borderBottomWidth="1px"
                    borderColor="border"
                    aria-hidden
                  />
                ) : (
                  <Skeleton height={SPARKLINE_HEIGHT} />
                )}
              </Stack>
            </HStack>
          </Stack>
        )}
      </Board>
    </>
  );
}
