"use client";

import {
  ChakraProvider,
  createSystem,
  defaultConfig,
  defineConfig,
} from "@chakra-ui/react";
import {
  cardAnatomy,
  dialogAnatomy,
  segmentGroupAnatomy,
  toastAnatomy,
} from "@chakra-ui/react/anatomy";
import { ColorModeProvider } from "./color-mode";
import { PHONE_MEDIA } from "../../lib/homeLayout";
import { useThemeMode } from "../../hooks/useThemeMode";

/**
 * Chakra's stock system with a few additions.
 *
 * Buttons are fully rounded: the button recipe also drives IconButton and
 * CloseButton, so text buttons are pills and icon buttons are circles;
 * segmented controls (a row of buttons) get the same pill track and indicator.
 *
 * Cards have the `bg.surface` colour (#1C1C1E in dark mode), `surface`
 * corners (0.75rem) and a 1px `border.surface` edge, both floating navs' too;
 * the corners replace the Card recipe's `l3`. Tiles inside a card set Chakra's
 * smaller `sm` themselves, so none is rounder than its card (the thermostat
 * tiles excepted).
 *
 * Dialog backdrops blur the page behind them as well as dimming it.
 *
 * Toasts are outlined, not solid (0.125, the user's ask): every type keeps the
 * panel face and `fg` text, with a 1px border in its colour — green, red,
 * orange — where Chakra fills the whole toast with it; the snippet
 * (ui/toaster.tsx) colours the indicator to match.
 *
 * Spacing has a named `xs` (0.25rem, 4px at the base size), `sm` (0.5rem) and
 * `md` (1rem), and `gutter`, the page's padding around the cards and the gap
 * between them — the same, always: md, or sm on a phone (the `phone`
 * condition, PHONE_MEDIA: the one-column screens).
 */
const system = createSystem(
  defaultConfig,
  defineConfig({
    conditions: { phone: PHONE_MEDIA },
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
          bg: {
            // The colour of every card and both floating navs: in dark mode
            // iOS's grouped-cell grey, #1C1C1E (UIKit's
            // secondarySystemGroupedBackground, the Settings app's groups on
            // black; the user's pick in 0.71, replacing #23242b), Chakra's own
            // panel white in light mode.
            surface: {
              value: { _light: "{colors.bg.panel}", _dark: "#1C1C1E" },
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
        // Every modal blurs the page behind its dimmed backdrop.
        dialog: {
          slots: dialogAnatomy.keys(),
          base: { backdrop: { backdropFilter: "blur(4px)" } },
        },
        segmentGroup: {
          slots: segmentGroupAnatomy.keys(),
          base: { root: { "--segment-radius": "radii.full" } },
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
 * The dashboard's Auto / Bright / Dark preference (lib/themeMode.ts —
 * daylight window and socket sync) picks Chakra's own light or dark mode;
 * there is no custom palette.
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
