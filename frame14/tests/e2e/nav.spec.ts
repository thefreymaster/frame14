import { expect, test, type Browser, type BrowserContextOptions, type Page } from "@playwright/test";
import { quietHouse, resetStub, splashGone } from "./helpers";
import { APP_URL } from "./ports";

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

// Where the nav is (0.178.1, lib/navPlace). It went by the window's shape
// alone — a rail in a landscape window — so the frame, an upright tablet,
// lost its bar whenever its screen was shared: with a game pinned over the
// app the window is the screen's width and a little over half its height,
// landscape by a hair (the user: "The nav thinks it's on a smaller device
// and is moving to the side. I want it at the bottom still"). The rail is
// for a window wider than tall on a screen that is on its side.
const TABLET =
  "Mozilla/5.0 (Linux; Android 14; SM-X910 Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Safari/537.36";
/** The frame's tablet with a window of that size on a screen of that one. */
const tablet = (window: [number, number], screen: [number, number]): BrowserContextOptions => ({
  viewport: { width: window[0], height: window[1] },
  screen: { width: screen[0], height: screen[1] },
  userAgent: TABLET,
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
});

/** A frame of that shape, on that page. */
async function frame(browser: Browser, options: BrowserContextOptions, path: string): Promise<Page> {
  const context = await browser.newContext({ baseURL: APP_URL, ...options });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("device-mode", "frame"));
  await page.goto(path);
  await splashGone(page);
  return page;
}

/** Where the nav is, and the room the page leaves for it (Layout's box). */
const navPlace = (page: Page) =>
  page.evaluate(() => {
    const shown = (el: Element | null) => !!el && getComputedStyle(el).display !== "none";
    const bar = document.querySelector('[data-nav="bar"]');
    const rail = document.querySelector('[data-nav="rail"]');
    const room = getComputedStyle(document.querySelector("[data-page-room]")!);
    const nav = (shown(rail) ? rail : bar)!.getBoundingClientRect();
    return {
      place: document.documentElement.dataset.navPlace,
      bar: shown(bar),
      rail: shown(rail),
      // Room on the left for the rail, or under the page for the bar.
      roomLeft: Math.round(parseFloat(room.paddingLeft)),
      roomFoot: Math.round(parseFloat(room.paddingBottom)),
      // How far the bar's top is from the window's foot, and the rail's right edge from its left.
      barClearance: Math.round(innerHeight - nav.top),
      railClearance: Math.round(nav.right),
      navWidth: Math.round(nav.width),
      window: [innerWidth, innerHeight],
    };
  });

/** The bar across the window's foot, the page's room ending at its top. */
async function expectBar(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-nav-place", "bar");
  // (The room moves over 0.3s when the place changes.)
  await expect
    .poll(async () => {
      const nav = await navPlace(page);
      return nav.roomFoot - nav.barClearance;
    })
    .toBe(0);
  const nav = await navPlace(page);
  expect(nav).toMatchObject({ bar: true, rail: false, roomLeft: 0 });
  expect(nav.roomFoot).toBeGreaterThan(0);
  return nav;
}

/** The rail down the window's left, the page's room beginning at its right edge. */
async function expectRail(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-nav-place", "rail");
  await expect
    .poll(async () => {
      const nav = await navPlace(page);
      return nav.roomLeft - nav.railClearance;
    })
    .toBe(0);
  const nav = await navPlace(page);
  expect(nav).toMatchObject({ bar: false, rail: true, roomFoot: 0 });
  expect(nav.roomLeft).toBeGreaterThan(0);
  return nav;
}

test.describe("where the nav is", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test.describe("on the frame", () => {
    test.beforeEach(({ isMobile }) => {
      test.skip(isMobile, "the frame's own windows, opened once");
    });

    test("stays along the bottom while a game is pinned over the app", async ({ browser }) => {
      // A 1600x1490 window on the upright 1600x2400 screen.
      const page = await frame(browser, tablet([1600, 1490], [1600, 2400]), "/lights");
      try {
        const nav = await expectBar(page);
        // A landscape window all the same…
        expect(nav.window[0]).toBeGreaterThan(nav.window[1]);
        // …with the bar across its foot, a gap in from each side.
        expect(nav.navWidth).toBeGreaterThan(1500);
        expect(nav.barClearance).toBeLessThan(200);
        // And it is the frame's bar: its entries go where they say.
        await page.locator('[data-nav="bar"]').getByRole("tab", { name: "Climate" }).click();
        await expect(page).toHaveURL(/\/climate$/);
      } finally {
        await page.context().close();
      }
    });

    test("keeps Home's board between the header and the bar there", async ({ browser, request }) => {
      await quietHouse(request);
      const page = await frame(browser, tablet([1600, 1490], [1600, 2400]), "/home");
      try {
        const nav = await expectBar(page);
        // The board is as tall as the page's room (`--page-height`), which
        // ends at the bar and not at the window's foot.
        const board = page.locator(".home-board");
        await expect(board).toBeVisible();
        await expect
          .poll(async () => {
            const box = await board.boundingBox();
            return Math.round(box!.y + box!.height) - (nav.window[1] - nav.barClearance);
          })
          .toBeLessThanOrEqual(0);
        // And nothing scrolls: the board fits.
        expect(await page.locator("[data-page-room]").evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
      } finally {
        await page.context().close();
      }
    });

    test("is the bar on the whole screen, and the rail once the tablet is turned on its side", async ({ browser }) => {
      const upright = await frame(browser, tablet([1600, 2400], [1600, 2400]), "/lights");
      try {
        await expectBar(upright);
      } finally {
        await upright.context().close();
      }
      const turned = await frame(browser, tablet([2400, 1600], [2400, 1600]), "/lights");
      try {
        await expectRail(turned);
      } finally {
        await turned.context().close();
      }
    });
  });

  test("a desktop has the rail, and the bar in a window narrower than tall", async ({ page, isMobile }) => {
    test.skip(isMobile, "a desktop's");
    await page.goto("/lights");
    await splashGone(page);
    await expectRail(page);

    await page.setViewportSize({ width: 900, height: 1200 });
    await expectBar(page);
  });

  test("a phone has the bar, and the rail on its side", async ({ page, isMobile }) => {
    test.skip(!isMobile, "a phone's");
    await page.goto("/lights");
    await splashGone(page);
    await expectBar(page);

    // Turned over: the screen turns with the window.
    const { width, height } = page.viewportSize()!;
    await page.setViewportSize({ width: height, height: width });
    await expectRail(page);
  });
});
