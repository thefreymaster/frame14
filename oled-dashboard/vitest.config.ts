import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Dates in the tests are reasoned about in one zone, whatever machine runs
// them (fmtWhen's "Yesterday", the advisories' "tonight").
process.env.TZ = "America/New_York";

// Two projects: the client's libs and components in a browser-like DOM, and
// the server's modules in Node. `npm test` runs both; `npm run test:e2e` is
// Playwright (playwright.config.ts), not this.
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: "client",
          environment: "jsdom",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/setup.ts"],
          css: false,
        },
        define: { __APP_VERSION__: JSON.stringify("0.0.0-test") },
      },
      {
        test: {
          name: "server",
          environment: "node",
          include: ["tests/server/**/*.test.js"],
          // ha-socket.test.js talks to the stub over a real WebSocket.
          testTimeout: 15_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**", "routes/**", "*.js"],
      exclude: ["src/components/ui/**", "openapi.js", "scripts/**"],
    },
  },
});
