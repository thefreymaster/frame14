import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { pageErrors, resetStub, settled, splashGone, stub } from "./helpers";
import { APP_URL } from "./ports";

// The Stocks page (0.179.0): the stub's stand-in Finnhub — its quotes, its
// market status and its trades socket — behind the server's stocks.js, with
// the server's timings shortened in playwright.config (FRAME14_STOCKS_TIMINGS).
// The stub stamps each trade in the regular session whatever the hour, so a
// trade moves a card at any time of day.
//
// And a ticker's drawer (0.180.0): the stub's AAPL has every part of a
// detail, its SPY what an ETF has — no company, no analysts — and its QQQ
// and DIA nothing. The server keeps a detail once asked, and the stub's
// never change, so nothing here depends on which test asked first.

// The list's own cards: an open drawer draws its ticker's card again.
const card = (page: Page, symbol: string) => page.locator(`[data-stocks] [data-stock="${symbol}"]`);
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
  await expect(page.locator("[data-stock]")).toHaveCount(4);
  expect(await page.locator("[data-stock]").evaluateAll((els) => els.map((el) => el.getAttribute("data-stock")))).toEqual([
    "SPY",
    "QQQ",
    "DIA",
    "AAPL",
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

test("the cards lie side by side across a desktop, and a card a row down an upright frame, sharing its height", async ({
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
  // 1920x1080: one row of the four.
  await expect.poll(async () => new Set((await look()).cards.map((b) => b.top)).size).toBe(1);

  // An upright frame's shape: a card a row, each the list's width, the four
  // the same height and reaching the page's foot.
  await page.setViewportSize({ width: 900, height: 1400 });
  await expect.poll(async () => new Set((await look()).cards.map((b) => b.left)).size).toBe(1);
  const { list, cards } = await settledLook();
  for (const card of cards) expect(Math.abs(card.width - list.width)).toBeLessThanOrEqual(1);
  const heights = cards.map((c) => c.height);
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(2);
  // Filling the page: the cards are far taller than the 12rem they'd be at
  // least (192px here), a quarter of the page's room each.
  expect(heights[0]).toBeGreaterThan(230);
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

// ── A ticker's drawer (0.180.0) ──────────────────────────────────────────────

/** The drawer a card opens, once its parts have come. */
async function openDrawer(page: Page, symbol: string): Promise<Locator> {
  await splashGone(page);
  await card(page, symbol).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("heading", { name: symbol })).toBeVisible();
  // Asked of the stub's Finnhub, a call at a time: no part still on its way.
  await expect(drawer.locator('[data-part-state="pending"]')).toHaveCount(0);
  return drawer;
}

const parts = (drawer: Locator) =>
  drawer.locator("[data-stock-part]").evaluateAll((els) => els.map((el) => `${el.getAttribute("data-stock-part")}:${el.getAttribute("data-part-state")}`));

test("a tap on a card opens the ticker's drawer — from the right on a desktop, from the bottom on a phone — with what Finnhub knows of it", async ({
  page,
  isMobile,
}) => {
  const errors = pageErrors(page);
  await live(page);
  // The card is one button, named for what it opens.
  await expect(page.getByRole("button", { name: "Show AAPL detail" })).toHaveCount(1);
  const drawer = await openDrawer(page, "AAPL");
  await settled(page);

  // Where it is: a panel at the right edge, a gutter in, on a desktop; a
  // sheet the screen's width on its bottom edge on a phone.
  const viewport = page.viewportSize()!;
  const box = (await drawer.boundingBox())!;
  if (isMobile) {
    expect([box.x, Math.round(box.width), Math.round(box.y + box.height)]).toEqual([0, viewport.width, viewport.height]);
    expect(box.y).toBeGreaterThan(0);
  } else {
    expect(box.x).toBeGreaterThan(viewport.width / 2);
    expect(viewport.width - (box.x + box.width)).toBeCloseTo(box.y, 0);
    expect(box.height).toBeLessThanOrEqual(viewport.height);
  }

  // Today: the card's own figures.
  await expect(drawer.getByText("Today")).toBeVisible();
  await expect(drawer.locator("[data-stock-price]")).toHaveText("268.40");
  await expect(drawer.locator("[data-stock-change]")).toHaveText("+1.92 (+0.72%)");
  expect(await parts(drawer)).toEqual(["company:ready", "metrics:ready", "ratings:ready", "news:ready"]);

  // The company.
  await expect(drawer.locator("[data-stock-company-name]")).toHaveText("Apple Inc");
  await expect(drawer.locator("[data-stock-company-facts]")).toHaveText("Technology · Nasdaq");
  await expect(drawer.locator('[data-stock-stat="market-value"]')).toHaveText("$3.98T");
  await expect(drawer.locator("[data-stock-logo]")).toHaveAttribute("src", /^https:\/\/static2\.finnhub\.io\//);

  // The key numbers: the year's range with today's price on it, then the rest.
  const year = drawer.locator('[data-stock-range="year"]');
  await expect(year.locator("[data-stock-low]")).toHaveText("169.21");
  await expect(year.locator("[data-stock-high]")).toHaveText("277.32");
  expect(Number(await year.locator("[data-stock-range-share]").getAttribute("data-stock-range-share"))).toBeCloseTo(
    (268.4 - 169.21) / (277.32 - 169.21),
    3,
  );
  await expect(drawer.locator('[data-stock-stat="pe"]')).toHaveText("35.98");
  await expect(drawer.locator('[data-stock-stat="eps"]')).toHaveText("$7.46");
  await expect(drawer.locator('[data-stock-stat="dividend-yield"]')).toHaveText("0.39%");
  await expect(drawer.locator('[data-stock-stat="beta"]')).toHaveText("1.29");
  await expect(drawer.locator('[data-stock-stat="average-volume"]')).toHaveText("48.3M");

  // The analysts: one bar, a part a rating in order, each as wide as its
  // share of the fifty-five; the legend names them with their counts.
  const bar = drawer.locator("[data-rating-bar]");
  const widths = await bar.locator("[data-rating]").evaluateAll((els) =>
    els.map((el) => [el.getAttribute("data-rating"), el.getBoundingClientRect().width] as const),
  );
  expect(widths.map(([key]) => key)).toEqual(["strongBuy", "buy", "hold", "sell", "strongSell"]);
  const [strongBuy, buy, hold, sell] = widths.map(([, width]) => width);
  expect(buy / strongBuy).toBeCloseTo(23 / 15, 1);
  expect(hold / strongBuy).toBeCloseTo(14 / 15, 1);
  expect(sell).toBeLessThan(hold / 4);
  expect(await drawer.locator("[data-rating-count]").allTextContents()).toEqual(["15", "23", "14", "2", "1"]);
  await expect(drawer.locator("[data-rating-month]")).toHaveText("November 2026 · 55 analysts");
  // Two blues to buy, two reds to sell, gray between: the ends unlike each other.
  const paint = await bar.locator("[data-rating]").evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor));
  expect(new Set(paint).size).toBe(5);

  // The news, the newest first; an article only where its address is https.
  const headlines = drawer.locator("[data-stock-news] li");
  await expect(headlines).toHaveCount(3);
  await expect(headlines.nth(0)).toContainText("Apple's services revenue sets another record");
  await expect(headlines.nth(0)).toContainText("Example Wire · 25m ago");
  await expect(headlines.nth(1)).toContainText("3h ago");
  await expect(headlines.nth(2)).toContainText("1d ago");
  const links = drawer.locator("[data-stock-news] a");
  await expect(links).toHaveCount(2);
  await expect(links.first()).toHaveAttribute("href", "https://example.com/news/apple-services");
  await expect(links.first()).toHaveAttribute("target", "_blank");
  await expect(links.first()).toHaveAttribute("rel", /noopener/);
  // The stub's third is http: text alone.
  await expect(headlines.nth(2).locator("a")).toHaveCount(0);

  // Escape closes it; the page is as it was.
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(price(page, "AAPL")).toHaveText("268.40");
  expect(errors).toEqual([]);
});

test("the drawer's price is the card's: a trade moves it while the drawer is open", async ({ page, request }) => {
  await live(page);
  const drawer = await openDrawer(page, "AAPL");
  await expect(drawer.locator("[data-stock-price]")).toHaveText("268.40");
  await expect(async () => {
    const { delivered } = (await stub(request, "/_stub/finnhub/trade", { symbol: "AAPL", price: 270.15 })) as { delivered: number };
    expect(delivered).toBeGreaterThanOrEqual(1);
    await expect(drawer.locator("[data-stock-price]")).toHaveText("270.15", { timeout: 1500 });
  }).toPass({ timeout: 10_000 });
  // Against the previous close, 266.48 — and on the year's range too.
  await expect(drawer.locator("[data-stock-change]")).toHaveText("+3.67 (+1.38%)");
  expect(
    Number(await drawer.locator('[data-stock-range="year"] [data-stock-range-share]').getAttribute("data-stock-range-share")),
  ).toBeCloseTo((270.15 - 169.21) / (277.32 - 169.21), 3);
  await expect(price(page, "AAPL")).toHaveText("270.15");
});

test("a section Finnhub has nothing for is left out: an ETF's drawer has no company and no analysts", async ({ page }) => {
  await live(page);
  const spy = await openDrawer(page, "SPY");
  expect(await parts(spy)).toEqual(["metrics:ready", "news:ready"]);
  await expect(spy.getByText("Company")).toHaveCount(0);
  await expect(spy.getByText("Analyst ratings")).toHaveCount(0);
  // What there is of its key numbers: the year's range, the beta, the volume.
  await expect(spy.locator('[data-stock-range="year"] [data-stock-high]')).toHaveText("721.60");
  expect(await spy.locator("[data-stock-key-numbers] [data-stock-stat]").evaluateAll((els) => els.map((el) => el.getAttribute("data-stock-stat")))).toEqual([
    "beta",
    "average-volume",
  ]);
  await expect(spy.locator("[data-stock-news] li")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(spy).toBeHidden();

  // And one Finnhub has nothing at all of: today's figures alone.
  const dia = await openDrawer(page, "DIA");
  expect(await parts(dia)).toEqual([]);
  await expect(dia.locator("[data-stock-price]")).toHaveText("489.77");
  await expect(dia.getByText("Today")).toBeVisible();
});

test("a focused card opens its drawer from the keyboard, and the drawer's own close button shuts it", async ({ page, isMobile }) => {
  test.skip(isMobile, "a phone has no keyboard to focus a card with");
  await live(page);
  await splashGone(page);
  await page.getByRole("button", { name: "Show QQQ detail" }).focus();
  await page.keyboard.press("Enter");
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("heading", { name: "QQQ" })).toBeVisible();
  await expect(drawer.locator("[data-stock-price]")).toHaveText("655.10");
  await drawer.getByRole("button", { name: "Close" }).click();
  await expect(drawer).toBeHidden();
});

test("on the wall's frame the drawer is a sheet from the bottom and its headlines are text: no link to take the kiosk away", async ({
  browser,
  isMobile,
}) => {
  test.skip(isMobile, "a frame's shape of its own, once");
  // The frame's tablet upright, in Fully Kiosk Browser: its JavaScript
  // interface is on the page.
  const context = await browser.newContext({
    baseURL: APP_URL,
    viewport: { width: 800, height: 1200 },
    screen: { width: 800, height: 1200 },
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; SM-X910 Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Safari/537.36",
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  try {
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem("device-mode", "frame");
      Object.assign(window, { fully: { turnScreenOn() {}, turnScreenOff() {}, setScreenBrightness() {}, getSensorValue: () => NaN } });
    });
    await page.goto("/stocks");
    await expect(page.locator('[data-stocks-status="live"]')).toBeVisible({ timeout: 20_000 });
    await splashGone(page);
    await card(page, "AAPL").tap();
    const drawer = page.getByRole("dialog");
    await expect(drawer.locator('[data-part-state="pending"]')).toHaveCount(0);
    await settled(page);
    const box = (await drawer.boundingBox())!;
    expect([box.x, Math.round(box.width), Math.round(box.y + box.height)]).toEqual([0, 800, 1200]);
    expect(box.y).toBeGreaterThan(0);
    await expect(drawer.locator("[data-stock-news] li")).toHaveCount(3);
    await expect(drawer.locator("[data-stock-news] a")).toHaveCount(0);
    await expect(drawer.locator("[data-stock-news]")).toContainText("Apple's services revenue sets another record");
  } finally {
    await context.close();
  }
});
