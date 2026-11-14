import { expect, test, type Page } from "@playwright/test";
import { pageErrors, resetStub } from "./helpers";
import { APP_PORT, APP_URL } from "./ports";

// The Speed test page (0.167.0): this device's connection to the Frame14
// server, measured against the real server's /api/speedtest routes — here
// over loopback, where the speeds are whatever the machine manages, so the
// tests hold the shape of a run and that bytes really moved, not a figure.
// A whole run is the round trip and then five seconds each way.

const card = (page: Page) => page.locator("[data-speed-test]");
const readout = (page: Page, kind: "download" | "upload") => page.locator(`[data-speed-readout="${kind}"]`);
const trace = (page: Page, kind: "download" | "upload") => readout(page, kind).locator("[data-speed-trace]");
const stat = (page: Page, label: string) =>
  page.locator(".chakra-stat__root", { hasText: label }).locator(".chakra-stat__valueText");
/** A figure as the page writes it: "8.45 Mbps", "845 Mbps", "1.24 Gbps". */
const SPEED = /^\d+(\.\d+)? (Mbps|Gbps)$/;
const MS = /^\d+(\.\d)? ms$/;

test.beforeEach(async ({ request }) => {
  await resetStub(request);
});

test("a test from Start to its result: the round trip, then the download, then the upload", async ({ page, request }) => {
  test.setTimeout(60_000);
  const errors = pageErrors(page);
  await page.goto("/speedtest");
  await expect(page.getByRole("heading", { name: "Speed test" })).toBeVisible();

  // Before any test: no figures, the two ends of what will be measured, and
  // nothing asked of the server until Start.
  await expect(card(page)).toHaveAttribute("data-speed-test", "idle");
  await expect(readout(page, "download")).toHaveAttribute("data-value", "");
  await expect(readout(page, "upload")).toHaveAttribute("data-value", "");
  await expect(stat(page, "This device")).toHaveText("127.0.0.1");
  await expect(stat(page, "Server")).toHaveText(`127.0.0.1:${APP_PORT}`);
  await expect(page.getByText("between this device and the Frame14 server")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Speed test progress" })).toBeHidden();

  await page.getByRole("button", { name: "Start" }).click();
  await expect(card(page)).toHaveAttribute("data-speed-test", "running");
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Speed test progress" })).toBeVisible();

  // The download: its figure live, a dot on the end of its growing trace.
  await expect(card(page)).toHaveAttribute("data-speed-phase", "download");
  await expect(stat(page, "Ping")).toHaveText(MS);
  await expect(stat(page, "Jitter")).toHaveText(MS);
  await expect(page.getByText("Testing the download…")).toBeVisible();
  await expect(readout(page, "download")).toHaveAttribute("data-value", SPEED);
  await expect(readout(page, "download")).toHaveAttribute("data-active");
  await expect(readout(page, "download").locator("[data-speed-dot]")).toBeVisible();
  await expect(readout(page, "upload")).toHaveAttribute("data-value", "");

  // The upload: the download's figure settled, the dot moved over.
  await expect(card(page)).toHaveAttribute("data-speed-phase", "upload");
  await expect(page.getByText("Testing the upload…")).toBeVisible();
  await expect(readout(page, "upload")).toHaveAttribute("data-value", SPEED);
  await expect(readout(page, "download").locator("[data-speed-dot]")).toHaveCount(0);
  await expect(readout(page, "upload").locator("[data-speed-dot]")).toBeVisible();

  // Done: both figures, their whole traces, when and how much.
  await expect(card(page)).toHaveAttribute("data-speed-test", "done", { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Test again" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Speed test progress" })).toBeHidden();
  await expect(page.locator("[data-speed-dot]")).toHaveCount(0);
  await expect(page.locator("[data-speed-status]")).toHaveText(/^Last tested \d{1,2}:\d\d [AP]M · [\d.]+ (MB|GB) of data used$/);
  for (const kind of ["download", "upload"] as const) {
    await expect(readout(page, kind)).toHaveAttribute("data-value", SPEED);
    // A point a tick for five seconds: a late tick fills what it skipped.
    await expect(trace(page, kind), kind).toHaveAttribute("data-speed-trace", "20");
  }

  // Bytes really moved, both ways, and loopback is no slow link.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("speed-test:last")!));
  expect(saved.download).toBeGreaterThan(10);
  expect(saved.upload).toBeGreaterThan(10);
  expect(saved.downloadBytes).toBeGreaterThan(5_000_000);
  expect(saved.uploadBytes).toBeGreaterThan(5_000_000);
  expect(saved.ping).toBeLessThan(250);

  // The result is this device's, there again after a reload.
  const figures = {
    download: await readout(page, "download").getAttribute("data-value"),
    upload: await readout(page, "upload").getAttribute("data-value"),
  };
  await page.reload();
  await expect(card(page)).toHaveAttribute("data-speed-test", "done");
  await expect(readout(page, "download")).toHaveAttribute("data-value", figures.download!);
  await expect(readout(page, "upload")).toHaveAttribute("data-value", figures.upload!);
  await expect(page.getByRole("button", { name: "Test again" })).toBeVisible();

  expect(errors).toEqual([]);
  // The server came through every request the page cut short.
  expect((await request.get("/api/speedtest/ping")).status()).toBe(204);
});

test("Stop ends a test under way: nothing kept, nothing more asked of the server", async ({ page, request }) => {
  const errors = pageErrors(page);
  await page.goto("/speedtest");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(card(page)).toHaveAttribute("data-speed-phase", "download");
  await expect(readout(page, "download")).toHaveAttribute("data-value", SPEED);

  await page.getByRole("button", { name: "Stop" }).click();
  await expect(card(page)).toHaveAttribute("data-speed-test", "idle");
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  await expect(readout(page, "download")).toHaveAttribute("data-value", "");
  expect(await page.evaluate(() => localStorage.getItem("speed-test:last"))).toBeNull();

  // No transfer goes on behind the page, and the upload never starts.
  const asked: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/speedtest/")) asked.push(req.url());
  });
  await page.waitForTimeout(1_000);
  expect(asked).toEqual([]);
  expect(errors).toEqual([]);
  expect((await request.get("/api/speedtest/ping")).status()).toBe(204);
});

test("leaving the page ends a test under way", async ({ page }) => {
  const errors = pageErrors(page);
  await page.goto("/speedtest");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(card(page)).toHaveAttribute("data-speed-phase", "download");
  // By the browser's Back and the router, not a reload: the app lives on.
  await page.evaluate(() => {
    history.pushState({}, "", "/calendar");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByRole("heading", { name: "Speed test" })).toHaveCount(0);
  const asked: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/speedtest/")) asked.push(req.url());
  });
  await page.waitForTimeout(1_000);
  expect(asked).toEqual([]);
  expect(errors).toEqual([]);
});

test("a frame's nav has it, last before Settings, and a tap on it moves no other frame", async ({ page, browser, isMobile }) => {
  test.skip(isMobile, "the phone project is a remote: its entry is off until turned on (the next test)");
  // Another frame: a fresh context, as the Display card's test makes one.
  const other = await browser.newContext({ baseURL: APP_URL });
  await other.addInitScript(() => localStorage.setItem("device-mode", "frame"));
  const frame = await other.newPage();
  try {
    await frame.goto("/home");
    await page.goto("/home");
    const rail = page.locator('[data-nav="rail"]');
    expect((await rail.getByRole("tab").allTextContents()).slice(-2)).toEqual(["Speed test", "Settings"]);

    // An everyday view takes the other frame along…
    await rail.getByRole("tab", { name: "Calendar" }).click();
    await expect(frame).toHaveURL(/\/calendar$/);
    // …the speed test is this device's own.
    await rail.getByRole("tab", { name: "Speed test" }).click();
    await expect(page).toHaveURL(/\/speedtest$/);
    await expect(page.getByRole("heading", { name: "Speed test" })).toBeVisible();
    await expect(rail.getByRole("tab", { name: "Speed test" })).toHaveAttribute("aria-selected", "true");
    await frame.waitForTimeout(500);
    await expect(frame).toHaveURL(/\/calendar$/);
  } finally {
    await other.close();
    // The server keeps the frames' view for every later page: back Home.
    await page.locator('[data-nav="rail"]').getByRole("tab", { name: "Home" }).click();
  }
});

test("a remote has the entry once it is turned on in Settings", async ({ page, isMobile }) => {
  test.skip(!isMobile, "the desktop project is a frame: it has the entry from the start (the test before)");
  await page.goto("/control/device");
  const bar = page.locator('[data-nav="bar"]');
  await expect(bar.getByRole("tab")).toHaveText(["Home", "Lights", "Climate", "Photos", "Settings"]);

  const toggle = page.getByRole("checkbox", { name: "Show Speed test in the nav" });
  await expect(toggle).not.toBeChecked();
  await page.locator("label", { has: toggle }).click();
  await expect(toggle).toBeChecked();

  // A sixth entry: four in the bar, and it with Settings under More.
  await expect(bar.getByRole("tab")).toHaveText(["Home", "Lights", "Climate", "Photos"]);
  await bar.getByRole("button", { name: "More" }).click();
  await expect(page.getByRole("menuitem")).toHaveText(["Speed test", "Settings"]);
  await page.getByRole("menuitem", { name: "Speed test" }).click();
  await expect(page).toHaveURL(/\/speedtest$/);
  await expect(page.getByRole("heading", { name: "Speed test" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
});
