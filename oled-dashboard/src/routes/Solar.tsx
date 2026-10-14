import { useMemo, useState } from "react";
import {
  Box,
  Center,
  HStack,
  IconButton,
  Spinner,
  Stat,
  Text,
  defaultSystem,
} from "@chakra-ui/react";
import { ResponsiveLine } from "@nivo/line";
import { PiSolarRoof } from "react-icons/pi";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useEnergyMonthly } from "../hooks/useEnergyMonthly";
import { useEnergyYearly } from "../hooks/useEnergyYearly";
import { useThemeMode } from "../hooks/useThemeMode";
import { Board } from "../components/Board";
import { PageShell } from "../components/PageShell";
import { PageHeader } from "../components/PageHeader";
import { SegmentedControl } from "../components/ui/segmented-control";

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

const FONT_BODY = "var(--chakra-fonts-body)";

/** A palette colour as a literal — nivo mixes opacities, so CSS vars won't do. */
const color = (path: string) => defaultSystem.token(`colors.${path}`) as string;

function fmtKwh(n: number) {
  return n.toFixed(1);
}

type View = "month" | "year";
type ChartMode = "total" | "daily";

export function Solar() {
  const now = new Date();
  const [view, setView] = useState<View>("month");
  const [chartMode, setChartMode] = useState<ChartMode>("total");
  // Cursor: which month/year is being viewed.
  const [cursor, setCursor] = useState({
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

  const monthParam = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
  const label =
    view === "month"
      ? `${MONTHS[cursor.month].slice(0, 3).toUpperCase()} ${cursor.year}`
      : `${cursor.year}`;

  const { effectiveMode } = useThemeMode();
  const isDark = effectiveMode === "dark";

  const productionColor = color("yellow.500");
  const consumptionColor = isDark ? color("gray.400") : color("gray.600");
  const temperatureColor = isDark ? color("blue.400") : color("blue.600");
  const crosshairColor = isDark ? color("gray.700") : color("gray.300");
  const tickColor = isDark ? color("gray.500") : color("gray.600");
  // Chart text at Chakra's `xs`, which follows the page's root size.
  const tickSize =
    parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.75;

  const nivoTheme = useMemo(
    () => ({
      background: "transparent",
      text: { fontFamily: FONT_BODY, fontSize: tickSize },
      axis: {
        ticks: {
          text: { fill: tickColor, fontFamily: FONT_BODY, fontSize: tickSize },
          line: { stroke: "transparent" },
        },
        domain: { line: { stroke: "transparent" } },
      },
      crosshair: { line: { stroke: crosshairColor, strokeWidth: 1 } },
    }),
    [tickColor, crosshairColor, tickSize],
  );

  const monthly = useEnergyMonthly(view === "month" ? monthParam : undefined);
  const yearly = useEnergyYearly(view === "year" ? cursor.year : undefined);
  const { data, isPending, isError } = view === "month" ? monthly : yearly;

  // Temperature is on a different scale (°F vs kWh) — normalize it into the
  // upper band of the energy y-range and keep actual values for the tooltip.
  const { chartData, tempByX } = useMemo(() => {
    if (!data) return { chartData: [], tempByX: new Map<string, number>() };

    const wanted =
      chartMode === "total"
        ? ["runningProduction", "runningConsumption"]
        : ["production", "consumption"];
    const energySeries = data
      .filter((s) => wanted.includes(s.id))
      .map((s) => ({
        id: s.id,
        data: s.data.filter((d): d is { x: string; y: number } => d.y != null),
      }));

    const tempByX = new Map<string, number>();
    if (chartMode === "daily") {
      const tempPoints =
        data
          .find((s) => s.id === "temperature")
          ?.data.filter((d): d is { x: string; y: number } => d.y != null) ??
        [];
      for (const p of tempPoints) tempByX.set(p.x, p.y);

      const energyMax = Math.max(
        0,
        ...energySeries.flatMap((s) => s.data.map((d) => d.y)),
      );
      if (tempPoints.length > 0 && energyMax > 0) {
        const temps = tempPoints.map((p) => p.y);
        const tMin = Math.min(...temps);
        const tMax = Math.max(...temps);
        const lo = energyMax * 0.55;
        const hi = energyMax * 0.95;
        const scale = (t: number) =>
          tMax === tMin
            ? (lo + hi) / 2
            : lo + ((t - tMin) / (tMax - tMin)) * (hi - lo);
        energySeries.push({
          id: "temperature",
          data: tempPoints.map((p) => ({ x: p.x, y: scale(p.y) })),
        });
      }
    }

    return { chartData: energySeries, tempByX };
  }, [data, chartMode]);

  const prodTotal =
    data?.find((s) => s.id === "runningProduction")?.data.at(-1)?.y ?? 0;
  const consTotal =
    data?.find((s) => s.id === "runningConsumption")?.data.at(-1)?.y ?? 0;
  const pct = consTotal > 0 ? Math.round((prodTotal / consTotal) * 100) : 0;
  const pctColor =
    pct >= 100 ? "green.fg" : pct >= 60 ? "yellow.fg" : "fg.muted";

  return (
    <PageShell fill>
      <PageHeader
        icon={<PiSolarRoof />}
        iconColor="yellow.500"
        title="Solar"
        actions={
          <HStack gap="3" rowGap="2" wrap="wrap">
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

            {/* prev / label / next */}
            <HStack gap="1">
              <IconButton
                aria-label={
                  view === "month" ? "Previous month" : "Previous year"
                }
                variant="ghost"
                size="sm"
                onClick={shiftBack}
              >
                <FiChevronLeft />
              </IconButton>
              <Text
                textStyle="sm"
                fontWeight="medium"
                minW="5rem"
                textAlign="center"
              >
                {label}
              </Text>
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
          </HStack>
        }
      />

      {/* Stats */}
      <Board>
        <HStack justify="space-between" align="flex-end" width="100%" minW="0">
          <Stat.Root size="lg" alignItems="flex-start">
            <Stat.Label>Produced</Stat.Label>
            <Stat.ValueText color="yellow.fg">
              {fmtKwh(prodTotal as number)}
              <Stat.ValueUnit>kWh</Stat.ValueUnit>
            </Stat.ValueText>
          </Stat.Root>
          <Stat.Root size="lg" alignItems="center">
            <Stat.Label>Solar</Stat.Label>
            <Stat.ValueText color={pctColor}>{pct}%</Stat.ValueText>
          </Stat.Root>
          <Stat.Root size="lg" alignItems="flex-end">
            <Stat.Label>Consumed</Stat.Label>
            <Stat.ValueText>
              {fmtKwh(consTotal as number)}
              <Stat.ValueUnit>kWh</Stat.ValueUnit>
            </Stat.ValueText>
          </Stat.Root>
        </HStack>
      </Board>

      {/* Chart */}
      <Board fill>
        <Box height="100%" display="flex" flexDirection="column" minH="0">
          {isPending && (
            <Center height="100%">
              <Spinner size="lg" aria-label="Loading" />
            </Center>
          )}
          {isError && (
            <Center height="100%">
              <Text color="fg.muted">unavailable</Text>
            </Center>
          )}
          {!isPending && !isError && chartData.length > 0 && (
            <Box
              key={`${view}-${chartMode}-${label}`}
              animation="chart-reveal 0.9s cubic-bezier(0.4, 0, 0.2, 1) both"
              flex="1"
              minH="0"
            >
              <ResponsiveLine
                data={chartData}
                theme={nivoTheme}
                colors={[productionColor, consumptionColor, temperatureColor]}
                curve="monotoneX"
                lineWidth={1.5}
                enablePoints={false}
                enableGridX={false}
                enableGridY={false}
                enableArea={true}
                areaOpacity={1}
                areaBlendMode="normal"
                defs={[
                  {
                    id: "solarProdArea",
                    type: "linearGradient",
                    colors: [
                      { offset: 0, color: productionColor, opacity: 0.22 },
                      { offset: 100, color: productionColor, opacity: 0 },
                    ],
                  },
                  {
                    id: "solarConsArea",
                    type: "linearGradient",
                    colors: [
                      { offset: 0, color: consumptionColor, opacity: 0.18 },
                      { offset: 100, color: consumptionColor, opacity: 0 },
                    ],
                  },
                  {
                    id: "solarNoArea",
                    type: "linearGradient",
                    colors: [
                      { offset: 0, color: productionColor, opacity: 0 },
                      { offset: 100, color: productionColor, opacity: 0 },
                    ],
                  },
                ]}
                fill={[
                  { match: { id: "runningProduction" }, id: "solarProdArea" },
                  { match: { id: "production" }, id: "solarProdArea" },
                  { match: { id: "runningConsumption" }, id: "solarConsArea" },
                  { match: { id: "consumption" }, id: "solarConsArea" },
                  { match: { id: "temperature" }, id: "solarNoArea" },
                ]}
                axisLeft={null}
                axisRight={null}
                axisTop={null}
                axisBottom={{
                  tickSize: 0,
                  tickPadding: 10,
                  format: (v) => {
                    if (view === "year") {
                      const m = parseInt(String(v).slice(5, 7), 10) - 1;
                      return MONTHS[m]?.slice(0, 3) ?? "";
                    }
                    const day = parseInt(String(v).slice(-2), 10);
                    return day % 7 === 1 ? String(day) : "";
                  },
                }}
                margin={{ top: 12, right: 4, bottom: 32, left: 4 }}
                animate={true}
                motionConfig="gentle"
                isInteractive={true}
                enableCrosshair={true}
                crosshairType="x"
                useMesh={true}
                tooltip={({ point }) => {
                  const x = String(point.data.x);
                  const xLabel =
                    view === "year"
                      ? (MONTHS[parseInt(x.slice(5, 7), 10) - 1] ?? x)
                      : x.slice(5);
                  const isTemp = point.seriesId === "temperature";
                  const valueLabel = isTemp
                    ? `${Math.round(tempByX.get(x) ?? 0)}°F`
                    : `${(point.data.y as number).toFixed(1)} kWh`;
                  const seriesLabel = isTemp
                    ? "Avg temp"
                    : String(point.seriesId)
                          .toLowerCase()
                          .includes("production")
                      ? "Produced"
                      : "Consumed";
                  return (
                    <Box
                      bg="bg.panel"
                      borderWidth="1px"
                      shadow="md"
                      rounded="l2"
                      px="3"
                      py="2"
                      pointerEvents="none"
                    >
                      <Text textStyle="xs" color="fg.muted">
                        {xLabel}
                      </Text>
                      <Text
                        textStyle="lg"
                        fontWeight="semibold"
                        style={{ color: point.seriesColor }}
                      >
                        {valueLabel}
                      </Text>
                      <Text textStyle="xs" color="fg.muted">
                        {seriesLabel}
                      </Text>
                    </Box>
                  );
                }}
              />
            </Box>
          )}

          {/* Legend */}
          <HStack
            gap="6"
            justify="center"
            mt="3"
            flexShrink={0}
            textStyle="sm"
            color="fg.muted"
          >
            <HStack gap="2">
              <Box
                w="6"
                h="0.5"
                rounded="full"
                style={{ background: productionColor }}
              />
              <Text>Production</Text>
            </HStack>
            <HStack gap="2">
              <Box
                w="6"
                h="0.5"
                rounded="full"
                style={{ background: consumptionColor }}
              />
              <Text>Consumption</Text>
            </HStack>
            {chartMode === "daily" && (
              <HStack gap="2">
                <Box
                  w="6"
                  h="0.5"
                  rounded="full"
                  style={{ background: temperatureColor }}
                />
                <Text>Temp</Text>
              </HStack>
            )}
          </HStack>
        </Box>
      </Board>
    </PageShell>
  );
}
