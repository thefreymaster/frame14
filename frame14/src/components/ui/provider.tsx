"use client";

import {
  ChakraProvider,
  createSystem,
  defaultConfig,
  defineConfig,
} from "@chakra-ui/react";
import {
  cardAnatomy,
  progressAnatomy,
  segmentGroupAnatomy,
  toastAnatomy,
} from "@chakra-ui/react/anatomy";
import { ColorModeProvider } from "./color-mode";
import { PHONE_MEDIA } from "../../lib/homeLayout";
import {
  PALETTE_STEPS,
  PALETTES,
  THEME_PALETTES,
  type PaletteColors,
} from "../../lib/themePalettes";
import { useThemeMode } from "../../hooks/useThemeMode";

// Every palette but Chakra's own gray, each a condition on <html
// data-palette> (lib/themeMode sets it): `_slate`, `_sand`.
const TINTS = THEME_PALETTES.filter((p) => p !== "gray");

/**
 * One neutral as a token per palette: Chakra's value as the base, each tint's
 * under its condition.
 */
function paletteToken(pick: (colors: PaletteColors) => string) {
  return {
    value: {
      base: pick(PALETTES.gray),
      ...Object.fromEntries(TINTS.map((p) => [`_${p}`, pick(PALETTES[p])])),
    },
  };
}

/**
 * Chakra's stock system with a few additions.
 *
 * Buttons are fully rounded: the button recipe also drives IconButton and
 * CloseButton, so text buttons are pills and icon buttons are circles;
 * segmented controls (a row of buttons) get the same pill track and indicator.
 * Progress bars are pills too (0.138.1, the user's ask): the `full` shape for
 * the track, and the range rounded with it, so the fill ends round rather
 * than cut square by the track's clip — and the logo's blue (0.139, "matching
 * the logo"): the `brand` palette below, the app icon's #18a0ff, the recipe's
 * default colorPalette, so a task's progress is blue everywhere (the print
 * job's, the install's, a circuit's) unless a card says otherwise (a battery,
 * a wear part, where the colour is the warning).
 *
 * Cards have the `bg.surface` colour (#1C1C1E in dark mode), `surface`
 * corners (0.75rem) and a 1px `border.surface` edge, both floating navs' too;
 * the corners replace the Card recipe's `l3`. Tiles inside a card set Chakra's
 * smaller `sm` themselves, so none is rounder than its card (the thermostat
 * tiles excepted).
 *
 * Dialog and drawer backdrops (a phone's and the frame's modals since 0.134 /
 * 0.135, see components/Modal) dim the page behind them and nothing more:
 * their 4px blur (2px for a day in 0.135) went in 0.135.1 — the frame's
 * browser recomputed the full-screen backdrop-filter on every frame of a
 * drawer's slide, and the user chose speed over it.
 *
 * Toasts are outlined, not solid (0.125, the user's ask): every type keeps the
 * panel face and `fg` text, with a 1px border in its colour — green, red,
 * orange — where Chakra fills the whole toast with it; the snippet
 * (ui/toaster.tsx) colours the indicator to match.
 *
 * The neutrals come in palettes (lib/themePalettes, the user's ask: "a slate
 * mode that is blue grays and another you make up"): Chakra's gray, Slate and
 * Sand. The gray scale is redefined as semantic tokens whose base is Chakra's
 * own value and whose `_slate` / `_sand` conditions (`<html data-palette>`)
 * are the tint's, so everything Chakra builds on gray — bg, fg, border, the
 * gray colorPalette — and every `gray.N` here follows; `neutral.paper` (the
 * light page, Chakra's white), `neutral.ink` (the dark page and the light
 * text, Chakra's black) and `neutral.card` (the dark cards, #1C1C1E in gray)
 * carry what isn't on the scale. In the gray palette every value is Chakra's.
 *
 * Spacing has a named `xs` (0.25rem, 4px at the base size), `sm` (0.5rem) and
 * `md` (1rem), and `gutter`, the page's padding around the cards and the gap
 * between them — the same, always: md, or sm on a phone (the `phone`
 * condition, PHONE_MEDIA: the one-column screens).
 */
const system = createSystem(
  defaultConfig,
  defineConfig({
    conditions: {
      phone: PHONE_MEDIA,
      ...Object.fromEntries(TINTS.map((p) => [p, `[data-palette=${p}] &`])),
    },
    theme: {
      tokens: {
        spacing: {
          xs: { value: "0.25rem" },
          sm: { value: "0.5rem" },
          md: { value: "1rem" },
        },
        radii: { surface: { value: "0.75rem" } },
      },
      semanticTokens: {
        colors: {
          // The palette's neutrals (see above).
          gray: Object.fromEntries(
            PALETTE_STEPS.map((step) => [
              step,
              paletteToken((c) => c.scale[step]),
            ]),
          ),
          neutral: {
            paper: paletteToken((c) => c.paper),
            ink: paletteToken((c) => c.ink),
            card: paletteToken((c) => c.card),
          },
          // The logo's blue as a palette: `colorPalette="brand"`.
          brand: {
            solid: { value: "#18a0ff" },
            contrast: { value: "white" },
            fg: { value: { _light: "#0b78d4", _dark: "#5bb8ff" } },
            subtle: { value: "rgba(24, 160, 255, 0.14)" },
            muted: { value: "rgba(24, 160, 255, 0.28)" },
            emphasized: { value: "rgba(24, 160, 255, 0.45)" },
            focusRing: { value: "#18a0ff" },
          },
          bg: {
            // The page: Chakra's white / black, the palette's paper / ink.
            DEFAULT: {
              value: {
                _light: "{colors.neutral.paper}",
                _dark: "{colors.neutral.ink}",
              },
            },
            // The colour of every card and both floating navs: in dark mode
            // iOS's grouped-cell grey, #1C1C1E (UIKit's
            // secondarySystemGroupedBackground, the Settings app's groups on
            // black; the user's pick in 0.71, replacing #23242b), Chakra's own
            // panel white in light mode. Another palette's card in dark mode
            // (`neutral.card`).
            surface: {
              value: {
                _light: "{colors.bg.panel}",
                _dark: "{colors.neutral.card}",
              },
            },
          },
          // The text: Chakra's black in light mode, the palette's ink.
          fg: {
            DEFAULT: {
              value: {
                _light: "{colors.neutral.ink}",
                _dark: "{colors.gray.50}",
              },
            },
          },
          border: {
            // The 1px edge every card and both floating navs share.
            surface: {
              value: {
                _light: "{colors.gray.200}",
                _dark: "{colors.gray.700}",
              },
            },
          },
        },
        spacing: {
          gutter: { value: { base: "{spacing.md}", _phone: "{spacing.sm}" } },
        },
      },
      recipes: {
        button: { base: { borderRadius: "full" } },
      },
      slotRecipes: {
        card: {
          slots: cardAnatomy.keys(),
          base: { root: { borderRadius: "surface" } },
        },
        segmentGroup: {
          slots: segmentGroupAnatomy.keys(),
          base: { root: { "--segment-radius": "radii.full" } },
        },
        progress: {
          slots: progressAnatomy.keys(),
          base: {
            root: { colorPalette: "brand" },
            range: { borderRadius: "full" },
          },
          defaultVariants: { shape: "full" },
        },
        toast: {
          slots: toastAnatomy.keys(),
          base: {
            root: {
              borderWidth: "1px",
              borderColor: "border",
              boxShadow: "lg",
              ...Object.fromEntries(
                (
                  [
                    ["warning", "orange"],
                    ["success", "green"],
                    ["error", "red"],
                  ] as const
                ).map(([type, palette]) => [
                  `&[data-type=${type}]`,
                  {
                    bg: "bg.panel",
                    color: "fg",
                    borderColor: `${palette}.solid`,
                    "--toast-trigger-bg": "colors.bg.muted",
                    "--toast-border-color": "colors.border",
                  },
                ]),
              ),
            },
          },
        },
      },
    },
  }),
);

/**
 * The dashboard's Auto / Device / Bright / Dark preference (lib/themeMode.ts —
 * the daylight window, the system's setting and the socket sync) picks
 * Chakra's own light or dark mode; the palette is on <html> (see above).
 */
export function Provider({ children }: { children: React.ReactNode }) {
  const { effectiveMode } = useThemeMode();
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider
        forcedTheme={effectiveMode === "bright" ? "light" : "dark"}
      >
        {children}
      </ColorModeProvider>
    </ChakraProvider>
  );
}
