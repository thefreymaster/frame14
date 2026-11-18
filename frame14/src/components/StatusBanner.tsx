import { Center, HStack, Image, Spacer, Text } from "@chakra-ui/react";
import { FROST, NAV_SURFACE_TINT } from "../lib/floatingSurface";
import {
  HEADER_CLEARANCE,
  HEADER_ICON_SIZE,
  HEADER_TOP,
  PAGE_GUTTER,
} from "../lib/navMetrics";
import { ApplianceIndicators } from "./ApplianceIndicators";
import { ArrangingVeil } from "./ArrangingVeil";
import { ConnectionMenu } from "./ConnectionMenu";
import { HeaderClock } from "./HeaderClock";
import { useDesktop } from "../hooks/useDesktop";

// The height of the line the icon and the name share: the name's own line
// at its larger size.
const NAME_ROW = "1.75rem";

/**
 * The header across the top of every view: the app's icon and name at the
 * left; running appliances, the connection, the mic, a remote's button to
 * refresh the frames, the frames' power button and (on a desktop) the date
 * and time at the right. (The version is on the Settings page.) The appliance
 * and connection icons each open a small menu on a tap (HeaderMenu). Those
 * icons, the mic, the refresh and the power button sit `xs` apart, one group;
 * the clock keeps the header's wider gap from them. On a phone on a busy day
 * — a washer, a dryer, a dishwasher, a print and a vacuum, each an icon —
 * the group is wider than what the name leaves it, and the name goes
 * (0.175.0, when a remote's refresh button made that four appliances on a
 * 390px iPhone, the power button off the screen): the icon alone at the
 * left, every button on the screen.
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
 * While /home is being arranged (`veiled`, from Layout) it is inert under an
 * ArrangingVeil, like the navs.
 */
export function StatusBanner({
  hidden = false,
  veiled = false,
  scrolled = false,
  voice,
  refresh,
  screen,
}: {
  hidden?: boolean;
  /** /home is being arranged: blurred, dimmed and out of reach. */
  veiled?: boolean;
  /** The page has scrolled under the header: show its bottom edge. */
  scrolled?: boolean;
  /** The mic, after the status icons (before the clock on a desktop). */
  voice?: React.ReactNode;
  /** A remote's button to refresh the frames (RefreshFramesButton), after the mic. */
  refresh?: React.ReactNode;
  /** The power button for the frames' screen (ScreenOffButton), the last. */
  screen?: React.ReactNode;
}) {
  // The date and clock only on a desktop: a phone shows its own, and the
  // frame has the big ones on Home and /clock.
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
      inert={veiled || undefined}
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
      {/* The icon and the name. The name gives way to the buttons: this box
          is the one thing in the row that shrinks, it is one line tall, and
          it wraps — so a name with no room beside the icon drops to a second
          line, out of sight, whole (never "Fra…"). The icon stays. */}
      <HStack
        gap="2"
        flexWrap="wrap"
        alignContent="flex-start"
        height={NAME_ROW}
        minW={HEADER_ICON_SIZE}
        overflow="hidden"
        data-header-name
      >
        {/* The app icon, at the status icons' size, in a box as tall as the
            line so the line is no shorter with the name gone. */}
        <Center height={NAME_ROW} flexShrink={0}>
          <Image
            src="/favicon-96x96.png"
            alt=""
            boxSize={HEADER_ICON_SIZE}
            rounded="sm"
          />
        </Center>
        <Text
          textStyle={{ base: "md", md: "lg" }}
          lineHeight={NAME_ROW}
          fontWeight="semibold"
          whiteSpace="nowrap"
        >
          Frame14
        </Text>
      </HStack>
      <Spacer />
      <HStack gap="xs" data-header-buttons>
        <ApplianceIndicators />
        <ConnectionMenu />
        {voice}
        {refresh}
        {screen}
      </HStack>
      {desktop && <HeaderClock />}
      <ArrangingVeil shown={veiled} />
    </HStack>
  );
}
