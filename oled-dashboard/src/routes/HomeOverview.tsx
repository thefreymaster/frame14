import { useSyncExternalStore } from "react";
import { Box } from "@chakra-ui/react";
import { IoCloudOfflineOutline } from "react-icons/io5";
import { useHomeData } from "../hooks/useHomeData";
import { EnergySection } from "../components/EnergySection";
import { ClimateSection } from "../components/ClimateSection";
import { PrinterSection } from "../components/PrinterSection";
import { VacuumSection } from "../components/VacuumSection";
import { TeamTracker } from "../components/TeamTracker";
import { FanSection } from "../components/FanSection";
import { RadarSection } from "../components/RadarSection";
import { HomeHeader } from "../components/HomeHeader";
import { HomeWeatherCard } from "../components/HomeWeatherCard";
import { HomeForecastCard } from "../components/HomeForecastCard";
import { useDesktop } from "../hooks/useDesktop";
import { CalendarSection } from "../components/CalendarSection";
import { StatusStrip } from "../components/StatusStrip";
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
  // Each card shows its own placeholder until its data lands; the board and
  // every card that is ready render straight away.
  const { data, isError, loading } = useHomeData();
  const columns = useHomeColumns();
  const desktop = useDesktop();

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
    // A phone (one column) gets the compact weather card: it has a clock of
    // its own, and the full card's hero figures fill its screen. A desktop
    // has the clock in the header, so its card is the forecast instead.
    header:
      columns === 1 ? (
        <HomeWeatherCard
          internet={data.internet}
          weather={data.weather}
          loading={loading.weather}
        />
      ) : desktop ? (
        <HomeForecastCard
          internet={data.internet}
          weather={data.weather}
          loading={loading.weather}
        />
      ) : (
        <HomeHeader
          internet={data.internet}
          weather={data.weather}
          loading={loading.weather}
        />
      ),
    teamTracker: <TeamTracker />,
    radar: <RadarSection condition={data.weather?.state} />,
    energy: <EnergySection energy={data.energy} loading={loading.energy} />,
    climate: (
      <ClimateSection climate={data.climate} loading={loading.climate} />
    ),
    fan: <FanSection fan={data.fan} loading={loading.fan} />,
    calendar: (
      <CalendarSection
        today={data.calendar?.today ?? []}
        tomorrow={data.calendar?.tomorrow ?? []}
        loading={loading.calendar}
      />
    ),
    // Active-only sections: they claim a tile while running, and report as
    // chips in the status strip when they aren't.
    printer: <PrinterSection printer={data.printer} />,
    vacuum: <VacuumSection vacuum={data.vacuum} />,
    statusStrip: (
      <StatusStrip
        printer={data.printer}
        vacuum={data.vacuum}
        loading={loading.vacuum}
      />
    ),
  };

  // Keyed so each grid loads its own saved arrangement.
  return <HomeBoard key={columns} columns={columns} cards={cards} />;
}
