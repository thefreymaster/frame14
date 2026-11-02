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
// interface on a frame; 0.131: so does GET /api/screen/brightness/:level.
// Playwright's Chromium has no Fully, so `window.fully` is a stub that
// records the calls — and, 0.137, reads 300 lx off the light sensor (type 5).
const FULLY_STUB = () => {
  const calls: string[] = [];
  Object.assign(window, {
    screenCalls: calls,
    fully: {
      turnScreenOn: () => calls.push("on"),
      turnScreenOff: () => calls.push("off"),
      setScreenBrightness: (level: number) => calls.push(`brightness:${level}`),
      getSensorValue: (type: number) => (type === 5 ? 300 : NaN),
    },
  });
};


test("GET /api/screen/:state and /brightness/:level reach Fully on a frame, and never on a remote", async ({ page, request, isMobile }) => {
  await resetStub(request);
  await page.addInitScript(FULLY_STUB);
  await page.goto("/home");
  await expect(page.getByText("1st Floor AC")).toBeVisible();
  const calls = () => page.evaluate(() => (window as unknown as { screenCalls: string[] }).screenCalls);

  expect((await request.get("/api/screen/off")).status()).toBe(200);
  if (isMobile) {
    await request.get("/api/screen/brightness/120");
    await page.waitForTimeout(1000);
    expect(await calls()).toEqual([]);
    return;
  }
  await expect.poll(calls).toEqual(["off"]);
  await request.get("/api/screen/on");
  await expect.poll(calls).toEqual(["off", "on"]);
  expect((await request.get("/api/screen/dim")).status()).toBe(400);
  // The brightness, now and kept — and sent again with the screen coming on.
  const lit = await request.get("/api/screen/brightness/120");
  expect(lit.status()).toBe(200);
  expect(await lit.json()).toMatchObject({ brightness: 120 });
  await expect.poll(calls).toEqual(["off", "on", "brightness:120"]);
  await request.get("/api/screen/on");
  await expect.poll(calls).toEqual(["off", "on", "brightness:120", "on", "brightness:120"]);
  expect((await request.get("/api/screen/brightness/300")).status()).toBe(400);
});

// 0.130: the header's power button is the same command from the frame's own
// header, so the server knows the screen is off; a remote has no button.
test("the header's power button turns a frame's screen off, and a remote has none", async ({ page, request, isMobile }) => {
  await resetStub(request);
  await request.get("/api/screen/on");
  await page.addInitScript(FULLY_STUB);
  await page.goto("/home");
  await expect(page.getByText("1st Floor AC")).toBeVisible();
  const power = page.getByRole("button", { name: "Turn the screen off" });
  if (isMobile) {
    await expect(power).toHaveCount(0);
    return;
  }
  await power.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { screenCalls: string[] }).screenCalls)).toEqual(["off"]);
  expect(await (await request.get("/api/screen")).json()).toMatchObject({ state: "off" });
  await request.get("/api/screen/on");
});

// 0.137: a frame reports the room's light; with "Adjust to the room" on the
// add-on sets the brightness from it, and a level set by hand turns it off.
test("the frame's light sensor sets the brightness while the room-light setting is on", async ({ page, request, isMobile }) => {
  test.skip(isMobile, "a remote has no light sensor to report");
  await resetStub(request);
  await request.put("/api/screen/auto", { data: { enabled: false, min: 25, max: 255 } });
  await request.put("/api/screen/dark", { data: { enabled: false, from: "21:00", to: "06:30" } });
  await page.addInitScript(FULLY_STUB);
  await page.goto("/home");
  await expect(page.getByText("1st Floor AC")).toBeVisible();
  const screen = async () => (await request.get("/api/screen")).json();
  const calls = () => page.evaluate(() => (window as unknown as { screenCalls: string[] }).screenCalls);
  // The reading reaches the add-on, and changes nothing while the setting is off.
  await expect.poll(async () => (await screen()).lux).toBe(300);
  expect(await calls()).toEqual([]);
  // On: the room's level — min + (max − min) × log10(1 + lux) / log10(1 + 1000) — at once.
  const level = Math.round(25 + 230 * (Math.log10(301) / Math.log10(1001)));
  const on = await request.put("/api/screen/auto", { data: { enabled: true, min: 25, max: 255 } });
  expect(on.status()).toBe(200);
  expect(await on.json()).toMatchObject({ auto: { enabled: true, min: 25, max: 255 }, brightness: level });
  await expect.poll(calls).toEqual([`brightness:${level}`]);
  // A level set by hand turns it off.
  await request.get("/api/screen/brightness/100");
  await expect.poll(calls).toEqual([`brightness:${level}`, "brightness:100"]);
  expect((await screen()).auto.enabled).toBe(false);
  expect((await request.put("/api/screen/auto", { data: { enabled: true, min: 200, max: 100 } })).status()).toBe(400);
  await request.get("/api/screen/brightness/255");
});
