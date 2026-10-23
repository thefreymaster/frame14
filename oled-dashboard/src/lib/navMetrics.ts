// Nav and header geometry, in rem so it scales with the page (see index.css).
// Layout and the arranging bar clear the nav by these amounts,
// and Layout pads the page down by the header's.

/**
 * The page's padding around the cards: the theme's spacing.gutter, the same as
 * the gap between them (md, sm on a phone). The header's icons and the
 * landscape rail keep to it too, so they line up with the cards.
 */
export const PAGE_GUTTER = "var(--chakra-spacing-gutter)";

/** Height of the floating header bar. */
export const HEADER_HEIGHT = "2.75rem";

/**
 * The status-bar inset plus a gap of up to 1.25rem under it. An iPhone
 * home-screen app blurs a band a little deeper than the inset, which smeared
 * the header's icons; the gap clears it. min() keeps the gap at zero where
 * there is no inset (the frame, desktops, iPhone landscape). StatusBanner
 * masks this band so the page doesn't scroll under the clock and notch.
 */
export const STATUS_BAR_CLEARANCE =
  "calc(env(safe-area-inset-top, 0px) + min(1.25rem, env(safe-area-inset-top, 0px)))";

/**
 * Screen top to the floating header bar's top: the status-bar band, then the
 * page gutter, so the bar floats like the cards and navs.
 */
export const HEADER_TOP = `calc(${STATUS_BAR_CLEARANCE} + ${PAGE_GUTTER})`;

/** Distance from the top of the screen to the bottom of the header bar. */
export const HEADER_CLEARANCE = `calc(${HEADER_HEIGHT} + ${HEADER_TOP})`;

/** The header's status icons (connection, running appliances). */
export const HEADER_ICON_SIZE = { base: "4.5", md: "5" };

/** Height of the portrait bottom bar. */
export const NAV_BAR_HEIGHT = "4rem";

/**
 * Gap between the floating portrait bar and the screen's side edges (on top of
 * any side safe-area inset). Wider than PAGE_GUTTER: the bar floats over the
 * page, clear of a phone's rounded screen corners, as Apple Music's does.
 */
export const NAV_BAR_INSET = "1rem";

/**
 * Gap between the floating portrait bar and the bottom of the screen. On an
 * iPhone it tucks part-way into the home-indicator inset, where Apple Music's
 * tab bar sits; with no inset it floats 1rem up.
 */
export const NAV_BAR_BOTTOM =
  "max(1rem, calc(env(safe-area-inset-bottom, 0px) - 0.75rem))";

/** Distance from the bottom of the screen to the top of the portrait bar. */
export const NAV_BAR_CLEARANCE = `calc(${NAV_BAR_HEIGHT} + ${NAV_BAR_BOTTOM})`;

/** Width of the landscape side rail. */
export const NAV_RAIL_WIDTH = "5rem";

/**
 * Gap between the landscape rail and the bottom of the screen: PAGE_GUTTER, or
 * part-way into an iPhone's home-indicator inset when that is deeper.
 */
export const NAV_RAIL_BOTTOM = `max(${PAGE_GUTTER}, calc(env(safe-area-inset-bottom, 0px) - 0.75rem))`;

/**
 * Width of every button in the desktop lights strip (LightStripItem), so the
 * row is regular whatever the names; a longer name is cut off.
 */
export const LIGHT_STRIP_ITEM_WIDTH = "7.5rem";

/**
 * Height of the desktop lights strip along the bottom (LightStrip): the
 * portrait bar's, since its buttons are the same icon over a one-line name.
 */
export const LIGHT_STRIP_HEIGHT = NAV_BAR_HEIGHT;

/**
 * Distance from the bottom of the screen to the top of the lights strip: it
 * sits on the rail's bottom gap, so the two line up.
 */
export const LIGHT_STRIP_CLEARANCE = `calc(${LIGHT_STRIP_HEIGHT} + ${NAV_RAIL_BOTTOM})`;

/** Distance from the left of the screen to the right edge of the landscape rail. */
export const NAV_RAIL_CLEARANCE = `calc(env(safe-area-inset-left, 0px) + ${PAGE_GUTTER} + ${NAV_RAIL_WIDTH})`;
