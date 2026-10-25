import { useState } from "react";
import {
  Box,
  Center,
  Flex,
  HStack,
  IconButton,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useEnergyMonthly, type NivoSeries } from "../hooks/useEnergyMonthly";
import { useEnergyYearly } from "../hooks/useEnergyYearly";
import { Board } from "./Board";
import { EnergyHistoryChart, type HistoryPoint } from "./EnergyHistoryChart";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { SegmentedControl } from "./ui/segmented-control";
import { fmtKwh } from "../lib/energy";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type View = "month" | "year";
type ChartMode = "total" | "daily";

interface Cursor {
  year: number;
  month: number;
}

const two = (n: number) => String(n).padStart(2, "0");

/** One series of the API's answer as x → y. */
function seriesOf(data: NivoSeries[], id: string) {
  return new Map(
    (data.find((s) => s.id === id)?.data ?? []).map((d) => [d.x, d.y]),
  );
}

/**
 * The period's slots — every day of the month or month of the year, so the
 * plot spans the whole period and the lines end where it has got to — each
 * with its x in the API's form, its readout name and its axis label if it
 * has one (every seventh day; every third month).
 */
function slotsOf(view: View, cursor: Cursor) {
  if (view === "year") {
    return MONTHS.map((name, m) => ({
      x: `${cursor.year}-${two(m + 1)}`,
      label: name,
      tick: m % 3 === 0 ? name.slice(0, 3) : null,
    }));
  }
  const days = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const mon = MONTHS[cursor.month].slice(0, 3);
  return Array.from({ length: days }, (_, i) => ({
    x: `${cursor.year}-${two(cursor.month + 1)}-${two(i + 1)}`,
    label: `${mon} ${i + 1}`,
    tick: i % 7 === 0 ? String(i + 1) : null,
  }));
}

/**
 * The Energy page's Solar tab: a month of days or a year of months in the
 * energy card's style — the coverage figure beside the keyed totals, over the
 * solar and home lines (EnergyHistoryChart). Total draws the running totals,
 * Daily each slot's own; the slot's mean temperature reads out with its name
 * in Daily. The card's header is the controls: the period between its
 * arrows, then Total / Daily and Month / Year.
 */
export function SolarHistoryCard() {
  const now = new Date();
  const [view, setView] = useState<View>("month");
  const [chartMode, setChartMode] = useState<ChartMode>("total");
  // Cursor: which month/year is being viewed.
  const [cursor, setCursor] = useState<Cursor>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  const isCurrentMonth =
    cursor.year === now.getFullYear() && cursor.month === now.getMonth();
  const isCurrentYear = cursor.year === now.getFullYear();
  const atNow = view === "month" ? isCurrentMonth : isCurrentYear;

  function shiftBack() {
    setCursor((c) => {
      if (view === "year") return { ...c, year: c.year - 1 };
      const month = c.month - 1;
      return month < 0 ? { year: c.year - 1, month: 11 } : { ...c, month };
    });
  }

  function shiftForward() {
    if (atNow) return;
    setCursor((c) => {
      if (view === "year") return { ...c, year: c.year + 1 };
      const month = c.month + 1;
      return month > 11 ? { year: c.year + 1, month: 0 } : { ...c, month };
    });
  }

  function switchView(next: View) {
    setView(next);
    // Year went out of range never happens; just snap month into current year
    if (next === "year" && cursor.year > now.getFullYear()) {
      setCursor((c) => ({ ...c, year: now.getFullYear() }));
    }
  }

  const monthParam = `${cursor.year}-${two(cursor.month + 1)}`;
  const period = view === "month" ? monthParam : String(cursor.year);
  // The header's name for the period, and the readout's (this year's months
  // go by name alone).
  const title =
    view === "month"
      ? `${MONTHS[cursor.month]} ${cursor.year}`
      : String(cursor.year);
  const periodName =
    view === "month"
      ? isCurrentYear
        ? MONTHS[cursor.month]
        : `${MONTHS[cursor.month]} ${cursor.year}`
      : String(cursor.year);

  const monthly = useEnergyMonthly(view === "month" ? monthParam : undefined);
  const yearly = useEnergyYearly(view === "year" ? cursor.year : undefined);
  const { data, isPending, isError } = view === "month" ? monthly : yearly;

  // The slots as the chart draws them, from whichever series the mode wants.
  const slots = slotsOf(view, cursor);
  const production = seriesOf(
    data ?? [],
    chartMode === "total" ? "runningProduction" : "production",
  );
  const consumption = seriesOf(
    data ?? [],
    chartMode === "total" ? "runningConsumption" : "consumption",
  );
  const temperature = seriesOf(data ?? [], "temperature");
  const points: HistoryPoint[] = slots.map((s) => ({
    label: s.label,
    production: production.get(s.x) ?? null,
    consumption: consumption.get(s.x) ?? null,
    temperature: chartMode === "daily" ? (temperature.get(s.x) ?? null) : null,
  }));
  const ticks = slots.flatMap((s, index) =>
    s.tick ? [{ index, label: s.tick }] : [],
  );

  // The period's totals: the running series' last values.
  const lastOf = (id: string) =>
    [...seriesOf(data ?? [], id).values()].filter((y) => y != null).at(-1) ?? 0;
  const prodTotal = lastOf("runningProduction");
  const consTotal = lastOf("runningConsumption");
  const pct = consTotal > 0 ? Math.round((prodTotal / consTotal) * 100) : 0;

  // Daily: the best slot, named. Running totals have no best.
  let note: string | null = null;
  if (chartMode === "daily") {
    const best = points.reduce<HistoryPoint | null>(
      (b, p) =>
        p.production != null && p.production > (b?.production ?? 0) ? p : b,
      null,
    );
    if (best) {
      note = `Best ${view === "month" ? "day" : "month"} ${fmtKwh(best.production!)} kWh · ${best.label}`;
    }
  }

  const lead = (
    <Stack gap="1" flexShrink={0}>
      <Text
        textStyle="4xl"
        fontWeight="semibold"
        lineHeight="1"
        letterSpacing="tight"
        color={pct >= 100 ? "fg.success" : "fg"}
        aria-label={`Solar covered ${pct}% of the use in ${periodName}`}
      >
        {pct}%
      </Text>
      <Text textStyle="xs" color="fg.muted" whiteSpace="nowrap">
        Solar covered in {periodName}
      </Text>
    </Stack>
  );

  return (
    <Board
      fill
      title={
        <Flex align="center" gap="3" rowGap="2" wrap="wrap" width="100%">
          {/* prev / period / next */}
          <HStack gap="1">
            <IconButton
              aria-label={view === "month" ? "Previous month" : "Previous year"}
              variant="ghost"
              size="sm"
              onClick={shiftBack}
            >
              <FiChevronLeft />
            </IconButton>
            {/* Wide enough for the longest month, so the arrows stay put. */}
            <Box minW="9rem" textAlign="center">
              <SectionTitle>{title}</SectionTitle>
            </Box>
            <IconButton
              aria-label={view === "month" ? "Next month" : "Next year"}
              variant="ghost"
              size="sm"
              disabled={atNow}
              onClick={shiftForward}
            >
              <FiChevronRight />
            </IconButton>
          </HStack>

          {/* The modes, at the right; on their own row when the header wraps. */}
          <HStack gap="3" rowGap="2" wrap="wrap" ms="auto">
            <SegmentedControl
              size="sm"
              items={[
                { value: "total", label: "Total" },
                { value: "daily", label: "Daily" },
              ]}
              value={chartMode}
              aria-label="Chart"
              onValueChange={(e) =>
                e.value && setChartMode(e.value as ChartMode)
              }
            />
            <SegmentedControl
              size="sm"
              items={[
                { value: "month", label: "Month" },
                { value: "year", label: "Year" },
              ]}
              value={view}
              aria-label="Period"
              onValueChange={(e) => e.value && switchView(e.value as View)}
            />
          </HStack>
        </Flex>
      }
    >
      {isPending ? (
        <Center height="100%">
          <Spinner size="lg" aria-label="Loading" />
        </Center>
      ) : isError || !data ? (
        <Center height="100%">
          <Text color="fg.muted">unavailable</Text>
        </Center>
      ) : (
        <EnergyHistoryChart
          // A new period or mode starts with the readout idle.
          key={`${view}-${chartMode}-${period}`}
          points={points}
          ticks={ticks}
          totals={{ production: prodTotal, consumption: consTotal }}
          note={note}
          lead={lead}
          ring="bg.surface"
          label={`${periodName}, ${chartMode === "total" ? "running totals" : view === "month" ? "by day" : "by month"}`}
        />
      )}
    </Board>
  );
}
