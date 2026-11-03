import { expect, test } from "@playwright/test";
import { cornersRounderThanConcentric, resetStub } from "./helpers";

// No rounded box sits in a rounded box with a rounder corner than concentric
// (0.145.4, the user: "In the same idea of a 3d print where the outer border
// radius should not match the inner"): a tile in a card is the card's radius
// less the gap between them, which here is always `sm`. The thermostat and
// fan tiles had the cards' own radius, and so did the remote's Views tiles.
const PAGES = [
  "/home",
  "/lights",
  "/climate",
  "/energy",
  "/energy/circuits",
  "/weather",
  "/weather/daily",
  "/printer",
  "/vacuum",
  "/cameras",
  "/calendar",
  "/control/views",
  "/control/display",
  "/control/device",
];

test.describe("nested corners", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test("every page's are concentric with their containers'", async ({ page }) => {
    for (const path of PAGES) {
      await page.goto(path);
      await page.locator("#splash").waitFor({ state: "detached" });
      // The cards' data in, and their entrance played.
      await page.waitForTimeout(800);
      expect(await cornersRounderThanConcentric(page), path).toEqual([]);
    }
  });

  test("and the thermostat's drawer or dialog", async ({ page }) => {
    await page.goto("/climate");
    await page.getByRole("button", { name: /^1st Floor AC:/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    expect(await cornersRounderThanConcentric(page)).toEqual([]);
  });
});
