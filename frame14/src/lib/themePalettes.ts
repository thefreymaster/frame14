// The palettes the dashboard can wear: the neutrals every surface is drawn
// from, in Chakra's own light and dark modes alike. "gray" is Chakra's stock
// scale; the others re-tint it. components/ui/provider.tsx swaps the scale
// under `<html data-palette>` (lib/themeMode sets it), so every token built on
// gray — bg, fg, border, the gray colorPalette, the cards' DARK_RAISED
// steps — follows without a component knowing.
//
// The colours (0.164.0, "they use really ugly colors"): quiet neutrals, a
// whisper of hue rather than a colour — the first Slate was a saturated navy
// and the first Sand a yellow cream over espresso brown.
//
// - The light half (50–400, 600) keeps Chakra gray's lightness step for step
//   and changes only the hue, at a chroma that stays a gray's (TINT_CHROMA_MAX
//   in the test). Each palette's light page (`paper`) is a faint tint of it
//   under the white cards, lighter than the wells (100) inside them.
// - The dark half (700–950, `ink`, `card`) is gray's own near-black in Gray,
//   and one softer ramp shared by Slate and Sand: a charcoal page rather than
//   a black one, the cards, wells and borders the same distances apart. Their
//   500 — the dark cards' faintest text — is a little lighter than gray's, so
//   it reads as well on the lighter cards.
//
// The values were made in OKLCH (a hue, a chroma, and the lightness above) and
// are kept as hex; index.html's splash copies each `paper` and `ink`.

//
// Outlines (0.166.0, "the cards are just outline only with the same
// background color") isn't a tint but a way of drawing the cards: gray's
// scale, with the cards and the navs the page's own colour — white on white
// by day, gray's near-black on itself by night — so their 1px edge is all
// that sets them off, and no shadow under them (`outlined`).

export type ThemePalette = "gray" | "slate" | "sand" | "outlines";

export const THEME_PALETTES: readonly ThemePalette[] = [
  "gray",
  "slate",
  "sand",
  "outlines",
];

export const DEFAULT_PALETTE: ThemePalette = "gray";

export const PALETTE_STEPS = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
] as const;

export type PaletteStep = (typeof PALETTE_STEPS)[number];

export interface PaletteColors {
  label: string;
  /** The gray scale, 50–950. */
  scale: Record<PaletteStep, string>;
  /** The page in light mode (where Chakra has `white`), under the white cards. */
  paper: string;
  /** The page in dark mode and the text in light mode (Chakra's `black`). */
  ink: string;
  /** The cards and the navs in dark mode (`bg.surface`; light uses bg.panel). */
  card: string;
  /**
   * The cards and the navs are drawn by their edge alone: the page's colour
   * (`card` is `ink`, `paper` the light cards' white) and no shadow.
   */
  outlined?: boolean;
}

// Chakra's gray scale (Tailwind's zinc, with a #111 950).
const GRAY_SCALE: Record<PaletteStep, string> = {
  "50": "#fafafa",
  "100": "#f4f4f5",
  "200": "#e4e4e7",
  "300": "#d4d4d8",
  "400": "#a1a1aa",
  "500": "#71717a",
  "600": "#52525b",
  "700": "#3f3f46",
  "800": "#27272a",
  "900": "#18181b",
  "950": "#111111",
};

/** The light cards' colour in every palette: Chakra's `bg.panel` by day. */
export const LIGHT_CARD = "#ffffff";

export const PALETTES: Record<ThemePalette, PaletteColors> = {
  // Chakra's own: its gray scale (Tailwind's zinc, with a #111 950), its
  // #09090B black, and iOS's #1C1C1E grouped-cell grey for the cards (0.71,
  // the user's pick). The light page alone isn't Chakra's white: a soft gray,
  // so the white cards stand on it.
  gray: {
    label: "Gray",
    scale: GRAY_SCALE,
    paper: "#f6f6f8",
    ink: "#09090B",
    card: "#1C1C1E",
  },
  // Blue grays: steel rather than navy (hue 250–257, a third of the chroma
  // Tailwind's slate carries in the dark), a blue-charcoal page by night and
  // a cool off-white one by day.
  slate: {
    label: "Slate",
    scale: {
      "50": "#f8fafd",
      "100": "#f1f5f9",
      "200": "#dfe5ec",
      "300": "#cdd5de",
      "400": "#99a3b0",
      "500": "#737e8c",
      "600": "#495461",
      "700": "#3d4652",
      "800": "#2a323d",
      "900": "#1c222b",
      "950": "#161c25",
    },
    paper: "#f2f6fa",
    ink: "#0f141c",
    card: "#202731",
  },
  // Warm grays: ivory by day — white cards on an off-white page, no yellow in
  // it — and a warm graphite by night, easier on a kitchen at midnight than a
  // cold gray (hue 90–95; the brown is gone).
  sand: {
    label: "Sand",
    scale: {
      "50": "#fbfaf7",
      "100": "#f5f4f0",
      "200": "#e6e4de",
      "300": "#d6d4cd",
      "400": "#a4a29a",
      "500": "#7f7c75",
      "600": "#55534c",
      "700": "#474540",
      "800": "#33312d",
      "900": "#23221e",
      "950": "#1d1c19",
    },
    paper: "#faf8f4",
    ink: "#151411",
    card: "#272623",
  },
  // Gray with nothing filled in: the page is the cards' white by day and
  // gray's near-black by night, and a card is the same colour as the page it
  // is on — its outline alone draws it.
  outlines: {
    label: "Outlines",
    scale: GRAY_SCALE,
    paper: LIGHT_CARD,
    ink: "#09090B",
    card: "#09090B",
    outlined: true,
  },
};

export function isThemePalette(value: unknown): value is ThemePalette {
  return (
    typeof value === "string" &&
    (THEME_PALETTES as readonly string[]).includes(value)
  );
}
