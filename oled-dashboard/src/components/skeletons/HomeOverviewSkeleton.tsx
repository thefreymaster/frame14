import { Box } from "@chakra-ui/react";
import { useEntitiesConfig } from "../../hooks/useEntitiesConfig";
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
 * Loading state for /home — the same bento as HomeOverview with every tile
 * replaced by its placeholder, so the page doesn't jump when the data lands.
 *
 * Counts come from /api/entities (cached with staleTime: Infinity, so it is
 * usually already resolved) — that gets the number of thermostat tiles and fan
 * chips right instead of guessing. Printer, vacuum and team sections are
 * active-only in the real page, so they're represented by the status strip's
 * chips rather than tiles that would vanish on load.
 */
export function HomeOverviewSkeleton({
  isLandscape,
}: {
  isLandscape: boolean;
}) {
  const { data: config } = useEntitiesConfig();
  const climateCount = config?.climate?.length || DEFAULT_CLIMATE;
  const fanCount = config?.fans?.length ?? 0;
  const chipCount = config
    ? (config.printer ? 1 : 0) + (config.vacuums?.length ?? 0)
    : DEFAULT_CHIPS;

  if (isLandscape) {
    return (
      <>
        <StatusBanner />
        <Box
          width="100%"
          minHeight="100%"
          display="flex"
          flexDirection="row"
          alignItems="flex-start"
          gap="4"
          p="4"
        >
          <Box flex="1" minW="0" display="flex" flexDirection="column" gap="4">
            <HomeHeaderSkeleton />
            <EnergySkeleton />
          </Box>

          <Box flex="1" minW="0" display="flex" flexDirection="column" gap="4">
            <ClimateSkeleton count={climateCount} />
            {fanCount > 0 && <FanSkeleton count={fanCount} />}
            <CalendarSkeleton />
            {chipCount > 0 && <StatusStripSkeleton count={chipCount} />}
          </Box>
        </Box>
      </>
    );
  }

  return (
    <>
      <StatusBanner />
      <Box
        width="100%"
        minHeight="100%"
        display="grid"
        // One column on a phone, as HomeBoard does.
        gridTemplateColumns={{ base: "minmax(0, 1fr)", md: "1.15fr 1fr" }}
        alignContent="start"
        // Each card ends below its content, as on the live page — the climate
        // tiles are shorter than the column beside them.
        alignItems="start"
        gap="4"
        p="4"
      >
        <HomeHeaderSkeleton span={2} />

        <ClimateSkeleton count={climateCount} />

        <Box display="flex" flexDirection="column" gap="4" minW="0">
          <EnergySkeleton />
          <CalendarSkeleton />
        </Box>

        {fanCount > 0 && <FanSkeleton span={2} count={fanCount} />}

        {chipCount > 0 && <StatusStripSkeleton span={2} count={chipCount} />}
      </Box>
    </>
  );
}
