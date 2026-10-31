import { expect, test } from "@playwright/test";
import { resetStub } from "./helpers";

// What a Home Assistant automation does: GET /api/change/:view moves every
// frame. A remote (a phone) ignores it, so this is the desktop's test.
test("GET /api/change/:view moves the frame, and a remote stays put", async ({ page, request, isMobile }) => {
  await resetStub(request);
  await page.goto("/home");
  await expect(page.getByText("1st Floor AC")).toBeVisible();

  const res = await request.get("/api/change/clock");
  expect(res.status()).toBe(200);

  if (isMobile) {
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/home$/);
    return;
  }
  await expect(page).toHaveURL(/\/clock$/);
  // The nav's selected entry follows the page.
  await expect(page.getByRole("tab", { name: "Clock", selected: true })).toBeVisible();
  await request.get("/api/change/home");
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("tab", { name: "Home", selected: true })).toBeVisible();
});

test("a remote's nav keeps its selected entry when the frames are sent elsewhere", async ({ page, request, isMobile }) => {
  test.skip(!isMobile, "a frame follows the broadcast, so its nav follows the page");
  await resetStub(request);
  await page.goto("/lights");
  await expect(page.getByRole("tab", { name: "Lights", selected: true })).toBeVisible();

  // 0.127: the nav used to move its highlight to Home on the broadcast while
  // the page stayed on /lights.
  await request.get("/api/change/home");
  await page.waitForTimeout(1000);
  await expect(page).toHaveURL(/\/lights$/);
  await expect(page.getByRole("tab", { name: "Lights", selected: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Home", selected: true })).toHaveCount(0);
});

// 0.129: GET /api/screen/:state reaches Fully Kiosk Browser's JavaScript
// interface on a frame. Playwright's Chromium has no Fully, so `window.fully`
// is a stub that records the calls.
test("GET /api/screen/:state turns a frame's screen off and on through Fully, and never a remote's", async ({ page, request, isMobile }) => {
  await resetStub(request);
  await page.addInitScript(() => {
    const calls: string[] = [];
    Object.assign(window, {
      screenCalls: calls,
      fully: { turnScreenOn: () => calls.push("on"), turnScreenOff: () => calls.push("off") },
    });
  });
  await page.goto("/home");
  await expect(page.getByText("1st Floor AC")).toBeVisible();
  const calls = () => page.evaluate(() => (window as unknown as { screenCalls: string[] }).screenCalls);

  expect((await request.get("/api/screen/off")).status()).toBe(200);
  if (isMobile) {
    await page.waitForTimeout(1000);
    expect(await calls()).toEqual([]);
    return;
  }
  await expect.poll(calls).toEqual(["off"]);
  await request.get("/api/screen/on");
  await expect.poll(calls).toEqual(["off", "on"]);
  expect((await request.get("/api/screen/dim")).status()).toBe(400);
});
