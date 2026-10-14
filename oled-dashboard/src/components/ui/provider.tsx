import { ChakraProvider } from "@chakra-ui/react";
import { system } from "../../theme";

/**
 * Chakra with the dashboard's system. There is no colour-mode provider:
 * lib/themeMode.ts owns auto / bright / dark and toggles the `dark` class that
 * the system's semantic tokens key off.
 */
export function Provider({ children }: { children: React.ReactNode }) {
  return <ChakraProvider value={system}>{children}</ChakraProvider>;
}
