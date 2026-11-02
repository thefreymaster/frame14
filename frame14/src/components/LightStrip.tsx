import { Box, HStack } from "@chakra-ui/react";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { buildLightSections } from "../lib/lightsConfig";
import { FLOATING_SURFACE } from "../lib/floatingSurface";
import {
  LIGHT_STRIP_HEIGHT,
  NAV_RAIL_BOTTOM,
  NAV_RAIL_CLEARANCE,
  PAGE_GUTTER,
} from "../lib/navMetrics";
import { LightStripItem } from "./LightStripItem";

// A stable empty list while the config loads.
const EMPTY: string[] = [];

/**
 * Desktop only (Layout decides): every configured light and switch as an
 * on/off button drawn like a rail entry, bulb over name, all one width, in one
 * row along the bottom of the screen — the floating rail's surface laid on its side. It runs from the
 * rail's edge to the right of the page inside the page gutter, its bottom in
 * line with the rail's. One row, never wrapping: past the width it scrolls
 * sideways (the scrollbar is hidden; a trackpad or shift-scroll moves it).
 * It comes and goes with the nav.
 */
export function LightStrip({ hidden = false }: { hidden?: boolean }) {
  const { data: entities } = useEntitiesConfig();
  const entries = buildLightSections(entities?.lights ?? EMPTY).flatMap(
    (section) => section.entries,
  );

  return (
    <Box
      {...FLOATING_SURFACE}
      left={`calc(${NAV_RAIL_CLEARANCE} + ${PAGE_GUTTER})`}
      right={`calc(env(safe-area-inset-right, 0px) + ${PAGE_GUTTER})`}
      bottom={NAV_RAIL_BOTTOM}
      height={LIGHT_STRIP_HEIGHT}
      // Down past the screen edge, shadow and all.
      transform={
        hidden
          ? `translateY(calc(100% + ${NAV_RAIL_BOTTOM} + 1rem))`
          : "translateY(0)"
      }
      transition="transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
    >
      <HStack
        height="100%"
        gap="1"
        overflowX="auto"
        css={{
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {entries.map((entry) => (
          <LightStripItem key={entry.entity_id} {...entry} />
        ))}
      </HStack>
    </Box>
  );
}
