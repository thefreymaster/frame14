import { Flex, HStack, Skeleton, Tabs } from "@chakra-ui/react";
import { IoFlashOutline } from "react-icons/io5";
import {
  isEnergyTab,
  useEnergyTabs,
  type EnergyTab,
} from "../hooks/useEnergyTabs";
import { useFeatures } from "../hooks/useFeatures";
import { useLiveEnergy } from "../hooks/useLiveEnergy";
import { grid } from "../lib/energy";
import { Board } from "./Board";
import { CircuitsCard } from "./CircuitsCard";
import { GridBadge } from "./GridBadge";
import { GridDirectionBadge } from "./GridDirectionBadge";
import { PowerFlow } from "./PowerFlow";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { SolarHistoryCard } from "./SolarHistoryCard";
import { SolarTodayCard } from "./SolarTodayCard";

/**
 * The energy views, wherever they are shown: where the power is going now
 * (PowerFlow) in a Now card — its header saying which way the power goes
 * through the meter and how much, while any does — then two tabs: Solar,
 * today's card (SolarTodayCard: the coverage figure and the day's curve)
 * over the month or year chart (SolarHistoryCard), and Circuits, the
 * per-circuit draw (CircuitsCard). Only what the install has set up
 * (lib/features, 0.159.0): Now and Solar with the solar sensors, Circuits
 * with circuits.
 *
 * **The /energy page and the Home card's drawer are these same parts**
 * (0.176.0, the user: "When clicking the energ card from the Home Screen it
 * should just show the same energy components as the energy route. Don't
 * actually route though still should be in drawer"; the drawer had a today's
 * chart and split totals of its own until then). The caller says which tab
 * is up and hears of a change — the page's is its address, the drawer's its
 * own — and each Board draws itself as where it is asks (lib/boardFrame: a
 * card on the page, a titled well in the drawer).
 *
 * `page`: on the page they fill its height, the month chart taking what is
 * left, and a lone tab is still shown, since it is the page's address; in a
 * drawer each part is as tall as its contents and a lone tab says nothing.
 */
export function EnergyPanels({
  tab,
  onTab,
  page = false,
}: {
  tab: EnergyTab;
  onTab: (tab: EnergyTab) => void;
  page?: boolean;
}) {
  const live = useLiveEnergy();
  const features = useFeatures();
  const tabs = useEnergyTabs();
  const gap = page ? "gutter" : "6";

  return (
    <>
      {/* Now: the solar sensors' power flow. */}
      {features.solar && (
        <Board
          collapsible
          storageKey="energy-now"
          title={
            <Flex align="center" gap="3" rowGap="2" wrap="wrap" width="100%">
              <SectionTitle icon={<IoFlashOutline />}>Now</SectionTitle>
              {grid(live.energy).active && (
                <HStack gap="2" ms="auto">
                  <GridDirectionBadge energy={live.energy} />
                  <GridBadge energy={live.energy} />
                </HStack>
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
      )}

      {/* Solar | Circuits. A tab mounts when first opened (lazyMount) and
          stays, so Solar keeps its period while Circuits is up — and
          Circuits polls only once looked at. */}
      <Tabs.Root
        value={tab}
        onValueChange={(e) => {
          if (isEnergyTab(e.value)) onTab(e.value);
        }}
        variant="line"
        fitted
        lazyMount
        display="flex"
        flexDirection="column"
        gap={page ? "gutter" : "4"}
        flex={page ? "1" : undefined}
        minH={page ? "0" : undefined}
      >
        {(page || tabs.length > 1) && (
          <Tabs.List flexShrink={0}>
            {tabs.map((t) => (
              <Tabs.Trigger key={t.value} value={t.value}>
                <t.icon />
                {t.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        )}
        {tabs.map((t) => (
          <Tabs.Content
            key={t.value}
            value={t.value}
            p="0"
            flex={page ? "1" : undefined}
            minH={page ? "0" : undefined}
            display="flex"
            flexDirection="column"
            // The cards' gap, as everywhere: Solar stacks two.
            gap={gap}
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
    </>
  );
}
