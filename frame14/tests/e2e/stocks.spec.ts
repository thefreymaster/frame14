import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { pageErrors, resetStub, splashGone, stub } from "./helpers";
import { APP_URL } from "./ports";

// The Stocks page (0.179.0): the stub's stand-in Finnhub — its quotes, its
// market status and its trades socket — behind the server's stocks.js, with
// the server's timings shortened in playwright.config (FRAME14_STOCKS_TIMINGS).
// The stub stamps each trade in the regular session whatever the hour, so a
// trade moves a card at any time of day.

const card = (page: Page, symbol: string) => page.locator(`[data-stock="${symbol}"]`);
const price = (page: Page, symbol: string) => card(page, symbol).locator("[data-stock-price]");
const change = (page: Page, symbol: string) => card(page, symbol).locator("[data-stock-change]");
const flashes = async (page: Page, symbol: string) => Number(await price(page, symbol).getAttribute("data-flash-count"));

/**
 * The page with Finnhub's socket open: the stub's reset drops it, and it is
 * back within the backoff — given a busy machine's time.
 */
async function live(page: Page) {
  await page.goto("/stocks");
  await expect(page.locator('[data-stocks-status="live"]')).toBeVisible({ timeout: 20_000 });
}

/**
 * A trade on the stub's socket until the card shows it: the quotes asked for
 * again as the socket opens can land after a first one and put the quote's
 * price back.
 */
async function trade(page: Page, request: APIRequestContext, symbol: string, p: number, shown: string) {
  await expect(async () => {
    const { delivered } = (await stub(request, "/_stub/finnhub/trade", { symbol, price: p })) as { delivered: number };
    expect(delivered).toBeGreaterThanOrEqual(1);
    await expect(price(page, symbol)).toHaveText(shown, { timeout: 1500 });
  }).toPass({ timeout: 10_000 });
}

test.beforeEach(async ({ request }) => {
  await resetStub(request);
});

test("a card a ticker, in the configured order, with Finnhub's price, change and session", async ({ page }) => {
  const errors = pageErrors(page);
  await live(page);
  await expect(page.getByRole("heading", { name: "Stocks" })).toBeVisible();
  await expect(page.locator("[data-stock]")).toHaveCount(3);
  expect(await page.locator("[data-stock]").evaluateAll((els) => els.map((el) => el.getAttribute("data-stock")))).toEqual([
    "SPY",
    "QQQ",
    "DIA",
  ]);
  await expect(price(page, "SPY")).toHaveText("717.42");
  await expect(change(page, "SPY")).toHaveText("+4.18 (+0.59%)");
  await expect(card(page, "SPY")).toHaveAttribute("data-direction", "up");
  await expect(change(page, "QQQ")).toHaveText("−2.35 (−0.36%)");
  await expect(card(page, "QQQ")).toHaveAttribute("data-direction", "down");
  await expect(change(page, "DIA")).toHaveText("0.00 (0.00%)");
  await expect(card(page, "SPY").locator("[data-stock-low]")).toHaveText("713.05");
  await expect(card(page, "SPY").locator("[data-stock-high]")).toHaveText("718.90");
  await expect(page.locator('[data-market-session="regular"]')).toHaveText("Market open");
  await expect(page.locator("[data-stocks-delayed]")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a trade moves a card's price and change as it happens, flashing — and the same price again, or an odd lot, doesn't", async ({
  page,
  request,
}) => {
  await live(page);
  await trade(page, request, "SPY", 720, "720.00");
  // 720 against the previous close, 713.24.
  await expect(change(page, "SPY")).toHaveText("+6.76 (+0.95%)");
  await expect(card(page, "SPY").locator("[data-stock-high]")).toHaveText("720.00");
  await expect(card(page, "SPY").locator('[data-price-flash="up"]')).toHaveCount(1);
  const before = await flashes(page, "SPY");
  expect(before).toBeGreaterThanOrEqual(1);

  // The same price, a moment later: pushed (a second at most), not flashed.
  // And an odd lot (Finnhub's condition 12) at another: no sale, no price.
  const { delivered } = (await stub(request, "/_stub/finnhub/trade", { symbol: "SPY", price: 720 })) as { delivered: number };
  expect(delivered).toBe(1);
  await stub(request, "/_stub/finnhub/trade", { symbol: "SPY", price: 730, conditions: ["1", "12"] });
  await page.waitForTimeout(1500);
  expect(await flashes(page, "SPY")).toBe(before);
  await expect(price(page, "SPY")).toHaveText("720.00");

  await trade(page, request, "SPY", 719.5, "719.50");
  await expect(card(page, "SPY").locator('[data-price-flash="down"]')).toHaveCount(1);
  expect(await flashes(page, "SPY")).toBe(before + 1);
  // The other cards are as they were.
  await expect(price(page, "QQQ")).toHaveText("655.10");
});

test("no flash under reduced motion", async ({ page, request }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await live(page);
  await trade(page, request, "SPY", 721, "721.00");
  await expect(card(page, "SPY").locator("[data-price-flash]")).toBeHidden();
});

test("outside the regular session a trade leaves the card at the quote, and the badge says which session", async ({
  page,
  request,
}) => {
  await live(page);
  await stub(request, "/_stub/finnhub/session", { session: "post-market", isOpen: false });
  await expect(page.locator('[data-market-session="post"]')).toHaveText("After hours");
  const { delivered } = (await stub(request, "/_stub/finnhub/trade", { symbol: "SPY", price: 730 })) as { delivered: number };
  expect(delivered).toBe(1);
  await page.waitForTimeout(1500);
  await expect(price(page, "SPY")).toHaveText("717.42");

  await stub(request, "/_stub/finnhub/session", { session: null, isOpen: false, holiday: "Thanksgiving Day" });
  await expect(page.locator('[data-market-session="closed"]')).toHaveText("Closed");
});

test("with Finnhub's socket refused the page says Delayed, and the prices still come by polling", async ({ page, request }) => {
  await live(page);
  try {
    await stub(request, "/_stub/finnhub/refuse", { socket: true });
    await expect(page.locator("[data-stocks-delayed]")).toHaveText("Delayed");
    await expect(page.locator('[data-stocks-status="delayed"]')).toBeVisible();
    await stub(request, "/_stub/finnhub/quote", { symbol: "SPY", c: 725.1, d: 11.86, dp: 1.6629 });
    await expect(price(page, "SPY")).toHaveText("725.10");
    await expect(change(page, "SPY")).toHaveText("+11.86 (+1.66%)");
  } finally {
    await resetStub(request);
  }
  // Taken again: live once more.
  await expect(page.locator('[data-stocks-status="live"]')).toBeVisible();
  await expect(page.locator("[data-stocks-delayed]")).toHaveCount(0);
});

test("a refused key is the page's error, in Finnhub's words — and the prices come back once it's taken", async ({ page, request }) => {
  try {
    await stub(request, "/_stub/finnhub/refuse", { rest: true, socket: true });
    await page.goto("/stocks");
    await expect(page.getByText("Finnhub refused the key")).toBeVisible();
    await expect(page.getByText(/Invalid API key\./)).toBeVisible();
    await expect(page.locator("[data-stock]")).toHaveCount(0);
  } finally {
    await resetStub(request);
  }
  await page.reload();
  await expect(price(page, "SPY")).toHaveText("717.42");
  await expect(page.locator('[data-stocks-status="live"]')).toBeVisible();
});

test("the cards lie three across a desktop, and a card a row down an upright frame, sharing its height", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "a phone's cards are one column whatever the shape");
  await live(page);
  await splashGone(page);
  /** The list and its cards in one look. */
  const look = () =>
    page.locator("[data-stocks]").evaluate((list) => {
      const box = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) };
      };
      return { list: box(list), cards: [...list.children].map(box) };
    });
  /** Two looks in a row alike: the page's room for the nav moves over a transition. */
  const settledLook = async () => {
    let before = JSON.stringify(await look());
    await expect
      .poll(async () => {
        const now = JSON.stringify(await look());
        const same = now === before;
        before = now;
        return same;
      })
      .toBe(true);
    return look();
  };
  // 1920x1080: one row of three.
  await expect.poll(async () => new Set((await look()).cards.map((b) => b.top)).size).toBe(1);

  // An upright frame's shape: a card a row, each the list's width, the three
  // the same height and reaching the page's foot.
  await page.setViewportSize({ width: 900, height: 1400 });
  await expect.poll(async () => new Set((await look()).cards.map((b) => b.left)).size).toBe(1);
  const { list, cards } = await settledLook();
  for (const card of cards) expect(Math.abs(card.width - list.width)).toBeLessThanOrEqual(1);
  const heights = cards.map((c) => c.height);
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(2);
  // Filling the page: the cards are far taller than their contents need.
  expect(heights[0]).toBeGreaterThan(250);
});

test("Stocks is in a frame's rail, and on a remote it's offered but off until turned on", async ({ page, isMobile }) => {
  if (isMobile) {
    await page.goto("/control/device");
    const row = page.getByRole("checkbox", { name: "Show Stocks in the nav" });
    await expect(row).toHaveCount(1);
    await expect(row).not.toBeChecked();
    return;
  }
  try {
    await page.goto("/home");
    await page.locator('[data-nav="rail"]').getByRole("tab", { name: "Stocks" }).click();
    await expect(page).toHaveURL(/\/stocks$/);
    await expect(price(page, "SPY")).toHaveText("717.42");
  } finally {
    // A frame's tap sends every frame there: the frames' view back as the suite has it.
    await page.request.get(`${APP_URL}/api/change/home`);
  }
});
