import { expect, test, type Page } from "@playwright/test";
import { resetStub, splashGone } from "./helpers";

// The portrait nav bar's shape: in from the screen's edges with the cards'
// corners where it floats, and flush with the screen, square, on an iPhone —
// a home-indicator inset, emulated here through DevTools — where the
// screen's own corners round it. Until 0.145.1 it had a 62pt curve of its
// own there, the iPhone 16 Pro's, and on a tighter screen (a 13 Pro's is
// about 47pt) the page showed between the two curves.
async function barShape(page: Page) {
  return page.locator('[data-nav="bar"]').evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      left: Math.round(r.left),
      right: Math.round(innerWidth - r.right),
      bottom: Math.round(innerHeight - r.bottom),
      radii: [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius],
      sideBorders: [cs.borderLeftWidth, cs.borderRightWidth, cs.borderBottomWidth],
    };
  });
}

test.describe("the portrait nav bar", () => {
  test.beforeEach(async ({ request, isMobile }) => {
    test.skip(!isMobile, "the bar is portrait's; a desktop has the rail");
    await resetStub(request);
  });

  test("floats a gap in from the edges, with the cards' corners, where there's no home indicator", async ({ page }) => {
    await page.goto("/home");
    await splashGone(page);
    // 1rem in from the sides and the bottom; the cards' `surface` corners.
    await expect.poll(() => barShape(page)).toEqual({
      left: 16,
      right: 16,
      bottom: 16,
      radii: ["12px", "12px", "12px", "12px"],
      sideBorders: ["1px", "1px", "1px"],
    });
  });

  test("on an iPhone, sits flush with the screen and square, for the screen's own corners to round", async ({ page, context }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: 47, bottom: 34, left: 0, right: 0 } });
    await page.goto("/home");
    await splashGone(page);
    await expect.poll(() => barShape(page)).toEqual({
      left: 0,
      right: 0,
      bottom: 0,
      radii: ["0px", "0px", "0px", "0px"],
      // Only its top edge.
      sideBorders: ["0px", "0px", "0px"],
    });
  });
});
