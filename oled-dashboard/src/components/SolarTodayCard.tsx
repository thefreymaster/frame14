import { Center, HStack, Skeleton, Stack, Text } from "@chakra-ui/react";
import type { HomeEnergy } from "../hooks/useHomeData";
import { useEnergyToday } from "../hooks/useEnergyToday";
import { coverage } from "../lib/energy";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { TodayPowerChart } from "./TodayPowerChart";

/** The plot's height in TodayPowerChart, which the placeholder keeps to. */
const PLOT_HEIGHT = { base: "9rem", md: "11rem" };

/**
 * The Solar tab's Today card: what the Home energy card says about the day —
 * how much of its use the solar covered, as the one big figure, beside the
 * day's two totals on the keys — over today's full power curve
 * (TodayPowerChart, the dialog's chart, with its readout), in the month
 * card's arrangement. The totals and the figure are /api/energy's (the Now
 * card's `useLiveEnergy`, handed in); the curve is /api/energy/today.
 * Collapsible, so the month chart can have the height back.
 */
export function SolarTodayCard({
  energy,
  loading = false,
}: {
  energy: HomeEnergy;
  /** Today's totals haven't landed: a placeholder body under the header. */
  loading?: boolean;
}) {
  const today = useEnergyToday();
  const pct = coverage(energy);

  const lead = (
    <Stack gap="1" flexShrink={0}>
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
  );

  return (
    <Board
      collapsible
      storageKey="energy-today"
      title={<SectionTitle>Today</SectionTitle>}
    >
      {loading || today.isPending ? (
        <SolarTodaySkeleton />
      ) : today.data ? (
        <TodayPowerChart
          points={today.data.points}
          start={Date.parse(today.data.start)}
          end={Date.parse(today.data.end)}
          live={{
            production: energy.currentProduction,
            consumption: energy.currentConsumption,
          }}
          totals={{
            production: energy.productionToday,
            consumption: energy.consumptionToday,
          }}
          lead={lead}
          ring="bg.surface"
        />
      ) : (
        <Center minH={PLOT_HEIGHT}>
          <Text color="fg.muted">Today's curve isn't available</Text>
        </Center>
      )}
    </Board>
  );
}

/** The body's shape while it loads: the figure beside the keys, over the plot. */
function SolarTodaySkeleton() {
  return (
    <Stack gap="5">
      <HStack align="end" gap="4">
        <Stack gap="1" flexShrink={0}>
          <Skeleton height="9" width="4.5rem" />
          <Skeleton height="3" width="6rem" />
        </Stack>
        <Skeleton height="4" width="40%" mb="1" />
      </HStack>
      <Skeleton height={PLOT_HEIGHT} />
    </Stack>
  );
}
