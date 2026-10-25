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

/** How much of the surface colour the navs keep over that blur, in percent. */
export const NAV_SURFACE_TINT = 72;

/**
 * The navs' surface: FLOATING_SURFACE made frosted — the cards' colour at
 * NAV_SURFACE_TINT over a NAV_BLUR blur of the page scrolling beneath, a
 * little more saturated: iOS's classic tab-bar material, not Liquid Glass
 * (no refraction, no highlight, the colour stays the cards'). The lights
 * strip keeps the opaque surface.
 */
export const NAV_SURFACE = {
  ...FLOATING_SURFACE,
  bg: `bg.surface/${NAV_SURFACE_TINT}`,
  backdropFilter: `blur(${NAV_BLUR}) saturate(1.8)`,
  // Older WebKit knows only the prefixed property.
  css: { WebkitBackdropFilter: `blur(${NAV_BLUR}) saturate(1.8)` },
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
