import { expect, test } from "@playwright/test";
import { resetStub } from "./helpers";

test.describe("the Climate page", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test("shows every thermostat with what it's doing", async ({ page }) => {
    await page.goto("/climate");
    await expect(page.getByRole("button", { name: /^1st Floor AC: 64°, Heating to 70°/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^2nd Floor AC: 68°, Off/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^3rd Floor AC: 75°, Cooling to 72°/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Master Room AC: 68°, Off/ })).toBeVisible();
  });

  test("a tile opens the dialog, and a new mode reaches Home Assistant", async ({ page }) => {
    await page.goto("/climate");
    await page.getByRole("button", { name: /^2nd Floor AC:/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("System off")).toBeVisible();

    await dialog.getByText("Heat", { exact: true }).click();
    await expect(dialog.getByText("Heat standby")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: /^2nd Floor AC: 68°, Heat, set to 68°/ })).toBeVisible();
  });

  test("the dialog fills a phone's screen, and its close button closes it", async ({ page, isMobile }) => {
    await page.goto("/climate");
    await page.getByRole("button", { name: /^2nd Floor AC:/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("System off")).toBeVisible();
    // Full screen on a phone (0.133): the whole viewport. A wider screen
    // keeps the md dialog, floating in the middle.
    const viewport = page.viewportSize()!;
    if (isMobile) {
      await expect
        .poll(async () => {
          const box = await dialog.boundingBox();
          return box && [box.x, box.y, Math.round(box.width), Math.round(box.height)];
        })
        .toEqual([0, 0, viewport.width, viewport.height]);
    } else {
      await expect.poll(async () => (await dialog.boundingBox())?.width).toBeLessThan(viewport.width / 2);
    }
    // The header mic's square-cornered button, beside the title. The mic is
    // aria-hidden under the modal, so it's found by its label, not its role.
    const close = dialog.getByRole("button", { name: "Close" });
    const [closeRadius, micRadius] = await Promise.all([
      close.evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
      page.locator('button[aria-label="Ask the house"]').evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
    ]);
    expect(closeRadius).toBe(micRadius);
    await close.click();
    await expect(dialog).toBeHidden();
  });

  test("the dial's − and + step the target, sent once the taps stop", async ({ page }) => {
    await page.goto("/climate");
    await page.getByRole("button", { name: /^1st Floor AC:/ }).click();
    const dialog = page.getByRole("dialog");
    const raise = dialog.getByRole("button", { name: "Raise the target temperature" });
    await raise.click();
    await raise.click();
    await expect(dialog.getByText("72°", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Lower the target temperature" }).click();
    await expect(dialog.getByText("71°", { exact: true })).toBeVisible();
    // Closed before the taps' send: it still reaches Home Assistant.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: /^1st Floor AC: 64°, Heating to 71°/ })).toBeVisible();
  });

  test("a desktop's tiles show the temperature a size larger", async ({ page, isMobile }) => {
    test.skip(isMobile, "a phone's tiles are the squares at the md size");
    await page.goto("/climate");
    const tile = page.getByRole("button", { name: /^1st Floor AC:/ });
    await expect(tile).toBeVisible();
    // 7xl, 4.5rem (0.127; the frame's lg tile is 6xl, 3.75rem). The root's
    // size grows with the screen, so compare with it rather than a pixel count.
    const sizes = await tile.getByText("64°").evaluate((el) => ({
      reading: parseFloat(getComputedStyle(el).fontSize),
      root: parseFloat(getComputedStyle(document.documentElement).fontSize),
    }));
    expect(sizes.reading / sizes.root).toBeCloseTo(4.5, 1);
  });

  test("a live change from Home Assistant updates the tile", async ({ page, request }) => {
    await page.goto("/climate");
    await expect(page.getByRole("button", { name: /^1st Floor AC: 64°, Heating to 70°/ })).toBeVisible();
    await request.post("http://127.0.0.1:8310/_stub/state", {
      data: { entity_id: "climate.samsung_airconditioner_1", state: "heat", attributes: { current_temperature: 70, hvac_action: "idle" } },
    });
    await expect(page.getByRole("button", { name: /^1st Floor AC: 70°, Heat, set to 70°/ })).toBeVisible();
  });
});
