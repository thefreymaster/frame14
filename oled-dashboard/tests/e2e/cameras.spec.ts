import { expect, test } from "@playwright/test";
import { resetStub } from "./helpers";

test.describe("the Cameras page", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test("the 3D printer's card carries the printer's icon and a Live badge once its stream is up", async ({ page }) => {
    await page.goto("/cameras");
    // The stub streams a short MJPEG for the A1's camera (tests/stub/stub-ha.mjs).
    const card = page
      .locator(".chakra-card__root")
      .filter({ has: page.getByRole("heading", { name: "3D printer" }) });
    await expect(card).toBeVisible();
    await expect(card.getByText("Live")).toBeVisible();
    const icon = await card
      .getByRole("heading", { name: "3D printer" })
      .evaluate((h) => h.parentElement?.querySelector("svg") != null);
    expect(icon).toBe(true);
    // The other cameras keep theirs.
    await expect(page.getByRole("heading", { name: "Front Porch High" })).toBeVisible();
  });
});
