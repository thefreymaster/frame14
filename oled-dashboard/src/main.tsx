import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import App from "./App";
import { queryClient } from "./lib/queryClient";
import "./index.css";
import { ColorModeProvider } from "./components/ui/color-mode";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}

function updateAppHeight() {
  const h =
    (window.visualViewport && window.visualViewport.height) ||
    window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${h}px`);
}
updateAppHeight();
window.addEventListener("resize", updateAppHeight);
window.addEventListener("orientationchange", updateAppHeight);
window.visualViewport?.addEventListener("resize", updateAppHeight);
setTimeout(updateAppHeight, 100);
setTimeout(updateAppHeight, 500);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <ColorModeProvider>
          <App />
        </ColorModeProvider>
      </ChakraProvider>
    </QueryClientProvider>
  </StrictMode>,
);
