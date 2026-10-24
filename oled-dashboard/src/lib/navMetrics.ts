import { ENTRY_RADIUS } from "./floatingSurface";

// Nav and header geometry, in rem so it scales with the page (see index.css).
// Layout and the arranging bar clear the nav by these amounts,
// and Layout pads the page down by the header's.

/**
 * The page's padding around the cards: the theme's spacing.gutter, the same as
 * the gap between them (md, sm on a phone). The header's icons and the
 * landscape rail keep to it too, so they line up with the cards.
 */
export const PAGE_GUTTER = "var(--chakra-spacing-gutter)";

/** Height of the status header's row (below the space HEADER_TOP leaves). */
export const HEADER_HEIGHT = "2.75rem";

/**
 * Space above the header's row: the status-bar inset, plus a gap of up to
 * 1.25rem under it. An iPhone home-screen app blurs a band a little deeper than
 * the inset, which smeared the header's icons and version; the gap clears it.
 * min() keeps the gap at zero where there is no inset (the frame, desktops,
 * iPhone landscape).
 */
export const HEADER_TOP =
  "calc(env(safe-area-inset-top, 0px) + min(1.25rem, env(safe-area-inset-top, 0px)))";

/** Distance from the top of the screen to the bottom of the header. */
export const HEADER_CLEARANCE = `calc(${HEADER_HEIGHT} + ${HEADER_TOP})`;

/** The header's status icons (connection, running appliances). */
export const HEADER_ICON_SIZE = { base: "4.5", md: "5" };

/**
 * Height of the portrait bottom bar's row of entries (the bar itself, but for
 * NAV_BAR_LIFT on an iPhone).
 */
export const NAV_BAR_HEIGHT = "4rem";

/**
 * Corner radius of an iPhone's screen, which CSS can't read from the device:
 * 62pt on the 16 Pro and later (55 on the 14 and 15 Pro).
 */
const SCREEN_RADIUS = "62px";

/**
 * 0 on a screen without a home-indicator inset, and far larger than any
 * length here on one with it (an iPhone from the X on, whose screen corners
 * are rounded): a switch for min() and max() below.
 */
const ROUNDED_SCREEN = "calc(env(safe-area-inset-bottom, 0px) * 100)";

/**
 * Gap between the portrait bar and the bottom of the screen: none on an
 * iPhone, where the bar is flush with the screen's bottom and sides, down in
 * the home-indicator inset with the indicator over its bottom padding (it
 * floated a `xs` gap in before 0.72); 1rem elsewhere, where it floats.
 */
export const NAV_BAR_BOTTOM = `max(0px, calc(1rem - ${ROUNDED_SCREEN}))`;

/**
 * Gap between the portrait bar and the screen's side edges (on top of any
 * side safe-area inset): the bottom gap, so on an iPhone the bar is flush
 * there too and its bottom corners are the screen's own.
 */
export const NAV_BAR_INSET = NAV_BAR_BOTTOM;

/**
 * The portrait bar's edge. On an iPhone, flush with the screen, it keeps only
 * its top edge: the side and bottom borders are 0 there, 1px (the floating
 * surface's) elsewhere.
 */
export const NAV_BAR_SIDE_BORDER = `max(0px, calc(1px - ${ROUNDED_SCREEN}))`;

/**
 * The portrait bar's corners. On an iPhone's rounded screen the bottom two
 * follow the screen's curve (SCREEN_RADIUS less the bottom gap, which is 0,
 * so they are the screen's corners), and the top is flat with square corners.
 * Elsewhere (the frame, a browser window) all four are the cards' `surface`.
 */
export const NAV_BAR_TOP_RADIUS = `max(0px, calc(var(--chakra-radii-surface) - ${ROUNDED_SCREEN}))`;
export const NAV_BAR_BOTTOM_RADIUS = `max(var(--chakra-radii-surface), min(calc(${SCREEN_RADIUS} - ${NAV_BAR_BOTTOM}), ${ROUNDED_SCREEN}))`;

/**
 * On an iPhone, the bottom corners take up most of the bar's height, and the
 * first and last entries' labels (Home, Settings) ran into them. The bar is
 * this much taller there, the extra room below its entries (over the home
 * indicator, as iOS's own tab bars leave it), and its entries this much
 * further in from its sides, which puts the labels clear of the curve. Both
 * grew by the `xs` the bar used to float in from the screen, so its entries
 * sit where they did. 0 elsewhere.
 */
export const NAV_BAR_LIFT = `min(1rem, ${ROUNDED_SCREEN})`;
export const NAV_BAR_SIDE_ROOM = `min(0.75rem, ${ROUNDED_SCREEN})`;

/**
 * The outer bottom corner of the bar's first and last entries: on an iPhone,
 * 1rem, rounder than the others' in the direction of the bar's curve and as
 * round as keeps their labels inside it; elsewhere the entries' own radius.
 */
export const NAV_BAR_END_ENTRY_RADIUS = `max(${ENTRY_RADIUS}, min(1rem, ${ROUNDED_SCREEN}))`;

/** Distance from the bottom of the screen to the top of the portrait bar. */
export const NAV_BAR_CLEARANCE = `calc(${NAV_BAR_HEIGHT} + ${NAV_BAR_LIFT} + ${NAV_BAR_BOTTOM})`;

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
