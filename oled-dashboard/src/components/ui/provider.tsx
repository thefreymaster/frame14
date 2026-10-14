"use client";

import {
  ChakraProvider,
  createSystem,
  defaultConfig,
  defineConfig,
} from "@chakra-ui/react";
import { segmentGroupAnatomy } from "@chakra-ui/react/anatomy";
import { ColorModeProvider } from "./color-mode";
import { useThemeMode } from "../../hooks/useThemeMode";

/**
 * Chakra's stock system with one change: buttons are fully rounded. The
 * button recipe also drives IconButton and CloseButton, so text buttons are
 * pills and icon buttons are circles; segmented controls (a row of buttons)
 * get the same pill track and indicator. Cards, tiles and tabs keep Chakra's
 * own radii.
 */
const system = createSystem(
  defaultConfig,
  defineConfig({
    theme: {
      recipes: {
        button: { base: { borderRadius: "full" } },
      },
      slotRecipes: {
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
