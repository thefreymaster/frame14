import { expect, test, type Locator, type Page } from "@playwright/test";
import { resetStub } from "./helpers";

// 0.134 / 0.135: on a phone and the frame every modal is a drawer that comes in
// from the bottom (components/Modal), a sheet as tall as its content; a desktop
// keeps centred dialogs, but for the detail panels (PanelDialog: the energy and
// the weather), which are a drawer from the right edge there (0.150.0, Modal's
// `side`).

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
  // On Android — the phone project, the frame — the page behind is dimmed,
  // not blurred (0.135.1: a full-screen backdrop-filter made the frame's slide
  // stutter). A drawer's parts carry the dialog scope: it is Chakra's dialog
  // machine. An iPhone's sheet blurs (below).
  await expect(page.locator('[data-scope="dialog"][data-part="backdrop"]')).toHaveCSS("backdrop-filter", "none");
}

/**
 * A gutter in from the screen's top, right and bottom, rounded at every corner,
 * the page behind dimmed and blurred (0.150.0: every browser but Android's).
 */
async function expectSidePanel(page: Page, modal: Locator) {
  const viewport = page.viewportSize()!;
  await expect(modal).toHaveClass(/chakra-drawer__content/);
  await modal.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const box = (await modal.boundingBox())!;
  const top = box.y;
  expect(top).toBeGreaterThan(0);
  expect(viewport.width - (box.x + box.width)).toBeCloseTo(top, 0);
  expect(viewport.height - (box.y + box.height)).toBeCloseTo(top, 0);
  expect(box.width).toBeLessThan(viewport.width / 2);
  const corners = await modal.evaluate((el) => {
    const s = getComputedStyle(el);
    return [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius];
  });
  for (const corner of corners) expect(corner).not.toBe("0px");
  await expect(page.locator("html")).toHaveAttribute("data-backdrop-blur", "");
  await expect(page.locator('[data-scope="dialog"][data-part="backdrop"]')).toHaveCSS("backdrop-filter", "blur(2px)");
}

/** Where the panel's left edge is at the very start (0) or end of its slide. */
async function slideEdge(modal: Locator, at: "start" | "end") {
  return modal.evaluate((el, at) => {
    const animations = el.getAnimations();
    for (const a of animations) {
      a.pause();
      const end = Number(a.effect!.getComputedTiming().endTime);
      a.currentTime = at === "start" ? 0 : end - 1;
    }
    const left = el.getBoundingClientRect().left;
    for (const a of animations) a.finish();
    return left;
  }, at);
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

  test("a phone's detail panel is a drawer from the bottom, a desktop's a drawer from the right edge", async ({ page, isMobile }) => {
    await page.goto("/home");
    await page.getByRole("button", { name: "Show energy detail" }).click();
    const modal = page.getByRole("dialog");
    const viewport = page.viewportSize()!;

    if (isMobile) {
      await expect(modal.getByText("Solar produced")).toBeVisible();
      await expectSheet(page, modal);
      await page.keyboard.press("Escape");
      await expect(modal).toBeHidden();
      return;
    }

    // It comes in from past the screen's edge — the gutter it floats in
    // included, so no sliver of it shows as the slide starts…
    await expect(modal).toBeAttached();
    expect(await slideEdge(modal, "start")).toBeGreaterThanOrEqual(viewport.width - 1);
    await expect(modal.getByText("Solar produced")).toBeVisible();
    await expectSidePanel(page, modal);
    // …and leaves the same way.
    await page.keyboard.press("Escape");
    await expect(modal).toHaveAttribute("data-state", "closed");
    expect(await slideEdge(modal, "end")).toBeGreaterThanOrEqual(viewport.width - 2);
    await expect(modal).toBeHidden();
  });

  test("the Home weather card opens the weather as a modal, and stays on Home", async ({ page, isMobile }) => {
    // 0.136: the tap went to /weather from 0.97 (the user: the page "feels
    // out of place now with the drawers"). The phone's weather row and the
    // desktop's Weather card both carry the label.
    await page.goto("/home");
    await page.getByRole("button", { name: "Show the weather" }).click();
    const modal = page.getByRole("dialog", { name: "Weather" });
    await expect(modal.getByText("Next hours")).toBeVisible();
    await expect(modal.getByText(/-day forecast/)).toBeVisible();
    await expect(page).toHaveURL(/\/home$/);
    if (isMobile) await expectSheet(page, modal);
    else await expectSidePanel(page, modal);
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
  });

  test("a desktop's controls stay a centred dialog, the page behind blurred", async ({ page, isMobile }) => {
    // 0.150.0: the light, fan and thermostat controls aren't side panels —
    // small, and opened where the pointer is — and desktop Chrome blurs
    // behind them as Safari did (0.149.0).
    test.skip(isMobile, "a phone's is a sheet (the Android one, unblurred: expectSheet)");
    await page.goto("/climate");
    await page.getByRole("button", { name: /^1st Floor AC:/ }).click();
    const modal = page.getByRole("dialog");
    await expect(modal.getByText("Heating now")).toBeVisible();
    await expect(modal).toHaveClass(/chakra-dialog__content/);
    await expect(page.locator('[data-scope="dialog"][data-part="backdrop"]')).toHaveCSS("backdrop-filter", "blur(2px)");
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
  });

  test("a swipe down closes a phone's sheet; a short one lets it be", async ({ page, isMobile }) => {
    test.skip(!isMobile, "a desktop's side panel has no swipe");
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

  test.describe("on an iPhone", () => {
    // The backdrop's blur is here (0.149.0) and on a desktop (0.150.0), never
    // on Android — the frame's agent below and the phone project's keep the
    // backdrop a plain dim (expectSheet).
    test.use({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });

    test("the page behind a sheet is blurred as well as dimmed", async ({ page }) => {
      test.skip(test.info().project.name !== "desktop", "one run is enough");
      await page.goto("/climate");
      await page.getByRole("button", { name: /^1st Floor AC:/ }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-backdrop-blur", "");
      await expect(page.locator('[data-scope="dialog"][data-part="backdrop"]')).toHaveCSS("backdrop-filter", "blur(2px)");
    });
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
      // Android: the lag 0.135.1 removed the blur for stays gone (0.149.0,
      // and 0.150.0's desktop blur leaves Android out).
      await expect(page.locator("html")).not.toHaveAttribute("data-backdrop-blur");
      await modal.getByRole("button", { name: "Close" }).click();
      await expect(modal).toBeHidden();
    });
  });
});
