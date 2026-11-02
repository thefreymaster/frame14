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

  test("the dialog is a sheet on a phone, and its close button closes it", async ({ page, isMobile }) => {
    await page.goto("/climate");
    await page.getByRole("button", { name: /^2nd Floor AC:/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("System off")).toBeVisible();
    // A drawer from the bottom on a phone (0.134), as tall as the controls —
    // the whole screen in 0.133, which the user took back in 0.135. A desktop
    // keeps the md dialog, floating in the middle.
    await expect(dialog).toHaveClass(isMobile ? /chakra-drawer__content/ : /chakra-dialog__content/);
    const viewport = page.viewportSize()!;
    if (isMobile) {
      await expect
        .poll(async () => {
          const box = await dialog.boundingBox();
          return box && [box.x, Math.round(box.width), Math.round(box.y + box.height)];
        })
        .toEqual([0, viewport.width, viewport.height]);
      expect((await dialog.boundingBox())!.y).toBeGreaterThan(0);
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

  test("the fan speed slider's marks sit under the thumb's stops, inside the track (0.144.1)", async ({ page }) => {
    await page.goto("/climate");
    await page.getByRole("button", { name: /^1st Floor AC:/ }).click();
    const dialog = page.getByRole("dialog");
    const thumb = dialog.getByRole("slider", { name: "Fan speed" });
    await expect(thumb).toBeVisible();
    const marks = dialog.locator('[data-part="marker"]');
    // The stub's five fan modes, auto to turbo.
    await expect(marks).toHaveCount(5);
    // Measured once the dialog's enter animation has played: the desktop's
    // scale-in draws everything a few px towards its centre meanwhile. The
    // dialog's own animations alone — the dial's pulse inside never ends.
    await dialog.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    const track = (await dialog.locator('[data-part="track"]').boundingBox())!;
    const centreOf = async (box: Promise<{ x: number; width: number } | null>) => {
      const b = await box;
      return b ? b.x + b.width / 2 : NaN;
    };
    // Home, then a step at a time to the end: the thumb's centre on each mark
    // (the ends included, where Chakra's own inset put them 4px apart) and
    // the thumb never past the track's ends.
    await thumb.press("Home");
    for (let i = 0; i < 5; i++) {
      if (i > 0) await thumb.press("ArrowRight");
      await expect(thumb).toHaveAttribute("aria-valuenow", String(i));
      await expect
        .poll(async () => Math.abs((await centreOf(thumb.boundingBox())) - (await centreOf(marks.nth(i).boundingBox()))))
        .toBeLessThan(0.5);
      const box = (await thumb.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(track.x - 0.5);
      expect(box.x + box.width).toBeLessThanOrEqual(track.x + track.width + 0.5);
    }
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
