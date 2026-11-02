import { expect, test, type Page } from "@playwright/test";
import { lightButtons, resetStub } from "./helpers";

/** A camera's card, by its heading. */
const cameraCard = (page: Page, name: string) =>
  page.locator(".chakra-card__root").filter({ has: page.getByRole("heading", { name }) });

test.describe("the Cameras page", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test("the 3D printer's card carries the printer's icon and a Live badge once its stream is up", async ({ page }) => {
    await page.goto("/cameras");
    // The stub streams a short MJPEG for the A1's camera (tests/stub/stub-ha.mjs).
    const card = cameraCard(page, "3D printer");
    await expect(card).toBeVisible();
    await expect(card.getByText("Live")).toBeVisible();
    const icon = await card
      .getByRole("heading", { name: "3D printer" })
      .evaluate((h) => h.parentElement?.querySelector("svg") != null);
    expect(icon).toBe(true);
    // The other cameras keep theirs.
    await expect(page.getByRole("heading", { name: "Front Porch High" })).toBeVisible();
  });

  test("a camera goes full screen, with its room's lights as the header's buttons (0.144)", async ({ page }) => {
    await page.goto("/cameras");
    const card = cameraCard(page, "Front Porch High");
    await card.getByRole("button", { name: "Full screen" }).click();
    const dialog = page.getByRole("dialog", { name: "Front Porch High" });
    await expect(dialog).toBeVisible();
    // The whole screen, on every device (once its scale-in has played).
    const viewport = page.viewportSize()!;
    await expect
      .poll(async () => {
        const box = await dialog.boundingBox();
        return box && [Math.round(box.width), Math.round(box.height)];
      })
      .toEqual([viewport.width, viewport.height]);
    // The picture, letterboxed on the black body; the card's well is empty meanwhile.
    await expect(dialog.locator("video, img").first()).toBeAttached();
    await expect(card.locator("video, img")).toHaveCount(0);

    // The stub puts the porch camera outside, with the yard and porch lights
    // (frame14.test.json's Outside room), alphabetical; the backyard's grill
    // icon as its tile has it.
    await expect.poll(() => lightButtons(dialog)).toEqual(["Backyard", "Front Porch", "Front Yard"]);
    const backyard = dialog.getByRole("button", { name: "Backyard" });
    await expect(backyard.locator('[data-mdi-icon="grill"]')).toHaveCount(1);
    await expect(backyard).toHaveAttribute("aria-pressed", "false");
    await backyard.click();
    await expect(backyard).toHaveAttribute("aria-pressed", "true");
    await expect(backyard).toHaveAttribute("aria-busy", "false");
    await backyard.click();
    await expect(backyard).toHaveAttribute("aria-pressed", "false");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    // The card's picture comes back.
    await expect(card.locator("video, img").first()).toBeAttached();
  });

  test("a camera in no room has no lights to control from its full screen", async ({ page }) => {
    await page.goto("/cameras");
    await cameraCard(page, "Front Porch RTSP").getByRole("button", { name: "Full screen" }).click();
    const dialog = page.getByRole("dialog", { name: "Front Porch RTSP" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("group", { name: "Lights" })).toHaveCount(0);
    await expect(dialog.getByRole("button")).toHaveCount(1);
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
  });

  test("the printer's camera goes full screen with its chamber light in the header", async ({ page }) => {
    await page.goto("/cameras");
    const card = cameraCard(page, "3D printer");
    await expect(card.getByText("Live")).toBeVisible();
    await card.getByRole("button", { name: "Full screen" }).click();
    const dialog = page.getByRole("dialog", { name: "3D printer" });
    await expect(dialog).toBeVisible();
    // The stream moves to the full screen: its frame, then the Live badge there.
    await expect(dialog.getByRole("img", { name: "The printer's camera" })).toBeVisible();
    await expect(dialog.getByText("Live")).toBeVisible();
    await expect.poll(() => lightButtons(dialog)).toEqual(["A1 Chamber Light"]);
    const light = dialog.getByRole("button", { name: "A1 Chamber Light" });
    await expect(light).toHaveAttribute("aria-pressed", "false");
    await light.click();
    await expect(light).toHaveAttribute("aria-pressed", "true");
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
    await expect(card.getByText("Live")).toBeVisible();
  });
});
