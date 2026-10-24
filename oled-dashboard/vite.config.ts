import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The add-on's version (config.yaml), compiled into the bundle so a page can
// tell when the server under it has been updated (src/lib/appVersion.ts).
const version =
  readFileSync(new URL("./config.yaml", import.meta.url), "utf-8").match(
    /^version:\s*["']?([^"'\s]+)/m,
  )?.[1] ?? "";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:4000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
