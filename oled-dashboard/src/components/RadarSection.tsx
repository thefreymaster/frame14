import { Box } from "@chakra-ui/react";
import { IoRainyOutline } from "react-icons/io5";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { Board } from "./Board";
import { CHIP_RADIUS } from "../lib/surfaces";

const RADAR_URL =
  "https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=7&overlay=radar&product=radar&level=surface&lat=42.456&lon=-71.071&pressure=false&message=false";

// HA weather conditions that mean rain is falling now.
const RAIN_CONDITIONS = new Set([
  "rainy",
  "pouring",
  "lightning-rainy",
  "snowy-rainy",
]);

/**
 * Windy radar, shown only while the current condition is rain — like the
 * printer and vacuum tiles it claims space when it has something to say.
 *
 * The map is display-only: on the touch frame an interactive iframe swallows
 * the drag gesture and the home page stops scrolling. /radar is the
 * interactive map.
 */
export function RadarSection({
  condition,
  span,
}: {
  condition: string | null | undefined;
  span?: 1 | 2;
}) {
  if (!condition || !RAIN_CONDITIONS.has(condition)) return null;
  return (
    <Board
      span={span}
      title={<SectionTitle icon={<IoRainyOutline />}>RADAR</SectionTitle>}
    >
      <Box
        width="100%"
        aspectRatio="16 / 10"
        overflow="hidden"
        borderRadius={CHIP_RADIUS}
        bg="var(--theme-surface-2)"
      >
        <iframe
          src={RADAR_URL}
          title="Radar"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
            pointerEvents: "none",
          }}
        />
      </Box>
    </Board>
  );
}
