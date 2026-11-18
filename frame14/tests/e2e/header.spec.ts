import { expect, test, type Page } from "@playwright/test";
import { quietHouse, resetStub, splashGone, stub } from "./helpers";
import { APP_URL } from "./ports";

// The header's buttons — the running appliances, the connection, the mic, a
// remote's button to refresh the frames (0.175.0) and the power button — sit
// `xs` apart (0.25rem), one group, since 0.163.0, and are all the mic's size:
// the appliance and connection icons are IconButtons too, without a fill.
// They were 0.75rem apart before, and the icons only as wide as their glyphs.
async function buttonGaps(page: Page) {
  return page.locator("[data-header-buttons]").evaluate((group) => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const boxes = [...group.querySelectorAll("button")].map((b) => b.getBoundingClientRect());
    const inRem = (px: number) => Math.round((px / rem) * 100) / 100;
    return {
      count: boxes.length,
      gaps: boxes.slice(1).map((b, i) => inRem(b.left - boxes[i].right)),
      sizes: [...new Set(boxes.map((b) => `${inRem(b.width)}x${inRem(b.height)}`))],
    };
  });
}

test.beforeEach(async ({ request }) => {
  await resetStub(request);
});

test("the header's buttons are one size, xs apart: the appliances, the connection, the mic, a remote's refresh and the power button", async ({ page, request, isMobile }) => {
  // The stub's printer prints and its vacuum cleans; the dishwasher joins them.
  await stub(request, "/_stub/state", { entity_id: "binary_sensor.dishwasher_running", state: "on" });
  await page.goto("/home");
  await splashGone(page);
  await expect(page.getByRole("button", { name: "Dishwasher running" })).toBeVisible();
  await expect(page.getByRole("button", { name: "3D printer running" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ask the house" })).toBeVisible();
  const { count } = await buttonGaps(page);
  expect(count).toBeGreaterThanOrEqual(5);
  await expect.poll(() => buttonGaps(page)).toEqual({ count, gaps: Array(count - 1).fill(0.25), sizes: ["2x2"] });
  // Only the mic and the power button are filled — and, between them on a
  // remote (the phone project's device), the button that refreshes the frames.
  const fills = await page.locator("[data-header-buttons] button").evaluateAll((buttons) =>
    buttons.map((b) => getComputedStyle(b).backgroundColor !== "rgba(0, 0, 0, 0)"),
  );
  const faced = isMobile ? 3 : 2;
  expect(fills).toEqual([...Array(count - faced).fill(false), ...Array(faced).fill(true)]);
});

// 0.175.0, the user: "If you're running in the remote mode, there should be a
// icon button in the header to refresh frames". The Display card's "Refresh
// displays", from wherever the remote is.
test("a remote's header has a button that refreshes the frames: a frame's page loads afresh, the remote's own stays", async ({ page, browser }) => {
  type Marked = { beforeRefresh?: boolean };
  const mark = (p: Page) => p.evaluate(() => ((window as unknown as Marked).beforeRefresh = true));
  const marked = (p: Page) => p.evaluate(() => (window as unknown as Marked).beforeRefresh === true);

  const frames = await browser.newContext({ baseURL: APP_URL });
  try {
    const frame = await frames.newPage();
    await frame.addInitScript(() => localStorage.setItem("device-mode", "frame"));
    await frame.goto("/lights");
    await splashGone(frame);
    // On the socket, where the server's word arrives.
    await expect(frame.getByRole("button", { name: "Connected" })).toBeVisible();
    // A frame has no such button: its own reload is the connection menu's.
    await expect(frame.getByRole("button", { name: "Turn the screen off" })).toBeVisible();
    await expect(frame.getByRole("button", { name: "Refresh the frames" })).toHaveCount(0);
    await mark(frame);

    await page.addInitScript(() => localStorage.setItem("device-mode", "controller"));
    await page.goto("/home");
    await splashGone(page);
    // Between the mic and the power button, the last three of the group.
    const labels = await page
      .locator("[data-header-buttons] button")
      .evaluateAll((buttons) => buttons.slice(-3).map((b) => b.getAttribute("aria-label")));
    expect(labels).toEqual(["Ask the house", "Refresh the frames", "Turn the frame's screen off"]);
    await mark(page);

    await Promise.all([
      frame.waitForEvent("load"),
      page.getByRole("button", { name: "Refresh the frames" }).click(),
    ]);
    // The frame's page is a new one, on the page it was on.
    expect(await marked(frame)).toBe(false);
    await expect(frame).toHaveURL(/\/lights$/);
    // The remote says it went, and is the page it was.
    await expect(page.getByText("Refreshing the frames")).toBeVisible();
    await frame.waitForTimeout(500);
    expect(await marked(page)).toBe(true);
  } finally {
    await frames.close();
  }
});

// With the refresh button a remote's group is one button wider, and on a
// phone a washer, a dryer, a dishwasher, a print and a vacuum at once ran the
// power button off the screen's edge. The name gives way instead (0.175.0).
test("on a phone's width the header's name gives way to its buttons on a busy day: every button on the screen, the icon still there, and the name back on a quiet one", async ({ page, request }) => {
  const header = () =>
    page.locator("[data-header-buttons]").evaluate((group) => {
      const name = document.querySelector("[data-header-name]")!;
      const box = name.getBoundingClientRect();
      const word = name.querySelector("p")!.getBoundingClientRect();
      const icon = name.querySelector("img")!.getBoundingClientRect();
      const row = group.parentElement!;
      const inside = (r: DOMRect) => r.width > 0 && r.left >= box.left - 0.5 && r.right <= box.right + 0.5 && r.top >= box.top - 0.5 && r.bottom <= box.bottom + 0.5;
      const touches = (r: DOMRect) => r.left < box.right - 0.5 && r.right > box.left + 0.5 && r.top < box.bottom - 0.5 && r.bottom > box.top + 0.5;
      return {
        buttons: group.querySelectorAll("button").length,
        // From the group's end to the screen's edge, against the row's own padding.
        clear: Math.round(innerWidth - group.getBoundingClientRect().right - parseFloat(getComputedStyle(row).paddingRight)),
        // The name's box clips: what it shows is what lies inside it.
        name: inside(word),
        // Whole or gone, never a cut "Fra".
        cut: touches(word) && !inside(word),
        icon: inside(icon),
        iconTop: Math.round(icon.top * 10) / 10,
        scrolls: document.documentElement.scrollWidth > innerWidth,
      };
    });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("device-mode", "controller"));
  // The stub's printer prints and its vacuum cleans; the rest join them.
  for (const entity_id of [
    "binary_sensor.cloths_washer_clothes_washer_running",
    "binary_sensor.drier_dryer_running",
    "binary_sensor.dishwasher_running",
  ]) {
    await stub(request, "/_stub/state", { entity_id, state: "on" });
  }
  await page.goto("/home");
  await splashGone(page);
  for (const name of ["Washer running", "Dryer running", "Dishwasher running", "3D printer running", "Refresh the frames"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
  // Five appliances, the connection, the mic, the refresh and the power button.
  await expect.poll(header).toMatchObject({ buttons: 9, clear: 0, name: false, cut: false, icon: true, scrolls: false });
  const busy = await header();

  // An ordinary day: the name beside the icon, which hasn't moved.
  await resetStub(request);
  await quietHouse(request);
  await expect(page.getByRole("button", { name: "3D printer running" })).toHaveCount(0);
  await expect.poll(header).toMatchObject({ buttons: 4, clear: 0, name: true, cut: false, icon: true, iconTop: busy.iconTop, scrolls: false });
});

test("the connection menu offers Reload while connected, and a tap reloads the page", async ({ page }) => {
  await page.goto("/home");
  await splashGone(page);
  await page.getByRole("button", { name: "Connected" }).click();
  const reload = page.getByRole("button", { name: "Reload" });
  await expect(reload).toBeVisible();
  await page.evaluate(() => ((window as unknown as { beforeReload: boolean }).beforeReload = true));
  await Promise.all([page.waitForEvent("load"), reload.click()]);
  expect(await page.evaluate(() => (window as unknown as { beforeReload?: boolean }).beforeReload)).toBeUndefined();
});

test.describe("the header's tooltips", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "a tooltip is a pointer's: a touch only taps");
  });

  test("the mic and a frame's power button say what a tap does", async ({ page }) => {
    await page.goto("/home");
    await splashGone(page);
    await page.getByRole("button", { name: "Ask the house" }).hover();
    await expect(page.getByRole("tooltip")).toHaveText("Ask the house");
    await page.getByRole("button", { name: "Turn the screen off" }).hover();
    await expect(page.getByRole("tooltip").filter({ hasText: "Turn the screen off" })).toBeVisible();
  });

  test("a remote's power button says it switches the frame's screen, and its refresh that it refreshes the frames", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("device-mode", "controller"));
    await page.goto("/home");
    await splashGone(page);
    await page.getByRole("button", { name: "Turn the frame's screen off" }).hover();
    await expect(page.getByRole("tooltip")).toHaveText("Turn the frame's screen off");
    await page.getByRole("button", { name: "Refresh the frames" }).hover();
    await expect(page.getByRole("tooltip").filter({ hasText: "Refresh the frames" })).toBeVisible();
  });
});
