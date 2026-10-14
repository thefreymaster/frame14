import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { queryClient } from "./lib/queryClient";
// Applies the saved theme mode before the first paint.
import "./lib/themeMode";
import { Provider } from "./components/ui/provider";
import { Toaster } from "./components/ui/toaster";

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
requestAnimationFrame(updateAppHeight);
window.addEventListener("resize", updateAppHeight);
window.addEventListener("orientationchange", updateAppHeight);
window.addEventListener("pageshow", updateAppHeight);
window.addEventListener("load", updateAppHeight);
window.visualViewport?.addEventListener("resize", updateAppHeight);
setTimeout(updateAppHeight, 100);
setTimeout(updateAppHeight, 300);
setTimeout(updateAppHeight, 600);
setTimeout(updateAppHeight, 1200);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider>
        <App />
        <Toaster />
      </Provider>
    </QueryClientProvider>
  </StrictMode>,
);
