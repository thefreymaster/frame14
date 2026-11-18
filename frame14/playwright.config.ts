import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { APP_PORT, APP_URL, STUB_PORT, STUB_URL } from "./tests/e2e/ports";
import { SUITE_DEVICE } from "./tests/e2e/settingsCards";

// End-to-end: the real server (index.js, the built client in dist/) against
// the stub Home Assistant (tests/stub/stub-ha.mjs), both started here on the
// ports in tests/e2e/ports.ts. Build first (`npm run build`).
if (!existsSync(new URL("./dist/index.html", import.meta.url))) {
  throw new Error("No build in dist/ — run `npm run build` before the end-to-end tests.");
}

export default defineConfig({
  testDir: "tests/e2e",
  // The tests steer one stub and one server; they run one at a time so a
  // light turned off in one isn't counted on in another.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: APP_URL,
    // Settings' cards start out folded (0.173.0) and a device that has
    // picked no colours wears Embossed (0.176.0); the suite's browsers are
    // devices that have opened the cards and picked Gray, as they all were
    // until then. A test of a default uses FRESH_DEVICE
    // (tests/e2e/settingsCards.ts).
    storageState: SUITE_DEVICE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // A desktop browser: frame mode (a desktop user agent), four home columns.
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } },
    },
    // A phone: remote mode (an Android user agent), one column.
    {
      name: "phone",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: [
    {
      command: "node tests/stub/stub-ha.mjs",
      url: `${STUB_URL}/api/`,
      env: { STUB_PORT: String(STUB_PORT) },
      reuseExistingServer: false,
      timeout: 15_000,
    },
    {
      // The frames' theme saved as Gray first (tests/e2e/seed.mjs): the
      // suite's pages are Gray's, which was the default until 0.176.0.
      command: "node tests/e2e/seed.mjs && node index.js",
      url: `${APP_URL}/api`,
      env: {
        PORT: String(APP_PORT),
        HA_URL: STUB_URL,
        HA_TOKEN: "e2e-token",
        FRAME14_CONFIG: "tests/stub/frame14.test.json",
        // The screen schedule's file (screen.js), cleared with each run.
        FRAME14_DATA_DIR: "test-results/data",
        // The stub's stand-in push service (/_stub/push/:id) counts as one.
        FRAME14_PUSH_ORIGINS: STUB_URL,
        // Who is signed in (0.168.0): the stub is the Cloudflare Access team
        // too — its keys page, and tokens signed with that key.
        CLOUDFLARE_ACCESS_TEAM: "e2e",
        FRAME14_ACCESS_CERTS_URL: `${STUB_URL}/_stub/access/certs`,
        PLEX_URL: "",
        PLEX_TOKEN: "",
        WEB_UI_URL: "",
      },
      reuseExistingServer: false,
      timeout: 15_000,
    },
  ],
});
