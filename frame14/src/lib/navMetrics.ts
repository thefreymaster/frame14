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
 * iPhone landscape). Keep the gap: 0.85.0 docked the row against the status
 * bar and the user wanted the spacing back (0.85.1).
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
 * The portrait bar's corners: the cards' `surface` where it floats (the
 * frame, a browser window), and square on an iPhone, where it is flush with
 * the screen — the top flat, and the bottom two rounded by the screen's own
 * corners, which clip it, whatever the model's radius (0.145.1). They were a
 * 62pt curve of their own until then, the 16 Pro's: CSS can't read a
 * screen's radius, and on a tighter screen (an iPhone 13 Pro's is about
 * 47pt) the page showed between the two curves.
 */
export const NAV_BAR_RADIUS = `max(0px, calc(var(--chakra-radii-surface) - ${ROUNDED_SCREEN}))`;

/**
 * On an iPhone, the screen's bottom corners take up most of the bar's height,
 * and the first and last entries' labels (Home, Settings) ran into them. The bar is
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

/** Distance from the left of the screen to the right edge of the landscape rail. */
export const NAV_RAIL_CLEARANCE = `calc(env(safe-area-inset-left, 0px) + ${PAGE_GUTTER} + ${NAV_RAIL_WIDTH})`;
