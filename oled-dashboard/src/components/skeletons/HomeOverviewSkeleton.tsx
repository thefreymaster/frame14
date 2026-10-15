import { useRef } from "react";
import { Box, Grid } from "@chakra-ui/react";
import { useEntitiesConfig } from "../../hooks/useEntitiesConfig";
import { PACKED_ROW_PX, usePackedRows } from "../../hooks/usePackedRows";
import {
  homeGridFor,
  loadHomeLayout,
  type HomeCardId,
  type HomeColumns,
} from "../../lib/homeLayout";
import { StatusBanner } from "../StatusBanner";
import { CalendarSkeleton } from "./CalendarSkeleton";
import { ClimateSkeleton } from "./ClimateSkeleton";
import { EnergySkeleton } from "./EnergySkeleton";
import { FanSkeleton } from "./FanSkeleton";
import { HomeHeaderSkeleton } from "./HomeHeaderSkeleton";
import { StatusStripSkeleton } from "./StatusStripSkeleton";

const DEFAULT_CLIMATE = 2;
const DEFAULT_CHIPS = 2;

/**
 * Loading state for /home — this device's saved arrangement (order and
 * widths, packed the same way as HomeBoard) with every card replaced by its
 * placeholder, so the page doesn't jump when the data lands.
 *
 * Counts come from /api/entities (cached with staleTime: Infinity, so it is
 * usually already resolved) — that gets the number of thermostat tiles and fan
 * chips right instead of guessing. Printer, vacuum, team and radar cards are
 * active-only in the real page, so they're represented by the status strip's
 * chips rather than placeholders that would vanish on load.
 */
export function HomeOverviewSkeleton({ columns }: { columns: HomeColumns }) {
  const { data: config } = useEntitiesConfig();
  const climateCount = config?.climate?.length || DEFAULT_CLIMATE;
  const fanCount = config?.fans?.length ?? 0;
  const chipCount = config
    ? (config.printer ? 1 : 0) + (config.vacuums?.length ?? 0)
    : DEFAULT_CHIPS;

  const placeholders: Partial<Record<HomeCardId, React.ReactNode>> = {
    header: <HomeHeaderSkeleton />,
    climate: <ClimateSkeleton count={climateCount} />,
    energy: <EnergySkeleton />,
    calendar: <CalendarSkeleton />,
    ...(fanCount > 0 && { fan: <FanSkeleton count={fanCount} /> }),
    ...(chipCount > 0 && {
      statusStrip: <StatusStripSkeleton count={chipCount} />,
    }),
  };
  const cards = loadHomeLayout(homeGridFor(columns)).filter(
    (card) => placeholders[card.id],
  );

  const gridRef = useRef<HTMLDivElement>(null);
  usePackedRows(gridRef, [cards.map((card) => card.id).join(), columns]);

  return (
    <>
      <StatusBanner />
      <Box width="100%" minHeight="100%" p="4">
        <Grid
          ref={gridRef}
          templateColumns={`repeat(${columns}, minmax(0, 1fr))`}
          autoRows={`${PACKED_ROW_PX}px`}
          autoFlow="row dense"
          columnGap="4"
          rowGap="0"
          alignItems="start"
        >
          {cards.map((card) => (
            <Box
              key={card.id}
              gridColumn={`span ${Math.min(card.span, columns)}`}
              display="flex"
              flexDirection="column"
              minW="0"
            >
              {placeholders[card.id]}
            </Box>
          ))}
        </Grid>
      </Box>
    </>
  );
}
