import { existsSync } from "node:fs";
import os from "node:os";
import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test";
import { APP_URL, appPort, appUrl, stubPort, stubUrl } from "./tests/e2e/ports";
import { SUITE_DEVICE } from "./tests/e2e/settingsCards";

// End-to-end: the real server (index.js, the built client in dist/) against
// the stub Home Assistant (tests/stub/stub-ha.mjs), a pair for every worker,
// started here on the ports in tests/e2e/ports.ts. Build first
// (`npm run build`).
if (!existsSync(new URL("./dist/index.html", import.meta.url))) {
  throw new Error("No build in dist/ — run `npm run build` before the end-to-end tests.");
}

// How many spec files run at once, each against a stub and a server of its
// own (tests/e2e/ports.ts): one for every core, four at most, and no more
// than the machine has memory for — a worker is a browser, a server and a
// stub, about 1.5 GB to be safe. Four on GitHub's runners, two on a 4 GB
// machine. `E2E_WORKERS=1` is the suite as it ran through 0.178.1; don't
// raise it with `--workers`, which starts no servers for the extra ones.
const WORKERS =
  Number(process.env.E2E_WORKERS) ||
  Math.max(1, Math.min(4, os.availableParallelism(), Math.floor(os.totalmem() / 1.5e9)));

type WebServer = Extract<NonNullable<PlaywrightTestConfig["webServer"]>, unknown[]>[number];

/** Worker `slot`'s stub Home Assistant, and its server — started in that order. */
const serversFor = (slot: number): WebServer[] => [
  {
    command: "node tests/stub/stub-ha.mjs",
    url: `${stubUrl(slot)}/api/`,
    env: { STUB_PORT: String(stubPort(slot)) },
    reuseExistingServer: false,
    timeout: 15_000,
  },
  {
    // The frames' theme saved as Gray first (tests/e2e/seed.mjs): the
    // suite's pages are Gray's, which was the default until 0.176.0.
    command: "node tests/e2e/seed.mjs && node index.js",
    url: `${appUrl(slot)}/api`,
    env: {
      PORT: String(appPort(slot)),
      HA_URL: stubUrl(slot),
      HA_TOKEN: "e2e-token",
      FRAME14_CONFIG: "tests/stub/frame14.test.json",
      // What the server keeps (screen.js's schedule, the theme, who was
      // here), cleared with each run and its own for each worker's server.
      FRAME14_DATA_DIR: `test-results/data-${slot}`,
      // The stub's stand-in push service (/_stub/push/:id) counts as one.
      FRAME14_PUSH_ORIGINS: stubUrl(slot),
      // Who is signed in (0.168.0): the stub is the Cloudflare Access team
      // too — its keys page, and tokens signed with that key.
      CLOUDFLARE_ACCESS_TEAM: "e2e",
      FRAME14_ACCESS_CERTS_URL: `${stubUrl(slot)}/_stub/access/certs`,
      PLEX_URL: "",
      PLEX_TOKEN: "",
      WEB_UI_URL: "",
    },
    reuseExistingServer: false,
    timeout: 15_000,
  },
];

export default defineConfig({
  testDir: "tests/e2e",
  // A spec file's tests steer its worker's stub and server, so they run one
  // at a time, in order — a light turned off in one isn't counted on in
  // another. The files themselves run side by side, a worker each.
  fullyParallel: false,
  workers: WORKERS,
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
  webServer: Array.from({ length: WORKERS }, (_, slot) => serversFor(slot)).flat(),
});
