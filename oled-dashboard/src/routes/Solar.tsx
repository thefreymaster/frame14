import { useMemo } from "react";
import { Box, HStack, VStack, Text } from "@chakra-ui/react";
import { ResponsiveLine } from "@nivo/line";
import { PiSolarRoof } from "react-icons/pi";
import { useEnergyMonthly } from "../hooks/useEnergyMonthly";
import { useThemeMode } from "../hooks/useThemeMode";

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
  return n.toFixed(0);
}

export function Solar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthLabel = `${MONTHS[month].slice(0, 3).toUpperCase()} ${year}`;

  const { effectiveMode } = useThemeMode();
  const isDark = effectiveMode === "dark";

  const consumptionColor = isDark ? "rgba(255,255,255,0.55)" : "#4A5568";
  const tooltipBg = isDark ? "#111111" : "#f0f4f8";
  const tooltipFg = isDark ? "rgba(255,255,255,0.8)" : "#1A202C";
  const crosshairColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
  const tickColor = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.35)";

  const nivoTheme = useMemo(() => ({
    background: "transparent",
    text: { fontFamily: "Inter, sans-serif", fontSize: 10 },
    axis: {
      ticks: {
        text: { fill: tickColor, fontFamily: "Inter, sans-serif", fontSize: 10 },
        line: { stroke: "transparent" },
      },
      domain: { line: { stroke: "transparent" } },
    },
    crosshair: { line: { stroke: crosshairColor, strokeWidth: 1 } },
  }), [isDark, tickColor, crosshairColor]);

  const { data, isPending, isError } = useEnergyMonthly();

  const chartData = useMemo(() => {
    if (!data) return [];
    return data
      .filter((s) => s.id === "runningProduction" || s.id === "runningConsumption")
      .map((s) => ({
        id: s.id,
        data: s.data.filter((d): d is { x: string; y: number } => d.y != null),
      }));
  }, [data]);

  const prodTotal =
    data?.find((s) => s.id === "runningProduction")?.data.at(-1)?.y ?? 0;
  const consTotal =
    data?.find((s) => s.id === "runningConsumption")?.data.at(-1)?.y ?? 0;
  const pct = consTotal > 0 ? Math.round((prodTotal / consTotal) * 100) : 0;
  const pctColor =
    pct >= 100 ? "#22c55e" : pct >= 60 ? "#eab308" : "rgba(255,255,255,0.35)";

  return (
    <Box
      width="100%"
      height="100%"
      bg="var(--theme-bg)"
      display="flex"
      flexDirection="column"
      px="6vmin"
      pt="5vmin"
      pb="3vmin"
      overflow="hidden"
    >
      {/* Header */}
      <HStack justify="space-between" align="center" mb="4vmin">
        <HStack gap="2vmin" align="center">
          <Box color="yellow.500" fontSize="5vmin" lineHeight="1">
            <PiSolarRoof />
          </Box>
          <Text
            fontSize="3vmin"
            fontWeight="500"
            letterSpacing="0.14em"
            color="var(--theme-fg-dim)"
          >
            SOLAR
          </Text>
        </HStack>
        <Text
          fontSize="2.8vmin"
          fontWeight="300"
          color="var(--theme-fg-faint)"
          letterSpacing="0.08em"
        >
          {monthLabel}
        </Text>
      </HStack>

      {/* Stats */}
      <HStack justify="space-between" align="flex-end" mb="5vmin" px="0.5vmin">
        <VStack align="flex-start" gap="0.4vmin">
          <Text
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

      {/* Chart */}
      <Box flex="1" minH="0">
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
          <ResponsiveLine
            data={chartData}
            theme={nivoTheme}
            colors={["#fbbf24", consumptionColor]}
            curve="monotoneX"
            lineWidth={1.5}
            enablePoints={false}
            enableGridX={false}
            enableGridY={false}
            enableArea={true}
            areaOpacity={0.07}
            areaBlendMode="normal"
            axisLeft={null}
            axisRight={null}
            axisTop={null}
            axisBottom={{
              tickSize: 0,
              tickPadding: 10,
              format: (v) => {
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
            tooltip={({ point }) => (
              <Box
                px="2.5vmin"
                py="1.5vmin"
                borderRadius="1vmin"
                style={{ pointerEvents: "none", background: tooltipBg }}
              >
                <Text
                  fontSize="2.2vmin"
                  mb="0.5vmin"
                  style={{ color: tooltipFg, opacity: 0.5 }}
                >
                  {String(point.data.x).slice(5)}
                </Text>
                <Text
                  fontSize="3vmin"
                  fontWeight="500"
                  style={{ color: point.seriesColor }}
                >
                  {(point.data.y as number).toFixed(1)} kWh
                </Text>
                <Text
                  fontSize="2vmin"
                  letterSpacing="0.08em"
                  style={{ color: tooltipFg, opacity: 0.4 }}
                >
                  {point.seriesId === "runningProduction" ? "PRODUCED" : "CONSUMED"}
                </Text>
              </Box>
            )}
          />
        )}
      </Box>

      {/* Legend */}
      <HStack gap="5vmin" justify="center" mt="2vmin">
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
          <Box
            w="4vmin"
            h="1.5px"
            bg="rgba(255,255,255,0.45)"
            borderRadius="full"
          />
          <Text
            fontSize="2.2vmin"
            color="var(--theme-fg-faint)"
            letterSpacing="0.1em"
          >
            CONSUMPTION
          </Text>
        </HStack>
      </HStack>
    </Box>
  );
}
