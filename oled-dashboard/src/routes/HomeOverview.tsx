import { useSyncExternalStore } from "react";
import { Box } from "@chakra-ui/react";
import { IoCloudOfflineOutline } from "react-icons/io5";
import { useHomeData } from "../hooks/useHomeData";
import { StatusBanner } from "../components/StatusBanner";
import { EnergySection } from "../components/EnergySection";
import { ClimateSection } from "../components/ClimateSection";
import { PrinterSection } from "../components/PrinterSection";
import { VacuumSection } from "../components/VacuumSection";
import { TeamTracker } from "../components/TeamTracker";
import { FanSection } from "../components/FanSection";
import { RadarSection } from "../components/RadarSection";
import { HomeHeader } from "../components/HomeHeader";
import { CalendarSection } from "../components/CalendarSection";
import { StatusStrip } from "../components/StatusStrip";
import { HomeOverviewSkeleton } from "../components/skeletons/HomeOverviewSkeleton";
import { HomeBoard } from "../components/HomeBoard";
import {
  HOME_FOUR_COLUMN_QUERY,
  HOME_ONE_COLUMN_QUERY,
  homeColumnsFor,
  type HomeCardId,
  type HomeColumns,
} from "../lib/homeLayout";
import { EmptyState } from "../components/ui/empty-state";

// ── Columns hook ─────────────────────────────────────────────────────────────

function subscribeColumns(onChange: () => void) {
  const queries = [HOME_ONE_COLUMN_QUERY, HOME_FOUR_COLUMN_QUERY].map((q) =>
    window.matchMedia(q),
  );
  queries.forEach((mql) => mql.addEventListener("change", onChange));
  return () =>
    queries.forEach((mql) => mql.removeEventListener("change", onChange));
}

/** Four columns on a desktop, two on the frame, one on a phone. */
function useHomeColumns(): HomeColumns {
  return useSyncExternalStore(subscribeColumns, () =>
    homeColumnsFor(
      window.matchMedia(HOME_ONE_COLUMN_QUERY).matches,
      window.matchMedia(HOME_FOUR_COLUMN_QUERY).matches,
    ),
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Box
      width="100%"
      height="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      {children}
    </Box>
  );
}

export function HomeOverview() {
  const { data, isError, isPending } = useHomeData();
  const columns = useHomeColumns();

  if (isPending) {
    return <HomeOverviewSkeleton columns={columns} />;
  }

  if (isError || !data) {
    return (
      <Centered>
        <EmptyState
          icon={<IoCloudOfflineOutline />}
          title="unavailable"
          description="Home Assistant didn't answer."
        />
      </Centered>
    );
  }

  const cards: Record<HomeCardId, React.ReactNode> = {
    header: <HomeHeader internet={data.internet} weather={data.weather} />,
    teamTracker: <TeamTracker />,
    radar: <RadarSection condition={data.weather?.state} />,
    energy: <EnergySection energy={data.energy} />,
    climate: <ClimateSection climate={data.climate} />,
    fan: <FanSection fan={data.fan} />,
    calendar: (
      <CalendarSection
        today={data.calendar?.today ?? []}
        tomorrow={data.calendar?.tomorrow ?? []}
      />
    ),
    // Active-only sections: they claim a tile while running, and report as
    // chips in the status strip when they aren't.
    printer: <PrinterSection printer={data.printer} />,
    vacuum: <VacuumSection vacuum={data.vacuum} />,
    statusStrip: <StatusStrip printer={data.printer} vacuum={data.vacuum} />,
  };

  return (
    <>
      <StatusBanner />
      {/* Keyed so each grid loads its own saved arrangement. */}
      <HomeBoard key={columns} columns={columns} cards={cards} />
    </>
  );
}
