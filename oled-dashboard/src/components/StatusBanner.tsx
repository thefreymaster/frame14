import { HStack, Image, Spacer, Text } from "@chakra-ui/react";
import { FROST, NAV_SURFACE_TINT } from "../lib/floatingSurface";
import {
  HEADER_CLEARANCE,
  HEADER_ICON_SIZE,
  HEADER_TOP,
  PAGE_GUTTER,
} from "../lib/navMetrics";
import { ApplianceIndicators } from "./ApplianceIndicators";
import { ConnectionMenu } from "./ConnectionMenu";
import { HeaderClock } from "./HeaderClock";
import { useDesktop } from "../hooks/useDesktop";

/**
 * The header across the top of every view: the app's icon and name at the
 * left; running appliances, the connection, the mic and (on a desktop) the
 * time at the right. (The version is on the Settings page.) The appliance
 * and connection icons each open a small menu on a tap (HeaderMenu).
 *
 * Layout renders it, and it comes and goes with the nav (so /blank, photos and
 * posters stay full-bleed). Fixed like the nav: the page scrolls under it, and
 * Layout pads the page down by HEADER_CLEARANCE. It's the page's own black
 * (or white), with no edge, so it reads as part of the page rather than a
 * floating bar — but frosted as the navs are (FROST at NAV_SURFACE_TINT), so
 * the page scrolling under it shows through the same blur as under the bottom
 * bar. Its background runs up through the status-bar inset, so in an iPhone
 * home-screen app the clock and notch sit on the frost, and its row sits a
 * little below the inset (HEADER_TOP), clear of the band iOS blurs. It
 * spans the full width; in landscape the floating rail starts below it. The
 * side padding is the cards' PAGE_GUTTER, so the icons line up with the cards'
 * edges. While the page has scrolled under it (`scrolled`, from Layout, which
 * owns the scroll container) a hairline in the navs' edge colour fades in
 * along its bottom, as an iOS bar's does: it is drawn over the frost's last
 * pixel row, so it takes no room and nothing moves when it comes or goes.
 */
export function StatusBanner({
  hidden = false,
  scrolled = false,
  voice,
}: {
  hidden?: boolean;
  /** The page has scrolled under the header: show its bottom edge. */
  scrolled?: boolean;
  /** The mic, after the status icons (before the clock on a desktop). */
  voice?: React.ReactNode;
}) {
  // The clock only on a desktop: a phone shows its own, and the frame has
  // the big one on Home and /clock.
  const desktop = useDesktop();

  return (
    <HStack
      position="fixed"
      top={0}
      left={0}
      right={0}
      height={HEADER_CLEARANCE}
      pt={HEADER_TOP}
      pl={`calc(env(safe-area-inset-left, 0px) + ${PAGE_GUTTER})`}
      pr={`calc(env(safe-area-inset-right, 0px) + ${PAGE_GUTTER})`}
      gap="3"
      bg={`bg/${NAV_SURFACE_TINT}`}
      {...FROST}
      zIndex="sticky"
      transform={hidden ? "translateY(-100%)" : "translateY(0)"}
      transition="transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      _after={{
        content: '""',
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: "1px",
        bg: "border.surface",
        pointerEvents: "none",
        opacity: scrolled ? 1 : 0,
        transition: "opacity 0.2s",
      }}
    >
      <HStack gap="2">
        {/* The app icon, at the status icons' size. */}
        <Image
          src="/favicon-96x96.png"
          alt=""
          boxSize={HEADER_ICON_SIZE}
          rounded="sm"
          flexShrink={0}
        />
        <Text textStyle={{ base: "md", md: "lg" }} fontWeight="semibold">
          Frame14
        </Text>
      </HStack>
      <Spacer />
      <ApplianceIndicators />
      <ConnectionMenu />
      {voice}
      {desktop && <HeaderClock />}
    </HStack>
  );
}
