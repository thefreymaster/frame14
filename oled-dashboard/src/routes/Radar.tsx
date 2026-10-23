import { Box } from "@chakra-ui/react";
import { useDesktop } from "../hooks/useDesktop";

export function Radar() {
  // Framed (a card in the page) on a desktop; full-screen elsewhere.
  const framed = useDesktop();

  // data-page-fill gives the map the page's height even where the layout
  // scrolls (see PageTransition). Framed (a desktop), it sits inside the
  // gutter with the cards' corners and edge; otherwise it runs edge to edge.
  return (
    <Box
      data-page-fill=""
      width="100%"
      height="100%"
      p={framed ? "gutter" : undefined}
    >
      <Box
        width="100%"
        height="100%"
        overflow="hidden"
        rounded={framed ? "surface" : undefined}
        borderWidth={framed ? "1px" : undefined}
        borderColor={framed ? "border.surface" : undefined}
      >
        <iframe
          src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=6&overlay=radar&product=radar&level=surface&lat=42.533&lon=-72.328&pressure=true"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
          }}
          title="Radar"
        />
      </Box>
    </Box>
  );
}
