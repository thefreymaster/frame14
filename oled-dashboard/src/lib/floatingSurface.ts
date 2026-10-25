// The floating surface the navs and the desktop lights strip share (the
// navs' frosted, NAV_SURFACE), its entries' corners, and the dark-mode shades
// for anything sitting on the cards' `bg.surface`.

/** Space between a floating surface's edge and its entries. */
export const NAV_PAD = "0.375rem";

/**
 * The cards' colour (the theme's `bg.surface`) and corners (the theme's
 * `surface` radius), set apart from a card passing beneath by a border and
 * shadow. Spread onto a Box; the caller places it.
 */
export const FLOATING_SURFACE = {
  position: "fixed",
  bg: "bg.surface",
  borderWidth: "1px",
  borderColor: "border.surface",
  rounded: "surface",
  shadow: "lg",
  zIndex: "sticky",
  p: NAV_PAD,
} as const;

/**
 * How far the navs blur what passes beneath them. The user chose 8px from a
 * sheet of 0 / 8 / 16 / 24 / 40: a card's shapes still read through it.
 */
export const NAV_BLUR = "8px";

/**
 * How much of its own colour a frosted surface keeps over that blur, in
 * percent.
 */
export const NAV_SURFACE_TINT = 72;

const FROST_FILTER = `blur(${NAV_BLUR}) saturate(1.8)`;

/**
 * The frost itself: a NAV_BLUR blur of what passes beneath, a little more
 * saturated, under a colour at NAV_SURFACE_TINT — iOS's classic bar material,
 * not Liquid Glass (no refraction, no highlight). Spread onto a Box with such
 * a colour: the navs (NAV_SURFACE, the cards' colour) and the header
 * (StatusBanner, the page's).
 */
export const FROST = {
  backdropFilter: FROST_FILTER,
  // Older WebKit knows only the prefixed property.
  css: { WebkitBackdropFilter: FROST_FILTER },
} as const;

/**
 * The navs' surface: FLOATING_SURFACE made frosted — the cards' colour at
 * NAV_SURFACE_TINT over FROST, so the page scrolling beneath shows through
 * and the colour stays the cards'. The lights strip keeps the opaque surface.
 */
export const NAV_SURFACE = {
  ...FLOATING_SURFACE,
  bg: `bg.surface/${NAV_SURFACE_TINT}`,
  ...FROST,
} as const;

/**
 * Corner radius of an entry on a floating surface (the navs' entries, the
 * lights strip's buttons): the surface's (the theme's `surface`, the cards'
 * too), less the border and padding between them, so the two corners share a
 * centre — an inner outline offset from the outer one, as a slicer offsets a
 * print's walls. An equal radius would look fatter than the corner around it.
 */
export const ENTRY_RADIUS = `calc(var(--chakra-radii-surface) - 1px - ${NAV_PAD})`;

/**
 * Chakra's dark-mode shades that equal gray.800 — a hair above the cards' and
 * these surfaces' `bg.surface` (#1C1C1E) — one step up for everything on them,
 * so skeleton bars, switch tracks, outline buttons and borders don't vanish.
 * Apply under `_dark` (see Board).
 */
export const DARK_RAISED = {
  "--chakra-colors-bg-emphasized": "colors.gray.700",
  "--chakra-colors-border": "colors.gray.700",
  "--chakra-colors-border-emphasized": "colors.gray.600",
  "--chakra-colors-gray-muted": "colors.gray.700",
  "--chakra-colors-gray-border": "colors.gray.700",
  "--chakra-colors-gray-emphasized": "colors.gray.600",
  "--chakra-colors-color-palette-muted": "colors.gray.700",
  "--chakra-colors-color-palette-border": "colors.gray.700",
  "--chakra-colors-color-palette-emphasized": "colors.gray.600",
};
