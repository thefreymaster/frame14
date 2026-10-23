// Nav geometry, in rem so it scales with the page (see index.css). Layout,
// the mic button and the arranging bar clear the nav by these amounts.

/** Height of the portrait bottom bar. */
export const NAV_BAR_HEIGHT = "4rem";

/**
 * Gap between the floating portrait bar and the screen's side edges (on top of
 * any side safe-area inset).
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
