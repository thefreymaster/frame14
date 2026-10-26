import { useEffect, useRef } from "react";
import { Box, Flex, Grid, Skeleton, Stack, Tabs, Text } from "@chakra-ui/react";
import { useSearchParams } from "react-router";
import type { IconType } from "react-icons";
import {
  IoCalendarOutline,
  IoCloudOfflineOutline,
  IoPartlySunnyOutline,
  IoTimeOutline,
} from "react-icons/io5";
import { MdRadar } from "react-icons/md";
import { Board } from "../components/Board";
import { DailyForecast } from "../components/DailyForecast";
import { HourlyChart } from "../components/HourlyChart";
import { HourlyForecast } from "../components/HourlyForecast";
import { PageHeader } from "../components/PageHeader";
import { PageShell } from "../components/PageShell";
import { RadarMap } from "../components/RadarMap";
import { SectionTitle } from "../components/SectionTitle/SectionTitle";
import { WeatherNowCard } from "../components/WeatherNowCard";
import { EmptyState } from "../components/ui/empty-state";
import { useDesktop } from "../hooks/useDesktop";
import { useHomeWeather } from "../hooks/useHomeWeather";
import { roundTemp } from "../lib/forecast";
import { LIGHT_STRIP_CLEARANCE } from "../lib/navMetrics";

type WeatherTab = "hourly" | "daily" | "radar";

const TABS: { value: WeatherTab; label: string; icon: IconType }[] = [
  { value: "hourly", label: "Hourly", icon: IoTimeOutline },
  { value: "daily", label: "Daily", icon: IoCalendarOutline },
  { value: "radar", label: "Radar", icon: MdRadar },
];

/**
 * The radar's height on a desktop, where it is the last card of a page that
 * scrolls (in the tabs it fills its tab): wide, since it spans the page, and
 * tall enough for Windy's own controls and a few states around home.
 */
const RADAR_DESKTOP_HEIGHT = "30rem";

/**
 * The /weather page. On a phone and the frame it is on the Energy page's
 * plan: the weather now in a collapsible Now card (WeatherNowCard: the hero,
 * the forecast's advisories, the conditions), then three tabs — Hourly
 * (HourlyChart over the scrolling HourlyForecast strip, the next 24 hours),
 * Daily (DailyForecast, the days ahead) and Radar (RadarMap, the interactive
 * map that was /radar). The tab is in the URL (`?tab=daily` / `?tab=radar`;
 * none is Hourly), so /radar can land on its tab.
 *
 * A desktop (`useDesktop`) has the width for all of it at once, so there are
 * no tabs: a grid with the Now card (its hero and conditions side by side)
 * over the Hourly card in a wide left column, the days ahead in a column at
 * the right (stretched to the pair, its rows spaced to fill), and the radar
 * across the bottom at RADAR_DESKTOP_HEIGHT — the page scrolls to it (Layout
 * lets /weather scroll on a desktop), and `?tab=radar` scrolls there on
 * arrival.
 */
export function Weather() {
  const desktop = useDesktop();
  const { weather, loading } = useHomeWeather();
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: WeatherTab = raw === "daily" || raw === "radar" ? raw : "hourly";

  function setTab(next: string) {
    setParams(next === "hourly" ? {} : { tab: next }, { replace: true });
  }

  const hours = weather?.forecastHours ?? [];
  const days = weather?.forecastDaily ?? [];
  const today = days[0];
  const dailyLabel = days.length > 1 ? `${days.length}-day` : "Daily";

  // On a desktop, `/weather?tab=radar` (the old /radar) lands on the radar:
  // once the forecast above it has its data (and the route's entrance has
  // played out), the page scrolls so the radar's bottom clears the lights
  // strip — or the page's end, when the strip is off.
  const radarRef = useRef<HTMLDivElement>(null);
  const landedOnRadar = useRef(false);
  useEffect(() => {
    if (!desktop || tab !== "radar" || loading || landedOnRadar.current) return;
    landedOnRadar.current = true;
    const id = setTimeout(
      () => radarRef.current?.scrollIntoView({ block: "end" }),
      400,
    );
    return () => clearTimeout(id);
  }, [desktop, tab, loading]);

  // A forecast card's body: a Skeleton while loading, an EmptyState when the
  // forecast didn't come, else the forecast itself.
  function forecastBody(value: "hourly" | "daily") {
    if (loading) return <Skeleton height="12rem" />;
    const list = value === "hourly" ? hours : days;
    if (!weather || list.length === 0) {
      return (
        <EmptyState
          icon={<IoCloudOfflineOutline />}
          title="No forecast"
          description="Home Assistant's forecast didn't answer."
        />
      );
    }
    if (value === "hourly") {
      return (
        <Stack gap="4">
          <HourlyChart hours={hours} height={{ base: "7rem", md: "9rem" }} />
          <HourlyForecast hours={hours} scroll />
        </Stack>
      );
    }
    return (
      <DailyForecast days={days} current={weather.temperature} fill={desktop} />
    );
  }

  const header = (
    <PageHeader
      icon={<IoPartlySunnyOutline />}
      title="Weather"
      actions={
        today?.temperature != null &&
        today.templow != null && (
          <Text textStyle="sm" color="fg.muted" whiteSpace="nowrap">
            H {roundTemp(today.temperature)}° · L {roundTemp(today.templow)}°
          </Text>
        )
      }
    />
  );

  const nowBoard = (
    <Board
      collapsible
      storageKey="weather-now"
      title={<SectionTitle>Now</SectionTitle>}
    >
      {loading ? (
        <Skeleton height="7rem" />
      ) : weather ? (
        <WeatherNowCard weather={weather} wide={desktop} />
      ) : (
        <EmptyState
          icon={<IoCloudOfflineOutline />}
          title="No weather"
          description="Home Assistant's weather entity didn't answer."
        />
      )}
    </Board>
  );

  if (desktop) {
    return (
      <PageShell>
        {header}
        <Grid
          templateColumns="minmax(0, 2fr) minmax(0, 1fr)"
          templateAreas={`"now daily" "hourly daily" "radar radar"`}
          gap="gutter"
        >
          <Box gridArea="now" minW="0">
            {nowBoard}
          </Box>
          <Box gridArea="hourly" minW="0">
            <Board title={<SectionTitle>Hourly</SectionTitle>}>
              {forecastBody("hourly")}
            </Board>
          </Box>
          {/* A flex column, so the Board (`fill`) stretches to the two rows. */}
          <Flex gridArea="daily" direction="column" minW="0">
            <Board fill title={<SectionTitle>{dailyLabel}</SectionTitle>}>
              {forecastBody("daily")}
            </Board>
          </Flex>
          <Box
            ref={radarRef}
            gridArea="radar"
            minW="0"
            scrollMarginBottom={LIGHT_STRIP_CLEARANCE}
          >
            <Board title={<SectionTitle>Radar</SectionTitle>}>
              <RadarMap height={RADAR_DESKTOP_HEIGHT} rounded="sm" />
            </Board>
          </Box>
        </Grid>
      </PageShell>
    );
  }

  // The radar fills its tab; the forecasts are cards sized to their content
  // (the tab scrolls when they are taller than the room, on a phone).
  function content(value: WeatherTab) {
    if (value === "radar") return <RadarMap flex="1" minH="0" />;
    return (
      <Box flexShrink={0}>
        <Board>{forecastBody(value)}</Board>
      </Box>
    );
  }

  return (
    <PageShell fill>
      {header}

      {/* Now */}
      {nowBoard}

      {/* Hourly | Daily | Radar. A tab mounts when first opened (lazyMount)
          and stays, so the radar keeps its view while another tab is up. */}
      <Tabs.Root
        value={tab}
        onValueChange={(e) => setTab(e.value)}
        variant="line"
        fitted
        lazyMount
        display="flex"
        flexDirection="column"
        gap="gutter"
        flex="1"
        minH="0"
      >
        <Tabs.List flexShrink={0}>
          {TABS.map((t) => (
            <Tabs.Trigger key={t.value} value={t.value}>
              <t.icon />
              {t.value === "daily" ? dailyLabel : t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {TABS.map((t) => (
          <Tabs.Content
            key={t.value}
            value={t.value}
            p="0"
            flex="1"
            minH="0"
            display="flex"
            flexDirection="column"
            overflowY={t.value === "radar" ? undefined : "auto"}
            // The flex display would otherwise beat the hidden attribute.
            css={{ "&[hidden]": { display: "none" } }}
          >
            {content(t.value)}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </PageShell>
  );
}
