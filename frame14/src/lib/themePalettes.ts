// The palettes the dashboard can wear: the neutrals every surface is drawn
// from, in Chakra's own light and dark modes alike. "gray" is Chakra's stock
// scale; the others re-tint it. components/ui/provider.tsx swaps the scale
// under `<html data-palette>` (lib/themeMode sets it), so every token built on
// gray — bg, fg, border, the gray colorPalette, the cards' DARK_RAISED
// steps — follows without a component knowing.
//
// Each palette keeps Chakra gray's lightness at every step (OKLCH L) and
// changes only the hue and chroma, so contrast stays where Chakra put it: the
// muted text on a card, the borders, the wells inside a card, the cards on the
// page. Only the hue is new — and Slate's and Sand's light page (`paper`),
// tinted under the white cards where Chakra's is white.

export type ThemePalette = "gray" | "slate" | "sand";

export const THEME_PALETTES: readonly ThemePalette[] = ["gray", "slate", "sand"];

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
  /** The page in light mode (Chakra's `white` there). */
  paper: string;
  /** The page in dark mode and the text in light mode (Chakra's `black`). */
  ink: string;
  /** The cards and the navs in dark mode (`bg.surface`; light uses bg.panel). */
  card: string;
}

export const PALETTES: Record<ThemePalette, PaletteColors> = {
  // Chakra's own: its gray scale (Tailwind's zinc, with a #111 950), white,
  // its #09090B black, and iOS's #1C1C1E grouped-cell grey for the cards
  // (0.71, the user's pick).
  gray: {
    label: "Gray",
    scale: {
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
    },
    paper: "#FFFFFF",
    ink: "#09090B",
    card: "#1C1C1E",
  },
  // Blue grays: Tailwind's slate, 50–900 (the same lightness as zinc's, so
  // it drops in step for step), and the 950, ink and card at Chakra's
  // lightness in slate's hue. Light mode puts the white cards on a faint
  // blue-gray page.
  slate: {
    label: "Slate",
    scale: {
      "50": "#f8fafc",
      "100": "#f1f5f9",
      "200": "#e2e8f0",
      "300": "#cbd5e1",
      "400": "#94a3b8",
      "500": "#64748b",
      "600": "#475569",
      "700": "#334155",
      "800": "#1e293b",
      "900": "#0f172a",
      "950": "#071123",
    },
    paper: "#f3f6fa",
    ink: "#02081a",
    card: "#121c2f",
  },
  // Warm grays: sand and linen by day — white cards on a cream page — and
  // espresso by night, easier on a kitchen at midnight than a cold gray.
  sand: {
    label: "Sand",
    scale: {
      "50": "#fcfaf6",
      "100": "#f7f4ee",
      "200": "#e9e4db",
      "300": "#dad4c8",
      "400": "#aaa193",
      "500": "#7b7063",
      "600": "#5b5146",
      "700": "#473e35",
      "800": "#2c2620",
      "900": "#1c1813",
      "950": "#14110d",
    },
    paper: "#faf5eb",
    ink: "#0c0906",
    card: "#211c17",
  },
};

export function isThemePalette(value: unknown): value is ThemePalette {
  return (
    typeof value === "string" &&
    (THEME_PALETTES as readonly string[]).includes(value)
  );
}
