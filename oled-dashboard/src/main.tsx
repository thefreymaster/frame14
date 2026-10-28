import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { queryClient } from "./lib/queryClient";
import { persistQueries, restoreQueries } from "./lib/persistedQueries";
import "./index.css";
// Applies the saved theme mode before the first paint.
import "./lib/themeMode";
// Watches for the add-on updating under this page.
import "./lib/appVersion";
import { Provider } from "./components/ui/provider";
import { Toaster } from "./components/ui/toaster";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}

// The app's height (`--app-height`: Layout's scroll Box, the navs' place):
// the layout viewport's, which iOS keeps whole while the keyboard, a pinch
// or a system sheet shrinks the visual one. It followed visualViewport.height
// until 0.114, and a resize the page never saw the end of — a sheet over a
// home-screen app — left the bar two thirds of the way down the screen with
// black under it until the next real resize. Re-read whenever the page comes
// back into view as well, in case a size change happened out of sight.
function updateAppHeight() {
  const h = document.documentElement.clientHeight || window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${h}px`);
}
updateAppHeight();
requestAnimationFrame(updateAppHeight);
window.addEventListener("resize", updateAppHeight);
window.addEventListener("orientationchange", updateAppHeight);
window.addEventListener("pageshow", updateAppHeight);
window.addEventListener("load", updateAppHeight);
window.addEventListener("focus", updateAppHeight);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") updateAppHeight();
});
setTimeout(updateAppHeight, 100);
setTimeout(updateAppHeight, 300);
setTimeout(updateAppHeight, 600);
setTimeout(updateAppHeight, 1200);

// The last launch's data, so the cards draw at once while the live answers
// come in (lib/persistedQueries).
restoreQueries(queryClient);
persistQueries(queryClient);

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
