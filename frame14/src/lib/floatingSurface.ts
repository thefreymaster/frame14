// The navs' floating surface (frosted, NAV_SURFACE), its entries' corners,
// and the dark-mode shades for anything sitting on the cards' `bg.surface`.

/** Space between a floating surface's edge and its entries. */
export const NAV_PAD = "0.375rem";

/**
 * The drop shadow of a floating surface — and, since 0.126, of every card
 * (Board, and the framed Photos on a desktop): the user asked for the cards
 * to have the same shade as the side navigation. The theme's `surface`
 * shadow: Chakra's `lg`, none in the Outlines palette, whose cards and
 * navs are their outline alone, and an inner one in Embossed, whose cards
 * and navs are pressed into the page.
 */
export const SURFACE_SHADOW = "surface";

/**
 * A recess's two halves as shadows of their own (0.169.3): the shade its top
 * edge throws inside it, and the light on its lower lip, just outside. The
 * theme's `recess.shade` / `recess.lip`: what Embossed's `surface` shadow is
 * made of, and none in every other palette. For a box whose rim is wider
 * than a card's 1px edge — a dial's ring (ThermostatDial) — where the shade
 * belongs inside the rim and the lip outside it, so neither can ride on the
 * one box as a card's do.
 */
export const RECESS_SHADE = "recess.shade";
export const RECESS_LIP = "recess.lip";

/**
 * A button standing up out of its card, where the theme presses the cards in
 * (Embossed; 0.171.1, the user: "In embossed mode instead of having the
 * buttons feel indented, change them to feel like convexed popping out, so
 * inverted of the embossed feel" — the tiles were pressed in too for a
 * version, 0.170.0). The theme's `raised` shadows, none in every other
 * palette: `raised.face` is the bevel inside the button — light along its
 * top edge, shade along its lower one — and `raised.drop` the shadow it
 * casts on the card. `raised` is both, which the button recipe wears.
 *
 * Held down it goes from pushed out to pushed in, as a real button does (the
 * user again: "When pressed it would go from pushing out to pushing in like
 * a real button"): the recess the cards have, in place of the bevel and the
 * shadow.
 */
export const RAISED_FACE = "raised.face";

/** How long a tile's ring, and the face inside it, take to come and go. */
export const TILE_RING_MS = "400ms";

/**
 * The shadow a raised tile casts, for the tile's own box: alone, or listed
 * after its ring (lib/hvac's tileRing) — so it is the theme's `raised.edge`,
 * a shadow of nothing outside Embossed, where `raised.drop` is `none`, which
 * a list can't hold. Through `--tile-drop`, and the face's bevel through
 * `--tile-face` (tileFace), so that held down (TILE_HELD, for the tile's
 * `pressable`) the tile is pushed in: the recess's shade inside it and its
 * lip under it, where the bevel and the shadow were.
 */
export const TILE_DROP = "var(--tile-drop, var(--chakra-shadows-raised-edge))";
export const TILE_HELD = {
  "--tile-drop": "shadows.recess.edge",
  "--tile-face": "shadows.recess.shade",
};

/**
 * The face of a raised tile — a light's, a scene's, a thermostat's and a
 * fan's, the tiles that are buttons — for the tile's `_before`: a layer of
 * its own inside the tile's border, and inside its ring where it has one
 * (`rim`, the ring's width within the border; under a ring the bevel would
 * dirty it), carrying the bevel and the face's colour (`emboss.floor`, the
 * theme's wash over the tile's own, which by night lifts it off the card's
 * darker floor so it reads as standing on it). The tile isolates, so the
 * layer lies over its fill and under everything it holds; the tile's own box
 * casts the shadow (TILE_DROP). The tile names no palette.
 *
 * `radius` is the layer's corner: the tile's less what lies between them.
 */
export function tileFace(
  rim = "0px",
  radius = "calc(var(--chakra-radii-sm) - 1px)",
) {
  return {
    content: '""',
    position: "absolute",
    inset: rim,
    borderRadius: radius,
    bg: "emboss.floor",
    boxShadow: `var(--tile-face, {shadows.${RAISED_FACE}})`,
    zIndex: -1,
    pointerEvents: "none",
    transition: `inset ${TILE_RING_MS} ease, border-radius ${TILE_RING_MS} ease`,
  } as const;
}

/** The whole of a raised tile with no ring (a light's, a scene's), to spread on it. */
export const TILE_RAISED = {
  isolation: "isolate",
  boxShadow: TILE_DROP,
  _before: tileFace(),
} as const;

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
  shadow: SURFACE_SHADOW,
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
