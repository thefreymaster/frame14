import { expect, test, type Page } from "@playwright/test";
import { resetStub, splashGone, stub } from "./helpers";

// The header's buttons — the running appliances, the connection, the mic and
// the power button — sit `xs` apart (0.25rem), one group, since 0.163.0, and
// are all the mic's size: the appliance and connection icons are IconButtons
// too, without a fill. They were 0.75rem apart before, and the icons only as
// wide as their glyphs.
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

test("the header's buttons are one size, xs apart: the appliances, the connection, the mic and the power button", async ({ page, request }) => {
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
  // Only the mic and the power button are filled.
  const fills = await page.locator("[data-header-buttons] button").evaluateAll((buttons) =>
    buttons.map((b) => getComputedStyle(b).backgroundColor !== "rgba(0, 0, 0, 0)"),
  );
  expect(fills).toEqual([...Array(count - 2).fill(false), true, true]);
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

  test("a remote's power button says it switches the frame's screen", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("device-mode", "controller"));
    await page.goto("/home");
    await splashGone(page);
    await page.getByRole("button", { name: "Turn the frame's screen off" }).hover();
    await expect(page.getByRole("tooltip")).toHaveText("Turn the frame's screen off");
  });
});
