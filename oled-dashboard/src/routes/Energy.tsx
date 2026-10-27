import { Box, Flex, Skeleton, Tabs } from "@chakra-ui/react";
import { useSearchParams } from "react-router";
import type { IconType } from "react-icons";
import { IoFlash } from "react-icons/io5";
import { MdElectricBolt } from "react-icons/md";
import { PiSolarRoof } from "react-icons/pi";
import { useLiveEnergy } from "../hooks/useLiveEnergy";
import { Board } from "../components/Board";
import { CircuitsCard } from "../components/CircuitsCard";
import { GridBadge } from "../components/GridBadge";
import { PageHeader } from "../components/PageHeader";
import { PageShell } from "../components/PageShell";
import { PowerFlow } from "../components/PowerFlow";
import { SectionTitle } from "../components/SectionTitle/SectionTitle";
import { SolarHistoryCard } from "../components/SolarHistoryCard";
import { SolarTodayCard } from "../components/SolarTodayCard";
import { grid } from "../lib/energy";

type EnergyTab = "solar" | "circuits";

const TABS: { value: EnergyTab; label: string; icon: IconType }[] = [
  { value: "solar", label: "Solar", icon: PiSolarRoof },
  { value: "circuits", label: "Circuits", icon: MdElectricBolt },
];

/**
 * The /energy page: where the power is going now (PowerFlow, as on the
 * energy card and in its dialog) in a collapsible Now card, then two tabs —
 * Solar, today's card (SolarTodayCard: the coverage figure and the day's
 * curve, as on the Home card) over the month or year chart
 * (SolarHistoryCard), and Circuits, the per-circuit draw (CircuitsCard). The
 * tab is in the URL (`?tab=circuits`; none is Solar), so the old /power path
 * can land on its tab.
 */
export function Energy() {
  const live = useLiveEnergy();
  const [params, setParams] = useSearchParams();
  const tab: EnergyTab = params.get("tab") === "circuits" ? "circuits" : "solar";

  function setTab(next: string) {
    setParams(next === "circuits" ? { tab: next } : {}, { replace: true });
  }

  return (
    <PageShell fill>
      <PageHeader icon={<IoFlash />} title="Energy" />

      {/* Now */}
      <Board
        collapsible
        storageKey="energy-now"
        title={
          <Flex align="center" gap="3" rowGap="2" wrap="wrap" width="100%">
            <SectionTitle>Now</SectionTitle>
            {grid(live.energy).active && (
              <Box ms="auto">
                <GridBadge energy={live.energy} />
              </Box>
            )}
          </Flex>
        }
      >
        {live.loading ? (
          <Skeleton height="7.5rem" />
        ) : (
          <PowerFlow energy={live.energy} />
        )}
      </Board>

      {/* Solar | Circuits. A tab mounts when first opened (lazyMount) and
          stays, so Solar keeps its period while Circuits is up. */}
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
              {t.label}
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
            // The cards' gap, as everywhere: Solar stacks two.
            gap="gutter"
            // The flex display would otherwise beat the hidden attribute.
            css={{ "&[hidden]": { display: "none" } }}
          >
            {t.value === "solar" ? (
              <>
                <SolarTodayCard energy={live.energy} loading={live.loading} />
                <SolarHistoryCard />
              </>
            ) : (
              <CircuitsCard />
            )}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </PageShell>
  );
}
