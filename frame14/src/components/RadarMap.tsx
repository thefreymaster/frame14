import { Box, type BoxProps } from "@chakra-ui/react";

const RADAR_URL =
  "https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=6&overlay=radar&product=radar&level=surface&lat=42.533&lon=-72.328&pressure=true";

/**
 * The interactive Windy radar (the /radar page's map until 0.80, now
 * /weather's Radar tab), in a box with the cards' corners and edge that fills
 * whatever it is given. The Home card's RadarSection is the display-only one.
 */
export function RadarMap(props: BoxProps) {
  return (
    <Box
      width="100%"
      height="100%"
      overflow="hidden"
      rounded="surface"
      borderWidth="1px"
      borderColor="border.surface"
      {...props}
    >
      <iframe
        src={RADAR_URL}
        title="Radar"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
      />
    </Box>
  );
}
