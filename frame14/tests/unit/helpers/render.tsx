import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

/** The app's providers a component test needs: Chakra's stock system and a query client. */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ChakraProvider value={defaultSystem}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ChakraProvider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
}
