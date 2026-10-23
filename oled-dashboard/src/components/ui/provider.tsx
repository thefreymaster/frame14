"use client";

import {
  ChakraProvider,
  createSystem,
  defaultConfig,
  defineConfig,
} from "@chakra-ui/react";
import { cardAnatomy, segmentGroupAnatomy } from "@chakra-ui/react/anatomy";
import { ColorModeProvider } from "./color-mode";
import { useThemeMode } from "../../hooks/useThemeMode";

/**
 * Chakra's stock system with three additions.
 *
 * Buttons are fully rounded: the button recipe also drives IconButton and
 * CloseButton, so text buttons are pills and icon buttons are circles;
 * segmented controls (a row of buttons) get the same pill track and indicator.
 *
 * Cards have `surface` corners (1.25rem), the floating side rail's too, in
 * place of the Card recipe's `l3`. Tiles inside a card set Chakra's smaller
 * `sm` themselves, so none is rounder than its card.
 *
 * Spacing has a named `xs` (0.25rem, 4px at the base size): the gap between
 * cards and the page's padding around them.
 */
const system = createSystem(
  defaultConfig,
  defineConfig({
    theme: {
      tokens: {
        spacing: { xs: { value: "0.25rem" } },
        radii: { surface: { value: "1.25rem" } },
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
