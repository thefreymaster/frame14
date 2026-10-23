// The floating surface the navs and the desktop lights strip share, and the
// dark-mode shades for anything sitting on gray.800 (these and the cards).

/** Space between a floating surface's edge and its entries. */
export const NAV_PAD = "0.375rem";

/**
 * The cards' colour (gray.800 in dark mode) and corners (the theme's
 * `surface` radius), set apart from a card passing beneath by a border and
 * shadow. Spread onto a Box; the caller places it.
 */
export const FLOATING_SURFACE = {
  position: "fixed",
  bg: { _light: "bg.panel", _dark: "gray.800" },
  borderWidth: "1px",
  borderColor: "border.surface",
  rounded: "surface",
  shadow: "lg",
  zIndex: "sticky",
  p: NAV_PAD,
} as const;

/**
 * Chakra's dark-mode shades that equal gray.800 — the cards' and these
 * surfaces' colour — one step up for everything on them, so skeleton bars,
 * switch tracks, outline buttons and borders don't vanish. Apply under
 * `_dark` (see Board).
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
