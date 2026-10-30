import { expect, test } from "@playwright/test";
import { pageErrors, resetStub } from "./helpers";

// The Halloween page is Oct 30 and 31's (lib/halloween), so the browser's
// clock is fixed to the day — and to a day in November — in the house's
// time zone. Only Date is fixed; the page's timers run.
test.use({ timezoneId: "America/New_York" });
const HALLOWEEN = new Date("2026-10-31T18:30:00-04:00");
const NOVEMBER = new Date("2026-11-04T18:30:00-05:00");

test.describe("the Halloween page", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test("on Oct 31 a frame's nav offers it; the page is the greeting, full-bleed, with the witch", async ({ page, isMobile }) => {
    test.skip(isMobile, "a remote's nav starts without it (off until turned on, like Football); its Views card is the test below");
    const errors = pageErrors(page);
    await page.clock.setFixedTime(HALLOWEEN);
    await page.goto("/home");
    await page.getByRole("tab", { name: "Halloween" }).click();
    await expect(page).toHaveURL(/\/halloween$/);
    await expect(page.getByRole("heading", { name: "Happy Halloween" })).toBeVisible();
    // Full-bleed: the nav slides away (the eye offers it back), and the eye
    // brings it back on this entry.
    const eye = page.getByRole("button", { name: "Show navigation" });
    await expect(eye).toBeVisible();
    // The witch flies through within seconds of arriving.
    await expect(page.getByRole("img", { name: "A witch on a broom" })).toBeVisible({ timeout: 10_000 });
    await eye.click();
    await expect(page.getByRole("button", { name: "Hide navigation" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Halloween", selected: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("on Oct 31 a remote's Views card sends the frames there, and the remote stays on Settings", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the Views card is a remote's");
    await page.clock.setFixedTime(HALLOWEEN);
    await page.goto("/control");
    // The frames may already be on it (the spec before sent them there, and
    // the card shows the frames' view), so start them on the clock.
    const clock = page.getByRole("button", { name: "Clock", exact: true });
    const tile = page.getByRole("button", { name: "Halloween", exact: true });
    await clock.click();
    await expect(clock).toHaveAttribute("aria-pressed", "true");
    await expect(tile).toHaveAttribute("aria-pressed", "false");
    await tile.click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/control$/);
    await expect(tile).toHaveAttribute("aria-pressed", "true");
    await expect(clock).toHaveAttribute("aria-pressed", "false");
  });

  test("an automation can put a frame on it", async ({ page, request, isMobile }) => {
    test.skip(isMobile, "a remote ignores the frames' view changes");
    await page.clock.setFixedTime(HALLOWEEN);
    await page.goto("/home");
    await expect(page.getByText("1st Floor AC")).toBeVisible();
    await request.get("/api/change/halloween");
    await expect(page).toHaveURL(/\/halloween$/);
    await expect(page.getByRole("heading", { name: "Happy Halloween" })).toBeVisible();
  });

  test("in November neither the nav nor the Views card has it", async ({ page, isMobile }) => {
    await page.clock.setFixedTime(NOVEMBER);
    if (isMobile) {
      await page.goto("/control");
      await expect(page.getByRole("button", { name: "Clock", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Halloween", exact: true })).toHaveCount(0);
      return;
    }
    await page.goto("/home");
    await expect(page.getByRole("tab", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Halloween" })).toHaveCount(0);
  });
});
