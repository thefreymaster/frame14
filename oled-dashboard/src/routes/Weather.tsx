import { Box, Skeleton, Stack, Tabs, Text } from "@chakra-ui/react";
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
import { useHomeWeather } from "../hooks/useHomeWeather";
import { roundTemp } from "../lib/forecast";

type WeatherTab = "hourly" | "daily" | "radar";

const TABS: { value: WeatherTab; label: string; icon: IconType }[] = [
  { value: "hourly", label: "Hourly", icon: IoTimeOutline },
  { value: "daily", label: "Daily", icon: IoCalendarOutline },
  { value: "radar", label: "Radar", icon: MdRadar },
];

/**
 * The /weather page, on the Energy page's plan: the weather now in a
 * collapsible Now card (WeatherNowCard: the hero, the forecast's advisories,
 * the conditions), then three tabs — Hourly (HourlyChart over the scrolling
 * HourlyForecast strip, the next 24 hours), Daily (DailyForecast, the days
 * ahead) and Radar (RadarMap, the interactive map that was /radar). The tab
 * is in the URL (`?tab=daily` / `?tab=radar`; none is Hourly), so /radar can
 * land on its tab.
 */
export function Weather() {
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

  // The radar fills its tab; the forecasts are cards sized to their content
  // (the tab scrolls when they are taller than the room, on a phone).
  function content(value: WeatherTab) {
    if (value === "radar") return <RadarMap flex="1" minH="0" />;
    if (loading) {
      return (
        <Board>
          <Skeleton height="12rem" />
        </Board>
      );
    }
    const list = value === "hourly" ? hours : days;
    if (!weather || list.length === 0) {
      return (
        <Board>
          <EmptyState
            icon={<IoCloudOfflineOutline />}
            title="No forecast"
            description="Home Assistant's forecast didn't answer."
          />
        </Board>
      );
    }
    return (
      <Box flexShrink={0}>
        <Board>
          {value === "hourly" ? (
            <Stack gap="4">
              <HourlyChart
                hours={hours}
                height={{ base: "7rem", md: "9rem" }}
              />
              <HourlyForecast hours={hours} scroll />
            </Stack>
          ) : (
            <DailyForecast days={days} current={weather.temperature} />
          )}
        </Board>
      </Box>
    );
  }

  return (
    <PageShell fill>
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

      {/* Now */}
      <Board
        collapsible
        storageKey="weather-now"
        title={<SectionTitle>Now</SectionTitle>}
      >
        {loading ? (
          <Skeleton height="7rem" />
        ) : weather ? (
          <WeatherNowCard weather={weather} />
        ) : (
          <EmptyState
            icon={<IoCloudOfflineOutline />}
            title="No weather"
            description="Home Assistant's weather entity didn't answer."
          />
        )}
      </Board>

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
              {t.value === "daily" && days.length > 1
                ? `${days.length}-day`
                : t.label}
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
