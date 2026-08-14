import { useMemo, useState } from "react";
import { Box, HStack, VStack, Text } from "@chakra-ui/react";
import { ResponsiveLine } from "@nivo/line";
import { PiSolarRoof } from "react-icons/pi";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useEnergyMonthly } from "../hooks/useEnergyMonthly";
import { useEnergyYearly } from "../hooks/useEnergyYearly";
import { useThemeMode } from "../hooks/useThemeMode";
import { Board } from "../components/Board";
import { PageShell } from "../components/PageShell";
import { PageHeader } from "../components/PageHeader";
import { ControlButton } from "../components/ControlButton";
import { CHIP_RADIUS } from "../lib/surfaces";
import { FONT_BODY } from "../lib/typography";

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

// Built per-render inside component — must react to theme changes

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

  const consumptionColor = isDark ? "rgba(255,255,255,0.55)" : "#4A5568";
  const temperatureColor = isDark ? "rgba(56,189,248,0.6)" : "#0284c7";
  // Tooltip floats over the chart card, so it steps up one surface level.
  const tooltipBg = "var(--theme-surface-2)";
  const tooltipFg = "var(--theme-fg)";
  const crosshairColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
  const tickColor = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.35)";

  const nivoTheme = useMemo(
    () => ({
      background: "transparent",
      text: { fontFamily: FONT_BODY, fontSize: 10 },
      axis: {
        ticks: {
          text: { fill: tickColor, fontFamily: FONT_BODY, fontSize: 10 },
          line: { stroke: "transparent" },
        },
        domain: { line: { stroke: "transparent" } },
      },
      crosshair: { line: { stroke: crosshairColor, strokeWidth: 1 } },
    }),
    [isDark, tickColor, crosshairColor],
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
    pct >= 100 ? "#22c55e" : pct >= 60 ? "#eab308" : "var(--theme-fg-faint)";

  return (
    <PageShell fill>
      <PageHeader
        icon={<PiSolarRoof />}
        iconColor="yellow.500"
        title="SOLAR"
        actions={
          <HStack gap="1.5vmin" rowGap="1vmin" wrap="wrap" align="center">
            {/* total / daily toggle */}
            <HStack gap="0.6vmin">
              {(["total", "daily"] as ChartMode[]).map((m) => (
                <ControlButton
                  key={m}
                  active={chartMode === m}
                  onClick={() => setChartMode(m)}
                  py="0.9vmin"
                  px="2.4vmin"
                >
                  <Text fontSize="2vmin" letterSpacing="0.08em">
                    {m === "total" ? "TOTAL" : "DAILY"}
                  </Text>
                </ControlButton>
              ))}
            </HStack>

            {/* month / year toggle */}
            <HStack gap="0.6vmin">
              {(["month", "year"] as View[]).map((v) => (
                <ControlButton
                  key={v}
                  active={view === v}
                  onClick={() => switchView(v)}
                  py="0.9vmin"
                  px="2.4vmin"
                >
                  <Text fontSize="2vmin" letterSpacing="0.08em">
                    {v === "month" ? "MONTH" : "YEAR"}
                  </Text>
                </ControlButton>
              ))}
            </HStack>

            {/* prev / label / next */}
            <HStack
              gap="0.6vmin"
              align="center"
              bg="var(--theme-surface-2)"
              borderRadius={CHIP_RADIUS}
              px="1.2vmin"
              py="0.6vmin"
            >
              <Box
                as="button"
                onClick={shiftBack}
                fontSize="3vmin"
                lineHeight="1"
                color="var(--theme-fg-dim)"
                display="flex"
              >
                <FiChevronLeft />
              </Box>
              <Text
                fontSize="2vmin"
                fontWeight="400"
                color="var(--theme-fg-dim)"
                letterSpacing="0.08em"
                minW="11vmin"
                textAlign="center"
              >
                {label}
              </Text>
              <Box
                as="button"
                onClick={shiftForward}
                fontSize="3vmin"
                lineHeight="1"
                color={atNow ? "var(--theme-divider)" : "var(--theme-fg-dim)"}
                display="flex"
                pointerEvents={atNow ? "none" : "auto"}
              >
                <FiChevronRight />
              </Box>
            </HStack>
          </HStack>
        }
      />

      {/* Stats */}
      <Board>
        <HStack justify="space-between" align="flex-end" width="100%" minW="0">
          <VStack align="flex-start" gap="0.4vmin">
            <Text
              className="display-numeral"
              fontSize="7vmin"
              fontWeight="300"
              lineHeight="1"
              color="yellow.500"
            >
              {fmtKwh(prodTotal as number)}
              <Text as="span" fontSize="3vmin" color="yellow.700" ml="1vmin">
                kWh
              </Text>
            </Text>
            <Text
              fontSize="2.2vmin"
              color="var(--theme-fg-faint)"
              letterSpacing="0.1em"
            >
              PRODUCED
            </Text>
          </VStack>

          <VStack align="center" gap="0.4vmin">
            <Text
              className="display-numeral"
              fontSize="7vmin"
              fontWeight="400"
              lineHeight="1"
              style={{ color: pctColor }}
            >
              {pct}%
            </Text>
            <Text
              fontSize="2.2vmin"
              color="var(--theme-fg-faint)"
              letterSpacing="0.1em"
            >
              SOLAR
            </Text>
          </VStack>

          <VStack align="flex-end" gap="0.4vmin">
            <Text
              className="display-numeral"
              fontSize="7vmin"
              fontWeight="300"
              lineHeight="1"
              color="var(--theme-fg-dim)"
            >
              {fmtKwh(consTotal as number)}
              <Text
                as="span"
                fontSize="3vmin"
                color="var(--theme-fg-faint)"
                ml="1vmin"
              >
                kWh
              </Text>
            </Text>
            <Text
              fontSize="2.2vmin"
              color="var(--theme-fg-faint)"
              letterSpacing="0.1em"
            >
              CONSUMED
            </Text>
          </VStack>
        </HStack>
      </Board>

      {/* Chart */}
      <Board fill>
        <Box height="100%" display="flex" flexDirection="column" minH="0">
          {isPending && (
            <Box
              height="100%"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text
                fontSize="2.8vmin"
                color="var(--theme-fg-faint)"
                letterSpacing="0.1em"
              >
                loading
              </Text>
            </Box>
          )}
          {isError && (
            <Box
              height="100%"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="2.8vmin" color="var(--theme-fg-faint)">
                unavailable
              </Text>
            </Box>
          )}
          {!isPending && !isError && chartData.length > 0 && (
            <Box
              key={`${view}-${chartMode}-${label}`}
              className="solar-chart-reveal"
              flex="1"
              minH="0"
            >
              <ResponsiveLine
                data={chartData}
                theme={nivoTheme}
                colors={["#fbbf24", consumptionColor, temperatureColor]}
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
                      { offset: 0, color: "#fbbf24", opacity: 0.22 },
                      { offset: 100, color: "#fbbf24", opacity: 0 },
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
                      { offset: 0, color: "#000000", opacity: 0 },
                      { offset: 100, color: "#000000", opacity: 0 },
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
                    ? "AVG TEMP"
                    : String(point.seriesId)
                          .toLowerCase()
                          .includes("production")
                      ? "PRODUCED"
                      : "CONSUMED";
                  return (
                    <Box
                      px="2.5vmin"
                      py="1.5vmin"
                      borderRadius={CHIP_RADIUS}
                      style={{ pointerEvents: "none", background: tooltipBg }}
                    >
                      <Text
                        fontSize="2.2vmin"
                        mb="0.5vmin"
                        style={{ color: tooltipFg, opacity: 0.5 }}
                      >
                        {xLabel}
                      </Text>
                      <Text
                        fontSize="3vmin"
                        fontWeight="500"
                        style={{ color: point.seriesColor }}
                      >
                        {valueLabel}
                      </Text>
                      <Text
                        fontSize="2vmin"
                        letterSpacing="0.08em"
                        style={{ color: tooltipFg, opacity: 0.4 }}
                      >
                        {seriesLabel}
                      </Text>
                    </Box>
                  );
                }}
              />
            </Box>
          )}

          {/* Legend */}
          <HStack gap="5vmin" justify="center" mt="2vmin" flexShrink={0}>
            <HStack gap="1.5vmin" align="center">
              <Box w="4vmin" h="1.5px" bg="yellow.500" borderRadius="full" />
              <Text
                fontSize="2.2vmin"
                color="var(--theme-fg-faint)"
                letterSpacing="0.1em"
              >
                PRODUCTION
              </Text>
            </HStack>
            <HStack gap="1.5vmin" align="center">
              {/* Same colour the series is drawn in, so the swatch tracks the
                theme instead of staying white on the bright palette. */}
              <Box
                w="4vmin"
                h="1.5px"
                borderRadius="full"
                style={{ background: consumptionColor }}
              />
              <Text
                fontSize="2.2vmin"
                color="var(--theme-fg-faint)"
                letterSpacing="0.1em"
              >
                CONSUMPTION
              </Text>
            </HStack>
            {chartMode === "daily" && (
              <HStack gap="1.5vmin" align="center">
                <Box
                  w="4vmin"
                  h="1.5px"
                  borderRadius="full"
                  style={{ background: temperatureColor }}
                />
                <Text
                  fontSize="2.2vmin"
                  color="var(--theme-fg-faint)"
                  letterSpacing="0.1em"
                >
                  TEMP
                </Text>
              </HStack>
            )}
          </HStack>
        </Box>
      </Board>
    </PageShell>
  );
}
