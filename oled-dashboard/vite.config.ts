import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

// The add-on's version (config.yaml), compiled into the bundle so a page can
// tell when the server under it has been updated (src/lib/appVersion.ts).
const version =
  readFileSync(new URL("./config.yaml", import.meta.url), "utf-8").match(
    /^version:\s*["']?([^"'\s]+)/m,
  )?.[1] ?? "";

// https://vite.dev/config/
export default defineConfig({
  // The React Compiler (0.144.1, the user's ask): every component and hook
  // under src is memoised by the compiler at build time — @rolldown/plugin-
  // babel runs babel-plugin-react-compiler with the React plugin's preset.
  // The lint's react-hooks rules are the compiler's own checks: a file they
  // fail is one the compiler would skip, so they stay errors.
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
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
