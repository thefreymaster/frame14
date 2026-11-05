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
import { HomeLightsSection } from "../components/HomeLightsSection";
import { RadarSection } from "../components/RadarSection";
import { HomeHeader } from "../components/HomeHeader";
import { HomeWeatherCard } from "../components/HomeWeatherCard";
import { HomeForecastCard } from "../components/HomeForecastCard";
import { useDesktop } from "../hooks/useDesktop";
import { useFeatures } from "../hooks/useFeatures";
import { CalendarSection } from "../components/CalendarSection";
import { HomeBoard } from "../components/HomeBoard";
import {
  HOME_FOUR_COLUMN_QUERY,
  HOME_ONE_COLUMN_QUERY,
  homeColumnsFor,
  type HomeCardId,
  type HomeColumns,
} from "../lib/homeLayout";
import { EmptyState } from "../components/ui/empty-state";
import { useReleaseSplash } from "../hooks/useReleaseSplash";

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
  // On a first load the launch splash waits for them all, so the board
  // arrives whole.
  useReleaseSplash(!Object.values(loading).some(Boolean));
  const columns = useHomeColumns();
  const desktop = useDesktop();
  const features = useFeatures();

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

  // A phone (one column) gets the compact weather card: it has a clock of
  // its own, and the full card's hero figures fill its screen. A desktop
  // has the clock in the header, so its card is the forecast instead.
  const frameHeader = columns !== 1 && !desktop;
  const header =
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
    );

  // Only what the install has set up (lib/features, 0.159.0): a card left
  // out here isn't on the board. Without weather the frame's header keeps
  // its date and clock; a phone's and a desktop's are the weather alone.
  const cards: Partial<Record<HomeCardId, React.ReactNode>> = {
    header: features.weather || frameHeader ? header : undefined,
    teamTracker: features.football ? <TeamTracker /> : undefined,
    radar: features.weather ? (
      <RadarSection condition={data.weather?.state} />
    ) : undefined,
    energy: features.solar ? (
      <EnergySection energy={data.energy} loading={loading.energy} />
    ) : undefined,
    climate: features.climate ? (
      <ClimateSection climate={data.climate} loading={loading.climate} />
    ) : undefined,
    fan: features.fans ? (
      <FanSection fan={data.fan} loading={loading.fan} />
    ) : undefined,
    calendar: (
      <CalendarSection
        today={data.calendar?.today ?? []}
        tomorrow={data.calendar?.tomorrow ?? []}
        loading={loading.calendar}
      />
    ),
    // Active-only sections: they claim a tile while running and are gone
    // when they aren't (the header's icons say they're running, too). The
    // lights: this device's favourites, else the ones that are on (0.143),
    // the card going with the last of them.
    lights: features.lights ? <HomeLightsSection /> : undefined,
    printer: features.printer ? <PrinterSection /> : undefined,
    vacuum: features.vacuum ? (
      <VacuumSection vacuum={data.vacuum} />
    ) : undefined,
  };

  // Keyed so each grid loads its own saved arrangement.
  return <HomeBoard key={columns} columns={columns} cards={cards} />;
}
