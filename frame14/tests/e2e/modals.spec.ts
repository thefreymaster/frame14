import { expect, test, type Locator, type Page } from "@playwright/test";
import { resetStub } from "./helpers";

// 0.134 / 0.135: on a phone and the frame every modal is a drawer that comes in
// from the bottom (components/Modal), a sheet as tall as its content; a desktop
// keeps centred dialogs.

/** The screen's width, on its bottom edge, short of its top; rounded at the top only. */
async function expectSheet(page: Page, modal: Locator) {
  const viewport = page.viewportSize()!;
  await expect(modal).toHaveClass(/chakra-drawer__content/);
  await expect
    .poll(async () => {
      const box = await modal.boundingBox();
      return box && [box.x, Math.round(box.width), Math.round(box.y + box.height)];
    })
    .toEqual([0, viewport.width, viewport.height]);
  expect((await modal.boundingBox())!.y).toBeGreaterThan(0);
  const corners = await modal.evaluate((el) => {
    const s = getComputedStyle(el);
    return [s.borderTopLeftRadius, s.borderBottomLeftRadius];
  });
  expect(corners[0]).not.toBe("0px");
  expect(corners[1]).toBe("0px");
  // Its own compositor layer, so a slide or a drag doesn't repaint it (0.135.1).
  await expect(modal).toHaveCSS("will-change", "transform");
  // The page behind is dimmed, not blurred (0.135.1: a full-screen
  // backdrop-filter made the frame's slide stutter). A drawer's parts carry
  // the dialog scope: it is Chakra's dialog machine.
  await expect(page.locator('[data-scope="dialog"][data-part="backdrop"]')).toHaveCSS("backdrop-filter", "none");
}

/** A finger dragged down `distance` from the point, in steps. */
async function swipeDown(page: Page, x: number, y: number, distance: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + (distance * i) / 8 }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

test.describe("modals", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test("a phone's modal is a drawer from the bottom, a desktop's a centred dialog", async ({ page, isMobile }) => {
    await page.goto("/home");
    await page.getByRole("button", { name: "Show energy detail" }).click();
    const modal = page.getByRole("dialog");
    await expect(modal.getByText("Solar produced")).toBeVisible();
    const viewport = page.viewportSize()!;

    if (isMobile) {
      await expectSheet(page, modal);
    } else {
      await expect(modal).toHaveClass(/chakra-dialog__content/);
      await expect
        .poll(async () => {
          const box = await modal.boundingBox();
          return box && Math.round(box.x + box.width / 2);
        })
        .toBe(Math.round(viewport.width / 2));
      expect((await modal.boundingBox())!.width).toBeLessThan(viewport.width / 2);
      await expect(page.locator('[data-scope="dialog"][data-part="backdrop"]')).toHaveCSS("backdrop-filter", "none");
    }

    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
  });

  test("the Home weather card opens the weather as a modal, and stays on Home", async ({ page }) => {
    // 0.136: the tap went to /weather from 0.97 (the user: the page "feels
    // out of place now with the drawers"). The phone's weather row and the
    // desktop's Weather card both carry the label.
    await page.goto("/home");
    await page.getByRole("button", { name: "Show the weather" }).click();
    const modal = page.getByRole("dialog", { name: "Weather" });
    await expect(modal.getByText("Next hours")).toBeVisible();
    await expect(modal.getByText(/-day forecast/)).toBeVisible();
    await expect(page).toHaveURL(/\/home$/);
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
  });

  test("a swipe down closes a phone's sheet; a short one lets it be", async ({ page, isMobile }) => {
    test.skip(!isMobile, "a desktop's dialog has no swipe");
    await page.goto("/home");
    await page.getByRole("button", { name: "Show energy detail" }).click();
    const modal = page.getByRole("dialog");
    await expect(modal.getByText("Solar produced")).toBeVisible();
    // Let it finish sliding in before taking its place.
    await modal.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    const title = (await modal.getByRole("heading", { name: "Energy" }).boundingBox())!;
    const from = { x: title.x + title.width / 2, y: title.y + title.height / 2 };
    const top = Math.round((await modal.boundingBox())!.y);
    // Short of SWIPE_CLOSE_PX: it springs back to where it was.
    await swipeDown(page, from.x, from.y, 60);
    await expect(modal.getByText("Solar produced")).toBeVisible();
    await expect.poll(async () => Math.round((await modal.boundingBox())!.y)).toBe(top);
    // Past it: it leaves.
    await swipeDown(page, from.x, from.y, 200);
    await expect(modal).toBeHidden();
  });

  test.describe("on the frame", () => {
    // The kitchen tablet: an Android user agent (so never a desktop, whatever
    // its size), portrait at 1600x2400.
    test.use({
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; NXTPAPER 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      viewport: { width: 1600, height: 2400 },
    });

    test("the thermostat is a sheet from the bottom, as tall as its controls", async ({ page }) => {
      test.skip(test.info().project.name !== "desktop", "one run is enough; the phone project is the phone");
      await page.goto("/climate");
      await page.getByRole("button", { name: /^1st Floor AC:/ }).click();
      const modal = page.getByRole("dialog");
      await expect(modal.getByText("Heating now")).toBeVisible();
      await expectSheet(page, modal);
      await modal.getByRole("button", { name: "Close" }).click();
      await expect(modal).toBeHidden();
    });
  });
});
