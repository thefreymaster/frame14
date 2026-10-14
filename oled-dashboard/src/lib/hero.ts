// The big time and temperature figures on Home, Clock and Photos share one
// look so the three read as the same clock.
//
// Size is 17cqi of the row the figures sit in, so give that row
// `containerType: "inline-size"`. "08:56 pm 74°" is about 5.5em wide with the
// suffix at HERO_SUFFIX_SIZE, so 17cqi fills the row and leaves a ~7% gap.
// Weight and tracking follow the shadcn build's clock; tabular digits keep the
// minutes from shifting as they tick.

/** Font size for the hero figures, relative to their row. */
export const HERO_SIZE = "17cqi";

/**
 * Photos lays the figures over a picture, where Home's size covers too much of
 * it, so they run at about half of Home's there.
 */
export const PHOTOS_HERO_SIZE = "9cqi";

/** am/pm, seconds and other suffixes, relative to the hero figure. */
export const HERO_SUFFIX_SIZE = "0.35em";

/** Style props for a hero figure. */
export const HERO_TEXT = {
  fontSize: HERO_SIZE,
  fontWeight: "semibold",
  letterSpacing: "tight",
  fontVariantNumeric: "tabular-nums",
  lineHeight: "1",
  whiteSpace: "nowrap",
} as const;

/**
 * Horizontal inset of Home's clock row from the edge of the page: the page
 * gutter, the card's padding and its 1px border. A full-page clock padded by
 * this much gets the same width, and so the same size, as Home's.
 */
export const HOME_HERO_INSET = {
  base: "calc(2rem + 1px)",
  md: "calc(2.5rem + 1px)",
};
