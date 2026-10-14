"use client";

import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { ColorModeProvider } from "./color-mode";
import { useThemeMode } from "../../hooks/useThemeMode";

/**
 * Chakra's stock system and colour mode. The dashboard's Auto / Bright / Dark
 * preference (lib/themeMode.ts — daylight window and socket sync) picks
 * Chakra's own light or dark mode; there is no custom palette.
 */
export function Provider({ children }: { children: React.ReactNode }) {
  const { effectiveMode } = useThemeMode();
  return (
    <ChakraProvider value={defaultSystem}>
      <ColorModeProvider
        forcedTheme={effectiveMode === "bright" ? "light" : "dark"}
      >
        {children}
      </ColorModeProvider>
    </ChakraProvider>
  );
}
