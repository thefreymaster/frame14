import { useEffect, useState } from "react";
import { Box, Text } from "@chakra-ui/react";
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
import type { HomeCardId } from "../lib/homeLayout";

// ── Orientation hook ─────────────────────────────────────────────────────────

function useIsLandscape() {
  const [landscape, setLandscape] = useState(
    () => window.innerWidth > window.innerHeight,
  );
  useEffect(() => {
    const mql = window.matchMedia("(orientation: landscape)");
    const handler = (e: MediaQueryListEvent) => setLandscape(e.matches);
    mql.addEventListener("change", handler);
    setLandscape(mql.matches);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return landscape;
}

// ── Page ──────────────────────────────────────────────────────────────────────

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Box
      width="100%"
      height="100vh"
      bg="var(--theme-bg)"
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
  const isLandscape = useIsLandscape();

  if (isPending) {
    return <HomeOverviewSkeleton isLandscape={isLandscape} />;
  }

  if (isError || !data) {
    return (
      <Centered>
        <Text fontSize="3vmin" color="var(--theme-fg-faint)">
          unavailable
        </Text>
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

  const orientation = isLandscape ? "landscape" : "portrait";

  return (
    <>
      <StatusBanner />
      {/* Keyed so each orientation loads its own saved arrangement. */}
      <HomeBoard key={orientation} orientation={orientation} cards={cards} />
    </>
  );
}
