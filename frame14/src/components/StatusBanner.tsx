import { useLayoutEffect, useRef } from "react";
import { Center, Grid, HStack, Image, Text } from "@chakra-ui/react";
import { FROST, NAV_SURFACE_TINT } from "../lib/floatingSurface";
import { watchHeaderFit } from "../lib/headerFit";
import { PHONE_MEDIA } from "../lib/homeLayout";
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
 * What the row gives up as it runs out of room (lib/headerFit writes the
 * level on it): the name, then the theme's toggle.
 */
const FIT_CSS = {
  '&:is([data-header-fit="icon"], [data-header-fit="tight"]) [data-header-word]':
    { display: "none" },
  '&[data-header-fit="tight"] [data-header-theme]': { display: "none" },
} as const;

/**
 * On a phone everything is at the right end (0.176.1, the user: "Top nav on
 * mobile should be right justified still"), the status icons first as
 * ever: the buttons are put last in the row (`order`), the status icons
 * take the middle column, `xs` short of them, and the two after the name
 * hug what they hold, so the name's column has the rest and the buttons
 * lie against the right gutter. A phone has no clock (useDesktop).
 */
const PHONE_CSS = {
  [PHONE_MEDIA]: {
    gridTemplateColumns: "1fr auto auto",
    "& > [data-header-buttons]": { order: 1 },
    "& > [data-header-end]": { ms: "0", me: "xs" },
  },
} as const;

/**
 * The header across the top of every view: the app's icon and name at the
 * left; in the middle the buttons — the mic, a remote's button to refresh
 * the frames, the theme's toggle and the frames' power button; and at the
 * right the status icons — running appliances and the connection — and
 * (on a desktop) the date and time. (The version is on the Settings page.)
 * The appliance and connection icons each open a small menu on a tap
 * (HeaderMenu). The buttons sit `xs` apart, one group, and the status
 * icons the same, another.
 *
 * **The buttons are in the middle of the header** on the frame, a tablet
 * and a desktop (0.176.0, the user: "Move all the actions buttons in the
 * header to be in the center of the header"; at its right end until then)
 * — **the buttons alone**: the status icons, which say rather than do, are
 * at the right end (0.176.1, "only the icon buttons should be centered not
 * notifications like the WiFi dishwasher. Those should be right"). **On a
 * phone all of it is at the right end** (0.176.1, "Top nav on mobile
 * should be right justified still": PHONE_CSS), the status icons before the
 * buttons. The row is three columns, the outer two sharing what the buttons
 * leave — so the group's middle is the header's — and neither narrower than
 * what it holds. When the name, the status icons and the buttons are too
 * wide for the row — a phone on a busy day: a washer, a dryer, a dishwasher,
 * a print and a vacuum, each an icon — the name goes (0.175.0, when a
 * remote's refresh button made that four appliances on a 390px iPhone, the
 * power button off the screen): the icon alone at the left, every button
 * on the screen; and with no room even then, the theme's toggle goes as
 * well. lib/headerFit finds which, from the layout itself.
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
  theme,
  screen,
}: {
  hidden?: boolean;
  /** /home is being arranged: blurred, dimmed and out of reach. */
  veiled?: boolean;
  /** The page has scrolled under the header: show its bottom edge. */
  scrolled?: boolean;
  /** The mic, after the status icons. */
  voice?: React.ReactNode;
  /** A remote's button to refresh the frames (RefreshFramesButton), after the mic. */
  refresh?: React.ReactNode;
  /** The switch between bright and dark (ThemeToggleButton), before the power button. */
  theme?: React.ReactNode;
  /** The power button for the frames' screen (ScreenOffButton), the last. */
  screen?: React.ReactNode;
}) {
  // The date and clock only on a desktop: a phone shows its own, and the
  // frame has the big ones on Home and /clock.
  const desktop = useDesktop();
  const row = useRef<HTMLDivElement>(null);
  const buttons = useRef<HTMLDivElement>(null);
  const status = useRef<HTMLDivElement>(null);
  // Before the first paint, and from then on as the row, its buttons or its
  // status icons change.
  useLayoutEffect(() => {
    if (!row.current || !buttons.current || !status.current) return;
    return watchHeaderFit(row.current, [buttons.current, status.current]);
  }, []);

  return (
    <Grid
      ref={row}
      position="fixed"
      top={0}
      left={0}
      right={0}
      height={HEADER_CLEARANCE}
      pt={HEADER_TOP}
      pl={`calc(env(safe-area-inset-left, 0px) + ${PAGE_GUTTER})`}
      pr={`calc(env(safe-area-inset-right, 0px) + ${PAGE_GUTTER})`}
      // The buttons between two columns that share the rest: in the middle
      // (on a phone at the right end, PHONE_CSS).
      templateColumns="1fr auto 1fr"
      alignItems="center"
      bg={`bg/${NAV_SURFACE_TINT}`}
      backdropFilter={FROST.backdropFilter}
      css={{ ...FROST.css, ...FIT_CSS, ...PHONE_CSS }}
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
      data-header=""
    >
      {/* The icon and the name, the header's gap clear of the buttons. The
          name is whole or gone (FIT_CSS), never "Fra…"; the icon stays. */}
      <HStack gap="2" me="3" justifySelf="start" data-header-name>
        {/* The app icon, at the status icons' size, in a box as tall as the
            line so the line is no shorter with the name gone — and as wide
            as the icon by its own word: an image the reset caps at 100% of
            its box counts for nothing in the least width a column can be,
            and the name ran on under the buttons by the icon's width. */}
        <Center height={NAME_ROW} width={HEADER_ICON_SIZE} flexShrink={0}>
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
          data-header-word
        >
          Frame14
        </Text>
      </HStack>
      <HStack ref={buttons} gap="xs" data-header-buttons>
        {voice}
        {refresh}
        {theme}
        {screen}
      </HStack>
      {/* The status icons at the right end, then a desktop's clock; the
          header's gap clear of the buttons. On a phone, before them. No
          `minW="0"`: as wide as its icons, or the row would count it as
          nothing and the name would stay, under them. */}
      <HStack gap="3" ms="3" justifySelf="end" data-header-end>
        <HStack ref={status} gap="xs" data-header-status>
          <ApplianceIndicators />
          <ConnectionMenu />
        </HStack>
        {desktop && <HeaderClock />}
      </HStack>
      <ArrangingVeil shown={veiled} />
    </Grid>
  );
}
