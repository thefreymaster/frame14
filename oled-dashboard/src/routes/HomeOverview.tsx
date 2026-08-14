import { useEffect, useState } from "react";
import { Box, Text } from "@chakra-ui/react";
import { useHomeData } from "../hooks/useHomeData";
import { StatusBanner } from "../components/StatusBanner";
import { EnergySection } from "../components/EnergySection";
import { ClimateSection } from "../components/ClimateSection";
import { ForecastSection } from "../components/ForecastSection";
import { PrinterSection } from "../components/PrinterSection";
import { VacuumSection } from "../components/VacuumSection";
import { FanSection } from "../components/FanSection";
import { HomeHeader } from "../components/HomeHeader";
import { CalendarSection } from "../components/CalendarSection";
import { StatusStrip } from "../components/StatusStrip";
import { GRID_GAP } from "../lib/surfaces";

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
    return (
      <Centered>
        <Text
          fontSize="3vmin"
          color="var(--theme-fg-faint)"
          letterSpacing="0.12em"
        >
          loading
        </Text>
      </Centered>
    );
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

  if (isLandscape) {
    return (
      <>
        <StatusBanner />
        <Box
          width="100%"
          minHeight="100%"
          bg="var(--theme-bg)"
          display="flex"
          flexDirection="row"
          alignItems="flex-start"
          gap={GRID_GAP}
          padding={GRID_GAP}
        >
          {/* Left column — time & weather */}
          <Box
            flex="1"
            minW="0"
            display="flex"
            flexDirection="column"
            gap={GRID_GAP}
          >
            <HomeHeader internet={data.internet} weather={data.weather} />
            {data.weather && (
              <ForecastSection forecast={data.weather.forecast} count={6} />
            )}
            <EnergySection energy={data.energy} />
            <FanSection fan={data.fan} />
            <PrinterSection printer={data.printer} />
            <VacuumSection vacuum={data.vacuum} />
          </Box>

          {/* Right column — details */}
          <Box
            flex="1"
            minW="0"
            display="flex"
            flexDirection="column"
            gap={GRID_GAP}
          >
            <ClimateSection climate={data.climate} />
            <CalendarSection
              today={data.calendar?.today ?? []}
              tomorrow={data.calendar?.tomorrow ?? []}
            />
            <StatusStrip printer={data.printer} vacuum={data.vacuum} />
          </Box>
        </Box>
      </>
    );
  }

  // Portrait — asymmetric bento. Wide blocks span both columns; climate takes
  // the wider left cell while energy and calendar stack in a narrower rail, so
  // no two tiles share a size and the layout stops reading as a flat stack.
  return (
    <>
      <StatusBanner />
      <Box
        width="100%"
        minHeight="100%"
        bg="var(--theme-bg)"
        display="grid"
        gridTemplateColumns="1.15fr 1fr"
        alignContent="start"
        gap={GRID_GAP}
        padding={GRID_GAP}
      >
        <HomeHeader span={2} internet={data.internet} weather={data.weather} />

        {data.weather && (
          <ForecastSection span={2} forecast={data.weather.forecast} count={6} />
        )}

        <ClimateSection climate={data.climate} />

        <Box display="flex" flexDirection="column" gap={GRID_GAP} minW="0">
          <EnergySection energy={data.energy} />
          <CalendarSection
            today={data.calendar?.today ?? []}
            tomorrow={data.calendar?.tomorrow ?? []}
          />
        </Box>

        {/* Active-only sections: they claim a full-width tile when running,
            and report as chips in the strip below when they aren't. */}
        <PrinterSection span={2} printer={data.printer} />
        <VacuumSection span={2} vacuum={data.vacuum} />

        <FanSection span={2} fan={data.fan} />

        <StatusStrip span={2} printer={data.printer} vacuum={data.vacuum} />
      </Box>
    </>
  );
}
