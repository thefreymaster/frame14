import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ERROR_MAX,
  LOGO_HOSTS,
  NEWS_MAX,
  REGULAR,
  STOCKS_ROOM,
  TIMINGS,
  URGENT_RUN,
  capWords,
  changeOf,
  companyFrom,
  exchangeName,
  finnhubTransport,
  httpsUrl,
  inRegularHours,
  isSale,
  line,
  metricsFrom,
  newsFrom,
  quoteFrom,
  ratingsFrom,
  startStocks,
  timingsFromEnv,
  unreadMetricNames,
} from "../../stocks.js";
import stocksRouter from "../../routes/stocks.js";
import { STUB, createStub } from "../stub/stub-ha.mjs";

// The Stocks page's prices (0.179.0): Finnhub's trades socket and quotes,
// here a made-up Finnhub on fake timers (the queue's pace, the throttle and
// the idle close are durations: a fake clock keeps them exact), then once
// against the stub's stand-in over the network.

const KEY = "a-secret-finnhub-key";
const NOON = new Date("2026-11-23T12:00:00-05:00"); // a Monday, in the regular session
const AT = Math.floor(NOON.getTime() / 1000) - 60; // the quotes' moment: a minute before

const QUOTES = {
  SPY: { c: 700, d: 7, dp: 1.01, h: 702, l: 690, o: 693, pc: 693, t: AT },
  QQQ: { c: 600, d: -6, dp: -0.99, h: 607, l: 598, o: 606, pc: 606, t: AT },
  DIA: { c: 480, d: 0, dp: 0, h: 481, l: 479, o: 480, pc: 480, t: AT },
};
const UNKNOWN = { c: 0, d: null, dp: null, h: 0, l: 0, o: 0, pc: 0, t: 0 };

// A ticker's detail as Finnhub's documentation shapes it (its sample is Apple's).
const PROFILE = {
  country: "US",
  currency: "USD",
  exchange: "NASDAQ NMS - GLOBAL MARKET",
  finnhubIndustry: "Technology",
  ipo: "1980-12-12",
  logo: "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/AAPL.png",
  marketCapitalization: 4_051_230.5,
  name: "Apple Inc",
  shareOutstanding: 14_840.39,
  ticker: "AAPL",
  weburl: "https://www.apple.com/",
};
const METRIC = {
  metric: {
    "10DayAverageTradingVolume": 48.25,
    "52WeekHigh": 277.32,
    "52WeekLow": 169.21,
    beta: 1.29,
    peTTM: 36.4,
    epsTTM: 7.46,
    dividendYieldIndicatedAnnual: 0.38,
  },
  metricType: "all",
  symbol: "AAPL",
};
const RATINGS = [
  { buy: 24, hold: 13, period: "2026-10-01", sell: 2, strongBuy: 14, strongSell: 0, symbol: "AAPL" },
  { buy: 23, hold: 14, period: "2026-11-01", sell: 2, strongBuy: 15, strongSell: 1, symbol: "AAPL" },
];
const NEWS = [
  { category: "company", datetime: AT - 7200, headline: "Apple's services grow again", id: 1, image: "https://x.example/a.jpg", related: "AAPL", source: "Reuters", summary: "…", url: "https://www.reuters.com/a" },
  { category: "company", datetime: AT - 600, headline: "A new Mac, sooner than thought", id: 2, image: "", related: "AAPL", source: "Bloomberg", summary: "…", url: "https://www.bloomberg.com/b" },
];
const DETAIL_PATHS = ["/stock/profile2", "/stock/metric", "/stock/recommendation", "/company-news"];

/** A Finnhub in memory: its calls, its sockets, and answers a test can change. */
function fakeFinnhub() {
  const fake = {
    quotes: structuredClone(QUOTES),
    market: { exchange: "US", holiday: null, isOpen: true, session: REGULAR, timezone: "America/New_York", t: AT },
    calls: [],
    sockets: [],
    /** Statuses the next calls answer with, in turn (401, 429, …). */
    statuses: [],
    /** A ticker's detail, by Finnhub's path; and a status a path always answers with. */
    detail: { "/stock/profile2": PROFILE, "/stock/metric": METRIC, "/stock/recommendation": RATINGS, "/company-news": NEWS },
    always: {},
    /** Set: every call waits for this promise. */
    hold: null,
    transport: {
      async get(path, params) {
        fake.calls.push({ path, ...params, at: Date.now() });
        if (fake.hold) await fake.hold;
        const status = fake.statuses.shift() || fake.always[path] || fake.always[`${path} ${params.symbol}`];
        if (status === 401) return { status, body: { error: "Invalid API key." } };
        if (status === 403) return { status, body: { error: "You don't have access to this resource." } };
        if (status === "throw") throw new Error("socket hang up");
        if (status) return { status, body: { error: "no" } };
        if (path in fake.detail) return { status: 200, body: structuredClone(fake.detail[path]) };
        if (path === "/quote") return { status: 200, body: fake.quotes[params.symbol] ?? UNKNOWN };
        if (path === "/stock/market-status") return { status: 200, body: fake.market };
        return { status: 404, body: null };
      },
      connect(handlers) {
        const socket = {
          handlers,
          sent: [],
          closed: false,
          send(msg) {
            this.sent.push(msg);
          },
          close() {
            this.closed = true;
          },
        };
        fake.sockets.push(socket);
        return socket;
      },
    },
    /** The socket now: opened, then a trade on it. */
    open(i = fake.sockets.length - 1) {
      fake.sockets[i].handlers.onOpen();
    },
    trade(symbol, p, { t = Date.now(), c = ["1"], v = 100 } = {}) {
      fake.sockets.at(-1).handlers.onMessage({ type: "trade", data: [{ s: symbol, p, t, v, c }] });
    },
    quoteCalls: () => fake.calls.filter((c) => c.path === "/quote"),
    detailCalls: () => fake.calls.filter((c) => DETAIL_PATHS.includes(c.path)),
  };
  return fake;
}

function fakeIo() {
  const emit = vi.fn();
  return { io: { to: vi.fn(() => ({ emit })) }, emit };
}

const log = { log: vi.fn(), warn: vi.fn() };
let running = [];

function start(fake, { tickers = ["SPY", "QQQ", "DIA"], timings = {} } = {}) {
  const { io, emit } = fakeIo();
  const stocks = startStocks({ io, tickers, apiKey: KEY, transport: fake.transport, timings: { ...TIMINGS, ...timings }, log });
  running.push(stocks);
  return { stocks, io, emit };
}

const quoteOf = (stocks, symbol) => stocks.snapshot().quotes.find((q) => q.symbol === symbol);

beforeEach(() => {
  vi.useFakeTimers({ now: NOON });
  log.log.mockClear();
  log.warn.mockClear();
});

afterEach(() => {
  for (const s of running) s.stop();
  running = [];
  vi.useRealTimers();
});

describe("asking Finnhub", () => {
  it("asks for the market and then every quote on the first watch, a pace apart", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake);
    expect(fake.calls).toEqual([]);
    stocks.watch("a");
    await vi.advanceTimersByTimeAsync(4 * TIMINGS.pace);
    expect(fake.calls.map((c) => c.symbol ?? c.path)).toEqual(["/stock/market-status", "SPY", "QQQ", "DIA"]);
    const gaps = fake.calls.slice(1).map((c, i) => c.at - fake.calls[i].at);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(TIMINGS.pace);
    expect(stocks.snapshot()).toMatchObject({
      market: { session: REGULAR, isOpen: true, holiday: null },
      quotes: [
        { symbol: "SPY", price: 700, previousClose: 693, change: 7, changePercent: 1.01, high: 702, low: 690, open: 693, at: AT * 1000 },
        { symbol: "QQQ", price: 600, change: -6 },
        { symbol: "DIA", price: 480, change: 0 },
      ],
    });
  });

  it("never queues the same call twice: a page arriving while the quotes are on their way shares them", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake);
    stocks.watch("a");
    const ready = stocks.ready();
    stocks.watch("b");
    // Short of the first poll, five seconds on while the socket isn't open.
    await vi.advanceTimersByTimeAsync(4 * TIMINGS.pace);
    await ready;
    expect(fake.quoteCalls().map((c) => c.symbol)).toEqual(["SPY", "QQQ", "DIA"]);
  });

  it("waits out a rate limit and asks for the same quote again", async () => {
    const fake = fakeFinnhub();
    fake.statuses.push(0, 429); // the market answers; SPY's first ask is refused
    const { stocks } = start(fake);
    stocks.watch("a");
    await vi.advanceTimersByTimeAsync(TIMINGS.pace + 10);
    expect(fake.calls).toHaveLength(2);
    // Nothing more until the wait is over…
    await vi.advanceTimersByTimeAsync(TIMINGS.rateLimit - 100);
    expect(fake.calls).toHaveLength(2);
    // …then SPY again, and the rest.
    await vi.advanceTimersByTimeAsync(100 + 3 * TIMINGS.pace);
    expect(fake.calls.map((c) => c.symbol ?? c.path)).toEqual(["/stock/market-status", "SPY", "SPY", "QQQ", "DIA"]);
    expect(quoteOf(stocks, "SPY").price).toBe(700);
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("rate limit"));
  });

  it("has no price for a ticker Finnhub doesn't know — not $0", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake, { tickers: ["SPY", "NOPE"] });
    stocks.watch("a");
    await vi.advanceTimersByTimeAsync(4 * TIMINGS.pace);
    expect(quoteOf(stocks, "NOPE")).toEqual({
      symbol: "NOPE", price: null, previousClose: null, open: null, high: null, low: null, change: null, changePercent: null, at: null,
    });
  });

  it("asks nothing of Finnhub until a page watches or asks", async () => {
    const fake = fakeFinnhub();
    start(fake);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(fake.calls).toEqual([]);
    expect(fake.sockets).toEqual([]);
  });
});

describe("the socket", () => {
  it("opens one socket however many pages watch, and subscribes to every ticker once it's open", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake);
    stocks.watch("a");
    stocks.watch("b");
    stocks.watch("a");
    expect(fake.sockets).toHaveLength(1);
    expect(stocks.snapshot().status).toBe("connecting");
    expect(fake.sockets[0].sent).toEqual([]);
    fake.open();
    expect(fake.sockets[0].sent).toEqual(["SPY", "QQQ", "DIA"].map((symbol) => ({ type: "subscribe", symbol })));
    expect(stocks.snapshot().status).toBe("live");
  });

  it("sets the price, the change and the high from a trade in the regular session", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake);
    stocks.watch("a");
    fake.open();
    await vi.advanceTimersByTimeAsync(5 * TIMINGS.pace);
    fake.trade("SPY", 703.5);
    expect(quoteOf(stocks, "SPY")).toMatchObject({ price: 703.5, high: 703.5, low: 690, at: NOON.getTime() + 5 * TIMINGS.pace });
    expect(quoteOf(stocks, "SPY").change).toBeCloseTo(10.5);
    expect(quoteOf(stocks, "SPY").changePercent).toBeCloseTo((10.5 / 693) * 100);
    fake.trade("SPY", 689, { t: Date.now() + 1 });
    expect(quoteOf(stocks, "SPY")).toMatchObject({ price: 689, high: 703.5, low: 689 });
  });

  it("leaves the quote's figures alone outside the regular session", async () => {
    const fake = fakeFinnhub();
    fake.market.session = "post-market";
    const { stocks } = start(fake);
    stocks.watch("a");
    fake.open();
    await vi.advanceTimersByTimeAsync(5 * TIMINGS.pace);
    fake.trade("SPY", 750);
    expect(quoteOf(stocks, "SPY").price).toBe(700);
  });

  it("takes no trade from after 4 pm, whatever the market's status said a moment ago", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake);
    stocks.watch("a");
    fake.open();
    await vi.advanceTimersByTimeAsync(5 * TIMINGS.pace);
    fake.trade("SPY", 750, { t: new Date("2026-11-23T16:00:01-05:00").getTime() });
    expect(quoteOf(stocks, "SPY").price).toBe(700);
  });

  it("takes no price from a trade the tape doesn't count as a sale: an odd lot, an average price, one sold late", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake);
    stocks.watch("a");
    fake.open();
    await vi.advanceTimersByTimeAsync(5 * TIMINGS.pace);
    // Finnhub's codes: 12 an odd lot (with 1, regular), 3 an average-price
    // trade, 30 sold out of sequence, 24 Form T.
    let t = Date.now();
    for (const c of [["1", "12"], ["3"], ["30"], ["1", "24"]]) fake.trade("SPY", 750, { t: ++t, c });
    expect(quoteOf(stocks, "SPY")).toMatchObject({ price: 700, high: 702 });
    // A sale: regular, an intermarket sweep, and a code the list has no rule for.
    fake.trade("SPY", 701, { t: ++t, c: ["1", "8", "41"] });
    expect(quoteOf(stocks, "SPY").price).toBe(701);
    // No conditions said at all is a sale too.
    fake.trade("SPY", 701.5, { t: ++t, c: null });
    expect(quoteOf(stocks, "SPY").price).toBe(701.5);
  });

  it("keeps the newest price: a trade over an older quote, and a quote over an older trade", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake);
    stocks.watch("a");
    fake.open();
    await vi.advanceTimersByTimeAsync(5 * TIMINGS.pace);
    // A trade older than the quote changes nothing.
    fake.trade("SPY", 650, { t: AT * 1000 - 1 });
    expect(quoteOf(stocks, "SPY").price).toBe(700);
    fake.trade("SPY", 705);
    // The minute's quote is older than the trade: the trade's price stands.
    await vi.advanceTimersByTimeAsync(TIMINGS.livePoll + 4 * TIMINGS.pace);
    expect(quoteOf(stocks, "SPY")).toMatchObject({ price: 705, high: 705 });
    // A newer quote is the price.
    fake.quotes.SPY = { ...QUOTES.SPY, c: 701, d: 8, dp: 1.15, h: 706, t: Math.floor(Date.now() / 1000) + 1 };
    await vi.advanceTimersByTimeAsync(TIMINGS.livePoll + 4 * TIMINGS.pace);
    expect(quoteOf(stocks, "SPY")).toMatchObject({ price: 701, change: 8, high: 706 });
  });

  it("takes a quote that doesn't say when it was as of its arrival: the price over an older trade", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake);
    stocks.watch("a");
    fake.open();
    await vi.advanceTimersByTimeAsync(5 * TIMINGS.pace);
    fake.trade("SPY", 705);
    // Finnhub's API spec lists no `t` on a quote; its sample answer has one.
    const { t: _t, ...untimed } = QUOTES.SPY;
    fake.quotes.SPY = { ...untimed, c: 701, d: 8, dp: 1.15, h: 706 };
    await vi.advanceTimersByTimeAsync(TIMINGS.livePoll + 4 * TIMINGS.pace);
    expect(quoteOf(stocks, "SPY")).toMatchObject({ price: 701, change: 8, high: 706 });
    expect(quoteOf(stocks, "SPY").at).toBeGreaterThan(NOON.getTime());
    // And the next trade is newer again.
    fake.trade("SPY", 702);
    expect(quoteOf(stocks, "SPY").price).toBe(702);
  });

  it("puts the quotes in place of what it held when the socket opens again", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake);
    stocks.watch("a");
    fake.open();
    await vi.advanceTimersByTimeAsync(5 * TIMINGS.pace);
    fake.trade("SPY", 705);
    fake.sockets[0].handlers.onClose();
    await vi.advanceTimersByTimeAsync(TIMINGS.backoff);
    expect(fake.sockets).toHaveLength(2);
    fake.open();
    await vi.advanceTimersByTimeAsync(5 * TIMINGS.pace);
    expect(quoteOf(stocks, "SPY")).toMatchObject({ price: 700, high: 702 });
  });

  it("keeps a trade heard on the socket open now over the quotes asked for as it opened", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake);
    stocks.watch("a");
    await vi.advanceTimersByTimeAsync(5 * TIMINGS.pace);
    fake.sockets[0].handlers.onClose();
    await vi.advanceTimersByTimeAsync(TIMINGS.backoff);
    // Open again: the quotes are asked for anew, a pace apart — and a trade
    // comes on the new socket before SPY's is answered.
    fake.open();
    fake.trade("SPY", 704);
    await vi.advanceTimersByTimeAsync(5 * TIMINGS.pace);
    expect(quoteOf(stocks, "SPY")).toMatchObject({ price: 704, high: 704 });
  });

  it("pushes what changed to the watchers' room, at most once a second", async () => {
    const fake = fakeFinnhub();
    const { stocks, io, emit } = start(fake);
    stocks.watch("a");
    fake.open();
    await vi.advanceTimersByTimeAsync(5 * TIMINGS.pace);
    emit.mockClear();
    for (let i = 0; i < 50; i += 1) {
      fake.trade("SPY", 701 + i / 100, { t: Date.now() + i + 1 });
      await vi.advanceTimersByTimeAsync(40);
    }
    // Fifty trades over two seconds: two or three pushes, the last price in the last.
    await vi.advanceTimersByTimeAsync(TIMINGS.emit);
    expect(io.to).toHaveBeenCalledWith(STOCKS_ROOM);
    expect(emit.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(emit.mock.calls.length).toBeLessThanOrEqual(3);
    expect(emit).toHaveBeenLastCalledWith("stocks", expect.objectContaining({ status: "live" }));
    expect(emit.mock.calls.at(-1)[1].quotes[0].price).toBeCloseTo(701.49);
  });

  it("closes the socket a while after the last page leaves — and keeps it for a page that comes back", async () => {
    const fake = fakeFinnhub();
    // A socket quiet for a minute is opened again (below): not what's tested here.
    const { stocks } = start(fake, { timings: { silent: 60 * 60_000 } });
    stocks.watch("a");
    fake.open();
    stocks.unwatch("a");
    await vi.advanceTimersByTimeAsync(TIMINGS.idle - 1000);
    expect(fake.sockets[0].closed).toBe(false);
    stocks.watch("b");
    await vi.advanceTimersByTimeAsync(TIMINGS.idle);
    expect(fake.sockets).toHaveLength(1);
    expect(fake.sockets[0].closed).toBe(false);
    stocks.unwatch("b");
    await vi.advanceTimersByTimeAsync(TIMINGS.idle);
    expect(fake.sockets[0].closed).toBe(true);
    // Nor are the quotes asked for with nobody to show them.
    const asked = fake.calls.length;
    await vi.advanceTimersByTimeAsync(10 * TIMINGS.livePoll);
    expect(fake.calls.length).toBe(asked);
  });

  it("goes to polling every few seconds while the socket is refused, and tries it again later", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake);
    stocks.watch("a");
    fake.sockets[0].handlers.onError(new Error("Unexpected server response: 401"));
    fake.sockets[0].handlers.onClose();
    expect(stocks.snapshot().status).toBe("delayed");
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("Unexpected server response: 401"));
    await vi.advanceTimersByTimeAsync(5 * TIMINGS.pace);
    const before = fake.quoteCalls().length;
    await vi.advanceTimersByTimeAsync(TIMINGS.delayedPoll * 4);
    // Every ticker every five seconds, near enough.
    expect(fake.quoteCalls().length - before).toBeGreaterThanOrEqual(9);
    expect(fake.sockets).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(TIMINGS.backoff);
    expect(fake.sockets).toHaveLength(2);
    fake.open();
    expect(stocks.snapshot().status).toBe("live");
  });

  it("waits twice as long each time the socket is refused again", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake);
    stocks.watch("a");
    fake.sockets[0].handlers.onClose();
    await vi.advanceTimersByTimeAsync(TIMINGS.backoff);
    expect(fake.sockets).toHaveLength(2);
    fake.sockets[1].handlers.onClose();
    await vi.advanceTimersByTimeAsync(TIMINGS.backoff);
    expect(fake.sockets).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(TIMINGS.backoff);
    expect(fake.sockets).toHaveLength(3);
  });

  it("drops a socket that sends an error, and says so", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake);
    stocks.watch("a");
    fake.open();
    fake.sockets[0].handlers.onMessage({ type: "error", msg: "Subscribing to too many symbols" });
    expect(fake.sockets[0].closed).toBe(true);
    expect(stocks.snapshot().status).toBe("delayed");
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("Subscribing to too many symbols"));
  });

  it("opens a socket again that has said nothing for a minute in the regular session", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake);
    stocks.watch("a");
    fake.open();
    await vi.advanceTimersByTimeAsync(TIMINGS.silent + TIMINGS.silent / 4);
    expect(fake.sockets[0].closed).toBe(true);
    expect(stocks.snapshot().status).toBe("delayed");
  });

  it("ignores Finnhub's pings and anything it doesn't know", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake);
    stocks.watch("a");
    fake.open();
    fake.sockets[0].handlers.onMessage({ type: "ping" });
    fake.sockets[0].handlers.onMessage({ type: "news", data: [{}] });
    fake.sockets[0].handlers.onMessage({ type: "trade", data: [{ s: "SPY" }, null, { s: "XYZ", p: 1, t: Date.now() }] });
    expect(stocks.snapshot().status).toBe("live");
  });
});

describe("a refused key", () => {
  it("is the page's error, with Finnhub's words, and nothing more is asked", async () => {
    const fake = fakeFinnhub();
    fake.statuses.push(401);
    const { stocks, emit } = start(fake);
    stocks.watch("a");
    await vi.advanceTimersByTimeAsync(10 * TIMINGS.pace);
    expect(stocks.snapshot()).toMatchObject({ status: "error", error: "Invalid API key." });
    expect(fake.calls).toHaveLength(1);
    expect(fake.sockets[0].closed).toBe(true);
    await vi.advanceTimersByTimeAsync(10 * TIMINGS.livePoll);
    expect(fake.calls).toHaveLength(1);
    expect(fake.sockets).toHaveLength(1);
    expect(emit).toHaveBeenLastCalledWith("stocks", expect.objectContaining({ status: "error" }));
  });

  it("is tried again at once by the next page, or the next ask", async () => {
    const fake = fakeFinnhub();
    fake.statuses.push(401);
    const { stocks } = start(fake);
    stocks.watch("a");
    await vi.advanceTimersByTimeAsync(10 * TIMINGS.pace);
    expect(stocks.snapshot().status).toBe("error");
    stocks.watch("b");
    await vi.advanceTimersByTimeAsync(5 * TIMINGS.pace);
    expect(quoteOf(stocks, "SPY").price).toBe(700);
    expect(fake.sockets).toHaveLength(2);
    expect(stocks.snapshot().status).toBe("connecting");

    stocks.unwatch("a");
    stocks.unwatch("b");
    // What was on its way is asked; then nothing, with nobody watching,
    // until the quotes are old enough for a GET to ask again.
    await vi.advanceTimersByTimeAsync(TIMINGS.fresh + TIMINGS.idle);
    fake.statuses.push(401);
    const asked = stocks.ready();
    await vi.advanceTimersByTimeAsync(10 * TIMINGS.pace);
    expect((await asked).status).toBe("error");
    const again = stocks.ready();
    await vi.advanceTimersByTimeAsync(10 * TIMINGS.pace);
    expect((await again).status).not.toBe("error");
  });

  it("is held to a line of Finnhub's words", async () => {
    const fake = fakeFinnhub();
    fake.statuses.push(401);
    fake.transport.get = async () => ({ status: 401, body: { error: `bad\nkey ${"x".repeat(500)}` } });
    const { stocks } = start(fake);
    stocks.watch("a");
    await vi.advanceTimersByTimeAsync(TIMINGS.pace);
    expect(stocks.snapshot().error).toHaveLength(ERROR_MAX);
    expect(stocks.snapshot().error.startsWith("bad key x")).toBe(true);
  });
});

describe("GET's answer", () => {
  it("asks for quotes more than a minute old first, and waits five seconds at most", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake);
    const first = stocks.ready();
    await vi.advanceTimersByTimeAsync(4 * TIMINGS.pace);
    expect((await first).quotes[0].price).toBe(700);
    // Fresh: answered as it is.
    const calls = fake.calls.length;
    await stocks.ready();
    expect(fake.calls.length).toBe(calls);
    // A Finnhub that doesn't answer: the snapshot as it is, five seconds on.
    await vi.advanceTimersByTimeAsync(TIMINGS.fresh);
    let answered = false;
    fake.hold = new Promise(() => {});
    const slow = stocks.ready().then((s) => {
      answered = true;
      return s;
    });
    await vi.advanceTimersByTimeAsync(TIMINGS.wait - 100);
    expect(answered).toBe(false);
    await vi.advanceTimersByTimeAsync(100);
    expect((await slow).quotes[0].price).toBe(700);
  });
});

describe("the key", () => {
  it("is in no snapshot, push or log line", async () => {
    const fake = fakeFinnhub();
    const { stocks, emit } = start(fake);
    stocks.watch("a");
    fake.open();
    await vi.advanceTimersByTimeAsync(5 * TIMINGS.pace);
    fake.trade("SPY", 701);
    fake.sockets[0].handlers.onError(new Error("boom"));
    fake.sockets[0].handlers.onClose();
    await vi.advanceTimersByTimeAsync(TIMINGS.backoff);
    const said = JSON.stringify([stocks.snapshot(), emit.mock.calls, log.log.mock.calls, log.warn.mock.calls]);
    expect(said).not.toContain(KEY);
  });

  it("gives up a socket whose handshake nobody answers, so it can be tried again", async () => {
    vi.useRealTimers();
    const net = await import("node:net");
    // Takes the connection and says nothing.
    const taken = [];
    const silent = net.createServer((socket) => taken.push(socket));
    await new Promise((r) => silent.listen(0, "127.0.0.1", r));
    try {
      const said = [];
      const closed = new Promise((done) => {
        finnhubTransport({ apiUrl: "http://127.0.0.1:1", wsUrl: `ws://127.0.0.1:${silent.address().port}`, apiKey: KEY, handshakeTimeout: 150 }).connect({
          onOpen: () => said.push("open"),
          onMessage: () => {},
          onError: (err) => said.push(err.message),
          onClose: () => done(),
        });
      });
      await closed;
      expect(said).toEqual([expect.stringMatching(/handshake has timed out/)]);
    } finally {
      for (const socket of taken) socket.destroy();
      await new Promise((r) => silent.close(r));
    }
  });

  it("goes to Finnhub's REST in a header, and to its socket in the address", async () => {
    vi.useRealTimers();
    const seen = [];
    const server = (await import("node:http")).createServer((req, res) => {
      seen.push({ url: req.url, token: req.headers["x-finnhub-token"] });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(QUOTES.SPY));
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    try {
      const net = finnhubTransport({ apiUrl: `http://127.0.0.1:${server.address().port}/api/v1/`, wsUrl: "ws://127.0.0.1:1", apiKey: KEY });
      const res = await net.get("/quote", { symbol: "SPY" });
      expect(res).toEqual({ status: 200, body: QUOTES.SPY });
      expect(seen).toEqual([{ url: "/api/v1/quote?symbol=SPY", token: KEY }]);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });
});

describe("a ticker's detail", () => {
  // The routine polls an hour off: the calls counted here are a drawer's and
  // the first watch's.
  const QUIET = { delayedPoll: 3_600_000, livePoll: 3_600_000, market: 3_600_000 };
  /** A page watching, its quotes in: the queue empty. */
  async function watching(fake, options = {}) {
    const started = start(fake, { ...options, timings: { ...QUIET, ...options.timings } });
    started.stocks.watch("a");
    await vi.advanceTimersByTimeAsync(5 * TIMINGS.pace);
    fake.calls.length = 0;
    return started;
  }
  /** The detail asked for, and the clock run until it's answered. */
  async function detailOf(stocks, symbol, ms = 6 * TIMINGS.pace) {
    const asked = stocks.detail(symbol);
    await vi.advanceTimersByTimeAsync(ms);
    return asked;
  }

  it("asks Finnhub for the four parts, a pace apart, and answers them cleaned", async () => {
    const fake = fakeFinnhub();
    const { stocks } = await watching(fake);
    // The config's ticker, however the caller writes it.
    const detail = await detailOf(stocks, " spy ");
    expect(fake.calls.map((c) => c.path)).toEqual(DETAIL_PATHS);
    expect(fake.calls.every((c) => c.symbol === "SPY")).toBe(true);
    expect(fake.calls[1]).toMatchObject({ metric: "all" });
    // The week's news, to today: noon in New York on 2026-11-23.
    expect(fake.calls[3]).toMatchObject({ from: "2026-11-16", to: "2026-11-23" });
    const gaps = fake.calls.slice(1).map((c, i) => c.at - fake.calls[i].at);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(TIMINGS.pace);
    expect(detail).toEqual({
      symbol: "SPY",
      pending: [],
      failed: [],
      company: {
        name: "Apple Inc",
        industry: "Technology",
        exchange: "Nasdaq",
        marketValue: 4_051_230_500_000,
        logo: PROFILE.logo,
      },
      metrics: { week52High: 277.32, week52Low: 169.21, pe: 36.4, eps: 7.46, dividendYield: 0.38, beta: 1.29, averageVolume: 48_250_000 },
      ratings: { period: "2026-11-01", strongBuy: 15, buy: 23, hold: 14, sell: 2, strongSell: 1 },
      news: [
        { headline: "A new Mac, sooner than thought", source: "Bloomberg", at: (AT - 600) * 1000, url: "https://www.bloomberg.com/b" },
        { headline: "Apple's services grow again", source: "Reuters", at: (AT - 7200) * 1000, url: "https://www.reuters.com/a" },
      ],
    });
  });

  it("is nothing for a ticker that isn't the add-on's, and Finnhub isn't asked", async () => {
    const fake = fakeFinnhub();
    const { stocks } = await watching(fake);
    expect(await detailOf(stocks, "TSLA")).toBeNull();
    expect(await detailOf(stocks, "")).toBeNull();
    expect(await detailOf(stocks, undefined)).toBeNull();
    expect(fake.calls).toEqual([]);
  });

  it("asks nothing with no page watching: what's held is the answer", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake, { timings: QUIET });
    expect(await detailOf(stocks, "SPY")).toEqual({ symbol: "SPY", pending: [], failed: [], company: null, metrics: null, ratings: null, news: null });
    expect(fake.calls).toEqual([]);
    // Held from a page's time, it is still the answer once the page has gone.
    stocks.watch("a");
    await vi.advanceTimersByTimeAsync(5 * TIMINGS.pace);
    await detailOf(stocks, "SPY");
    stocks.unwatch("a");
    fake.calls.length = 0;
    await vi.advanceTimersByTimeAsync(TIMINGS.news + 1);
    expect((await detailOf(stocks, "SPY")).company.name).toBe("Apple Inc");
    expect(fake.calls).toEqual([]);
  });

  it("goes ahead of the quotes waiting their turn, each call made once", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake, { timings: QUIET });
    stocks.watch("a");
    // The market is asked at once; the three quotes wait a pace each. A
    // drawer opened during that wait is next.
    await vi.advanceTimersByTimeAsync(TIMINGS.pace / 2);
    expect(fake.calls.map((c) => c.path)).toEqual(["/stock/market-status"]);
    void stocks.detail("QQQ");
    await vi.advanceTimersByTimeAsync(10 * TIMINGS.pace);
    expect(fake.calls.map((c) => (c.path === "/quote" ? c.symbol : c.path))).toEqual([
      "/stock/market-status",
      ...DETAIL_PATHS,
      "SPY",
      "QQQ",
      "DIA",
    ]);
  });

  it("waits for the call in flight, which is made once and not again", async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake, { timings: QUIET });
    let release;
    fake.hold = new Promise((r) => (release = r));
    stocks.watch("a");
    await vi.advanceTimersByTimeAsync(10);
    // The market's call is out and unanswered: the drawer's are behind it.
    void stocks.detail("SPY");
    await vi.advanceTimersByTimeAsync(3 * TIMINGS.pace);
    expect(fake.calls.map((c) => c.path)).toEqual(["/stock/market-status"]);
    fake.hold = null;
    release();
    await vi.advanceTimersByTimeAsync(10 * TIMINGS.pace);
    expect(fake.calls.map((c) => (c.path === "/quote" ? c.symbol : c.path))).toEqual([
      "/stock/market-status",
      ...DETAIL_PATHS,
      "SPY",
      "QQQ",
      "DIA",
    ]);
    expect(stocks.snapshot().market.session).toBe(REGULAR);
  });

  it("goes first after a rate limit's wait, and the quote it interrupted is still asked again", async () => {
    const fake = fakeFinnhub();
    fake.statuses.push(0, 429); // the market answers; SPY's quote is told to wait
    const { stocks } = start(fake, { timings: QUIET });
    stocks.watch("a");
    await vi.advanceTimersByTimeAsync(2 * TIMINGS.pace);
    expect(fake.quoteCalls().map((c) => c.symbol)).toEqual(["SPY"]);
    void stocks.detail("DIA");
    await vi.advanceTimersByTimeAsync(TIMINGS.rateLimit + 10 * TIMINGS.pace);
    expect(fake.calls.map((c) => (c.path === "/quote" ? c.symbol : c.path))).toEqual([
      "/stock/market-status",
      "SPY",
      ...DETAIL_PATHS,
      "SPY",
      "QQQ",
      "DIA",
    ]);
    expect(quoteOf(stocks, "SPY").price).toBe(700);
  });

  it(`lets a routine call through after ${URGENT_RUN} of the drawers', so the quotes never wait for ever`, async () => {
    const fake = fakeFinnhub();
    const { stocks } = start(fake, { timings: QUIET });
    stocks.watch("a");
    await vi.advanceTimersByTimeAsync(TIMINGS.pace / 2);
    void stocks.detail("SPY");
    void stocks.detail("QQQ");
    await vi.advanceTimersByTimeAsync(14 * TIMINGS.pace);
    const kinds = fake.calls.slice(1).map((c) => (c.path === "/quote" ? "quote" : "detail"));
    expect(kinds.slice(0, 2 * URGENT_RUN + 2)).toEqual([
      ...Array(URGENT_RUN).fill("detail"),
      "quote",
      ...Array(URGENT_RUN).fill("detail"),
      "quote",
    ]);
    expect(fake.detailCalls()).toHaveLength(8);
  });

  it("keeps each part its own time, and sends the old one while the new is on its way", async () => {
    const fake = fakeFinnhub();
    const { stocks } = await watching(fake);
    await detailOf(stocks, "SPY");
    fake.calls.length = 0;
    // Inside every part's time: nothing asked.
    await vi.advanceTimersByTimeAsync(TIMINGS.news - 10 * TIMINGS.pace);
    fake.calls.length = 0;
    expect((await detailOf(stocks, "SPY")).news).toHaveLength(2);
    expect(fake.detailCalls()).toEqual([]);
    // The news' quarter of an hour over: asked again alone — and the answer
    // doesn't wait for it.
    await vi.advanceTimersByTimeAsync(11 * TIMINGS.pace);
    fake.detail["/company-news"] = [{ ...NEWS[0], headline: "Something newer", datetime: AT }];
    fake.calls.length = 0;
    const old = await stocks.detail("SPY");
    expect(old.news).toHaveLength(2);
    expect(old.pending).toEqual([]);
    await vi.advanceTimersByTimeAsync(2 * TIMINGS.pace);
    expect(fake.detailCalls().map((c) => c.path)).toEqual(["/company-news"]);
    expect((await detailOf(stocks, "SPY")).news.map((n) => n.headline)).toEqual(["Something newer"]);
    // Six hours on, the key numbers too; the company and the ratings after a day.
    await vi.advanceTimersByTimeAsync(TIMINGS.metrics);
    fake.calls.length = 0;
    await detailOf(stocks, "SPY");
    expect(fake.detailCalls().map((c) => c.path).sort()).toEqual(["/company-news", "/stock/metric"]);
    await vi.advanceTimersByTimeAsync(TIMINGS.company);
    fake.calls.length = 0;
    await detailOf(stocks, "SPY");
    expect(fake.detailCalls().map((c) => c.path)).toEqual(DETAIL_PATHS);
  });

  it("keeps a part Finnhub has nothing for as nothing, without asking again", async () => {
    const fake = fakeFinnhub();
    // As an ETF's: no profile, no analysts, no news, and nothing among the numbers.
    fake.detail = { "/stock/profile2": {}, "/stock/metric": { metric: {}, symbol: "SPY" }, "/stock/recommendation": [], "/company-news": [] };
    const { stocks } = await watching(fake);
    expect(await detailOf(stocks, "SPY")).toEqual({ symbol: "SPY", pending: [], failed: [], company: null, metrics: null, ratings: null, news: null });
    fake.calls.length = 0;
    await detailOf(stocks, "SPY");
    expect(fake.detailCalls()).toEqual([]);
  });

  it("takes a 403 as that one thing not on the key's plan — not as the key refused", async () => {
    const fake = fakeFinnhub();
    fake.always = { "/stock/profile2": 403, "/quote QQQ": 403 };
    const { stocks } = await watching(fake);
    // One ticker has no quote; the page is no error, and the others are priced.
    expect(stocks.snapshot().status).not.toBe("error");
    expect(stocks.snapshot().error).toBeNull();
    expect(quoteOf(stocks, "QQQ").price).toBeNull();
    expect(quoteOf(stocks, "SPY").price).toBe(700);
    // And a drawer has no company, with the rest in it.
    const detail = await detailOf(stocks, "SPY");
    expect(detail).toMatchObject({ pending: [], failed: [], company: null });
    expect(detail.metrics.pe).toBe(36.4);
    expect(stocks.snapshot().status).not.toBe("error");
    // Kept as nothing, and said once.
    fake.calls.length = 0;
    await detailOf(stocks, "SPY");
    expect(fake.detailCalls()).toEqual([]);
    const said = log.warn.mock.calls.flat().filter((l) => /not on this key's Finnhub plan/.test(l));
    expect(said.filter((l) => l.includes("/stock/profile2 SPY"))).toHaveLength(1);
    expect(said.filter((l) => l.includes("/quote QQQ"))).toHaveLength(1);
  });

  it("says which part Finnhub didn't answer for, and an open drawer's asking makes one call of it a minute", async () => {
    const fake = fakeFinnhub();
    fake.always = { "/company-news": 500, "/stock/recommendation": "throw" };
    const { stocks } = await watching(fake);
    const detail = await detailOf(stocks, "SPY");
    expect(detail).toMatchObject({ pending: [], failed: ["ratings", "news"], ratings: null, news: null });
    expect(detail.company.name).toBe("Apple Inc");
    // A drawer open for most of a minute, asking every second.
    for (let i = 0; i < 50; i++) {
      await stocks.detail("SPY");
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(fake.detailCalls().filter((c) => c.path === "/company-news")).toHaveLength(1);
    expect(fake.detailCalls().filter((c) => c.path === "/stock/recommendation")).toHaveLength(1);
    // After the minute it is tried again, and answered.
    fake.always = {};
    await vi.advanceTimersByTimeAsync(TIMINGS.failed);
    expect(await detailOf(stocks, "SPY")).toMatchObject({ failed: [], ratings: { buy: 23 } });
  });

  it("isn't asked again at once when the answer can't be read", async () => {
    const fake = fakeFinnhub();
    // A getter that throws: what a reader meets in an answer it wasn't written for.
    const { stocks } = await watching(fake);
    const broken = { get metric() { throw new Error("unreadable"); } };
    const get = fake.transport.get;
    fake.transport.get = async (path, params) => (path === "/stock/metric" ? (fake.calls.push({ path, ...params, at: Date.now() }), { status: 200, body: broken }) : get(path, params));
    const detail = await detailOf(stocks, "SPY");
    expect(detail.failed).toEqual(["metrics"]);
    for (let i = 0; i < 20; i++) {
      await stocks.detail("SPY");
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(fake.calls.filter((c) => c.path === "/stock/metric")).toHaveLength(1);
  });

  it("answers after five seconds with the parts still on their way named, and they end with the key refused or the feed stopped", async () => {
    const fake = fakeFinnhub();
    const { stocks } = await watching(fake);
    let release;
    fake.hold = new Promise((r) => (release = r));
    const asked = stocks.detail("SPY");
    await vi.advanceTimersByTimeAsync(TIMINGS.wait + 1);
    expect(await asked).toMatchObject({ pending: ["company", "metrics", "ratings", "news"], failed: [], company: null });
    // The key refused on the call in flight: nothing is on its way any more.
    fake.statuses.push(401);
    fake.hold = null;
    release();
    await vi.advanceTimersByTimeAsync(10);
    expect(stocks.snapshot().status).toBe("error");
    fake.calls.length = 0;
    expect(await detailOf(stocks, "SPY")).toMatchObject({ pending: [], company: null });
    expect(fake.calls).toEqual([]);

    // And a feed stopped mid-way leaves none pending either.
    const other = fakeFinnhub();
    const second = await watching(other);
    other.hold = new Promise(() => {});
    const waiting = second.stocks.detail("QQQ");
    await vi.advanceTimersByTimeAsync(100);
    second.stocks.stop();
    await vi.advanceTimersByTimeAsync(TIMINGS.wait + 1);
    expect((await waiting).pending).toEqual([]);
    expect((await second.stocks.detail("QQQ")).pending).toEqual([]);
  });

  it("cleans what Finnhub sends: text to a line, a link only if https, the logo only from Finnhub's own hosts", async () => {
    const fake = fakeFinnhub();
    fake.detail["/stock/profile2"] = {
      ...PROFILE,
      name: `  Apple\u0000 \u202eInc\n${"x".repeat(200)}`,
      finnhubIndustry: 12,
      exchange: "LONDON STOCK EXCHANGE",
      marketCapitalization: "lots",
      logo: "https://evil.example/logo.png",
    };
    fake.detail["/company-news"] = [
      { ...NEWS[0], headline: "h".repeat(500), url: "http://plain.example/a", source: "s".repeat(90) },
      { ...NEWS[1], headline: "With a name in it", url: "https://user:pw@news.example/b" },
      { ...NEWS[1], headline: "A script", url: "javascript:alert(1)", datetime: AT - 900 },
      { ...NEWS[1], headline: "", datetime: AT },
      { ...NEWS[1], headline: "No time", datetime: "soon" },
      null,
    ];
    const { stocks } = await watching(fake);
    const detail = await detailOf(stocks, "SPY");
    expect(detail.company.name).toHaveLength(80);
    expect(detail.company.name.startsWith("Apple Inc x")).toBe(true);
    expect(detail.company).toMatchObject({ industry: null, exchange: "LONDON STOCK EXCHANGE", marketValue: null, logo: null });
    expect(detail.news.map((n) => [n.headline.length, n.url])).toEqual([
      ["With a name in it".length, null],
      ["A script".length, null],
      [200, null],
    ]);
    expect(detail.news[2].source).toHaveLength(40);
  });

  it("says once which names Finnhub gave a key number it couldn't find", async () => {
    const fake = fakeFinnhub();
    fake.detail["/stock/metric"] = { metric: { "52WeekHigh": 10, "52WeekLow": 5, peForward: 30, epsGrowth5Y: 12, beta: 1 } };
    const { stocks } = await watching(fake);
    const detail = await detailOf(stocks, "SPY");
    expect(detail.metrics).toMatchObject({ pe: null, eps: null, dividendYield: null, beta: 1 });
    const said = () => log.warn.mock.calls.flat().filter((l) => /key numbers: no match/.test(l));
    expect(said()).toHaveLength(1);
    expect(said()[0]).toContain("peForward");
    expect(said()[0]).toContain("epsGrowth5Y");
    await detailOf(stocks, "QQQ");
    expect(said()).toHaveLength(1);
  });

  it("has the key in none of it", async () => {
    const fake = fakeFinnhub();
    fake.always = { "/company-news": 500 };
    const { stocks } = await watching(fake);
    const detail = await detailOf(stocks, "SPY");
    expect(JSON.stringify(detail)).not.toContain(KEY);
    expect(JSON.stringify([log.log.mock.calls, log.warn.mock.calls])).not.toContain(KEY);
  });
});

describe("against the stub's Finnhub, over the network", () => {
  it("brings the quotes, opens the socket and takes a trade, in that order", async () => {
    vi.useRealTimers();
    const stub = await createStub({ port: 0 });
    const { io, emit } = fakeIo();
    const stocks = startStocks({
      io,
      tickers: ["SPY", "QQQ", "DIA"],
      apiKey: STUB.stocks.key,
      transport: finnhubTransport({
        apiUrl: `${stub.url}/_stub/finnhub/api/v1`,
        wsUrl: `${stub.url.replace(/^http/, "ws")}/_stub/finnhub/ws`,
        apiKey: STUB.stocks.key,
      }),
      timings: { ...TIMINGS, pace: 5, emit: 10 },
      log,
    });
    try {
      stocks.watch("a");
      await vi.waitFor(() => expect(stocks.snapshot().status).toBe("live"), { timeout: 5000 });
      await vi.waitFor(() => expect(stocks.snapshot().quotes.every((q) => q.price != null)).toBe(true), { timeout: 5000 });
      expect(stocks.snapshot().quotes.map((q) => q.price)).toEqual(["SPY", "QQQ", "DIA"].map((s) => STUB.stocks.quotes[s].c));
      // The stub stamps a trade in the regular session, after its quotes'
      // moment. Sent until one sticks: the quotes asked for as the socket
      // opened may land after the first and put the quote's price back.
      await vi.waitFor(
        () => {
          expect(stub.finnhubTrade({ symbol: "SPY", price: 999.5 })).toBe(1);
          expect(quoteOf(stocks, "SPY").price).toBe(999.5);
        },
        { timeout: 5000, interval: 50 },
      );
      await vi.waitFor(() => expect(emit.mock.calls.at(-1)?.[1].quotes[0].price).toBe(999.5), { timeout: 5000 });
    } finally {
      stocks.stop();
      await stub.close();
    }
  });
});

describe("the pieces", () => {
  it("reads a quote: seconds to ms, a price of 0 as none, the change worked out where Finnhub gives none", () => {
    expect(quoteFrom("SPY", QUOTES.SPY)).toMatchObject({ price: 700, at: AT * 1000, change: 7 });
    expect(quoteFrom("X", UNKNOWN).price).toBeNull();
    expect(quoteFrom("X", { c: 110, pc: 100, d: null, dp: null, t: AT })).toMatchObject({ change: 10, changePercent: 10 });
    expect(changeOf(null, 100)).toEqual({ change: null, changePercent: null });
  });

  it("tells a sale from the trades that don't set the last price, by Finnhub's condition codes", () => {
    // Regular, acquisition, bunched, automatic execution, intermarket sweep, opening prints, cross.
    for (const code of [1, 2, 4, 7, 8, 19, 28]) expect(isSale([String(code)]), `code ${code}`).toBe(true);
    // Never the last: average price, cash, price variation, cap election, odd
    // lot, official close, next day, official open, seller, Form T, extended
    // hours out of sequence, contingent, qualified contingent.
    for (const code of [3, 5, 10, 11, 12, 16, 17, 20, 22, 24, 25, 26, 37]) expect(isSale([String(code)]), `code ${code}`).toBe(false);
    // The last only where there is none: bunched sold, sold last, a market
    // centre's opening trade, prior reference price, sold out of sequence,
    // derivatively priced.
    for (const code of [9, 15, 18, 21, 30, 32]) expect(isSale([String(code)]), `code ${code}`).toBe(false);
    // One such condition among others is enough; numbers as well as strings.
    expect(isSale(["1", "8", "12"])).toBe(false);
    expect(isSale([1, 12])).toBe(false);
    expect(isSale([1, 8])).toBe(true);
    // No rule in the list, not in it, or nothing said: a sale.
    expect(isSale(["41"])).toBe(true);
    expect(isSale(["99", "x"])).toBe(true);
    expect(isSale([])).toBe(true);
    expect(isSale(null)).toBe(true);
    expect(isSale(undefined)).toBe(true);
  });

  it("knows the regular session's hours in New York, summer and winter", () => {
    const at = (iso) => inRegularHours(new Date(iso).getTime());
    expect(at("2026-11-23T09:29:59-05:00")).toBe(false);
    expect(at("2026-11-23T09:30:00-05:00")).toBe(true);
    expect(at("2026-11-23T15:59:59-05:00")).toBe(true);
    expect(at("2026-11-23T16:00:00-05:00")).toBe(false);
    expect(at("2026-07-15T09:30:00-04:00")).toBe(true);
    expect(at("2026-07-15T16:00:00-04:00")).toBe(false);
    expect(at("2026-11-21T12:00:00-05:00")).toBe(false); // a Saturday
  });

  it("holds outside text to one line of a length, with nothing that turns its direction", () => {
    expect(line("  a\u0000b\n\tc  ", 10)).toBe("a b c");
    expect(line("abc\u202edef\u2066", 10)).toBe("abc def");
    expect(line("x".repeat(50), 10)).toHaveLength(10);
    expect(line(12, 10)).toBe("");
    expect(line(null, 10)).toBe("");
  });

  it("keeps an address only if it is https, with no name in it — and on a named host where one is asked", () => {
    expect(httpsUrl("https://www.reuters.com/a?b=1")).toBe("https://www.reuters.com/a?b=1");
    expect(httpsUrl("http://www.reuters.com/a")).toBeNull();
    expect(httpsUrl("javascript:alert(1)")).toBeNull();
    expect(httpsUrl("data:text/html,x")).toBeNull();
    expect(httpsUrl("https://me:pw@host.example/")).toBeNull();
    expect(httpsUrl("//host.example/a")).toBeNull();
    expect(httpsUrl("not an address")).toBeNull();
    expect(httpsUrl(undefined)).toBeNull();
    expect(httpsUrl(`https://a.example/${"x".repeat(3000)}`)).toBeNull();
    expect(LOGO_HOSTS).toEqual(["static.finnhub.io", "static2.finnhub.io"]);
    expect(httpsUrl("https://static2.finnhub.io/l.png", LOGO_HOSTS)).toBe("https://static2.finnhub.io/l.png");
    expect(httpsUrl("https://static.finnhub.io/l.png", LOGO_HOSTS)).toBe("https://static.finnhub.io/l.png");
    expect(httpsUrl("https://static2.finnhub.io.evil.example/l.png", LOGO_HOSTS)).toBeNull();
    expect(httpsUrl("https://evil.example/static2.finnhub.io/l.png", LOGO_HOSTS)).toBeNull();
  });

  it("reads a company, an exchange in the word people use, and no company from an ETF's empty answer", () => {
    expect(companyFrom(PROFILE)).toEqual({ name: "Apple Inc", industry: "Technology", exchange: "Nasdaq", marketValue: 4_051_230_500_000, logo: PROFILE.logo });
    expect(companyFrom({})).toBeNull();
    expect(companyFrom(null)).toBeNull();
    expect(companyFrom({ name: "A", marketCapitalization: 0 })).toEqual({ name: "A", industry: null, exchange: null, marketValue: null, logo: null });
    expect(exchangeName("NEW YORK STOCK EXCHANGE, INC.")).toBe("NYSE");
    expect(exchangeName("NYSE ARCA")).toBe("NYSE Arca");
    expect(exchangeName("NYSE MKT LLC")).toBe("NYSE American");
    expect(exchangeName("BATS")).toBe("Cboe");
    expect(exchangeName("TORONTO STOCK EXCHANGE")).toBe("TORONTO STOCK EXCHANGE");
    expect(exchangeName("")).toBeNull();
  });

  it("reads the key numbers under any of their likely names, each none where Finnhub has none", () => {
    expect(metricsFrom(METRIC)).toEqual({ week52High: 277.32, week52Low: 169.21, pe: 36.4, eps: 7.46, dividendYield: 0.38, beta: 1.29, averageVolume: 48_250_000 });
    // Other names for the same numbers, and a three-month volume where there is no ten-day one.
    expect(
      metricsFrom({ metric: { peBasicExclExtraTTM: 20, epsInclExtraItemsTTM: -1.5, currentDividendYieldTTM: 2.1, "3MonthAverageTradingVolume": 2 } }),
    ).toEqual({ week52High: null, week52Low: null, pe: 20, eps: -1.5, dividendYield: 2.1, beta: null, averageVolume: 2_000_000 });
    // No earnings and no dividend are none, not zero; half a range is no range.
    expect(metricsFrom({ metric: { peTTM: -4, dividendYieldIndicatedAnnual: 0, "52WeekHigh": 10, beta: 0.5 } })).toEqual({
      week52High: null,
      week52Low: null,
      pe: null,
      eps: null,
      dividendYield: null,
      beta: 0.5,
      averageVolume: null,
    });
    expect(metricsFrom({ metric: { "52WeekHigh": 5, "52WeekLow": 10 } })).toBeNull();
    expect(metricsFrom({ metric: {} })).toBeNull();
    expect(metricsFrom({})).toBeNull();
    expect(metricsFrom(null)).toBeNull();
    expect(unreadMetricNames(METRIC, metricsFrom(METRIC))).toEqual({});
    expect(unreadMetricNames({ metric: { peForward: 3, peBad: "x", yieldOnCost: 1 } }, { pe: null, eps: null, dividendYield: null })).toEqual({
      pe: ["peForward"],
      dividendYield: ["yieldOnCost"],
    });
  });

  it("reads the newest month's ratings, and none without an analyst", () => {
    expect(ratingsFrom(RATINGS)).toEqual({ period: "2026-11-01", strongBuy: 15, buy: 23, hold: 14, sell: 2, strongSell: 1 });
    expect(ratingsFrom([{ period: "2026-11-01", buy: 0, hold: 0, sell: 0, strongBuy: 0, strongSell: 0 }])).toBeNull();
    expect(ratingsFrom([{ period: "soon", buy: 3 }, null, { buy: 2 }])).toBeNull();
    expect(ratingsFrom([{ period: "2026-11-01", buy: 2.4, hold: -1, sell: "x" }])).toEqual({ period: "2026-11-01", strongBuy: 0, buy: 2, hold: 0, sell: 0, strongSell: 0 });
    expect(ratingsFrom([])).toBeNull();
    expect(ratingsFrom({})).toBeNull();
  });

  it(`reads the newest ${NEWS_MAX} headlines, each once`, () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ ...NEWS[0], headline: `Headline ${i}`, datetime: AT + i }));
    const read = newsFrom([...many, { ...many[9] }]);
    expect(read).toHaveLength(NEWS_MAX);
    expect(read.map((n) => n.headline)).toEqual(["Headline 9", "Headline 8", "Headline 7", "Headline 6", "Headline 5", "Headline 4"]);
    expect(read[0]).toEqual({ headline: "Headline 9", source: "Reuters", at: (AT + 9) * 1000, url: "https://www.reuters.com/a" });
    expect(newsFrom([])).toBeNull();
    expect(newsFrom({})).toBeNull();
  });

  it("holds outside words to a line", () => {
    expect(capWords("a\u0000b\n\tc  ")).toBe("a b c");
    expect(capWords("x".repeat(500))).toHaveLength(ERROR_MAX);
    expect(capWords(undefined)).toBe("");
  });

  it("takes shorter timings from FRAME14_STOCKS_TIMINGS, the rest as they are", () => {
    expect(timingsFromEnv({})).toEqual(TIMINGS);
    expect(timingsFromEnv({ FRAME14_STOCKS_TIMINGS: '{"pace":50,"idle":"2000","nope":1,"emit":-1}' })).toEqual({
      ...TIMINGS,
      pace: 50,
      idle: 2000,
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(timingsFromEnv({ FRAME14_STOCKS_TIMINGS: "{" })).toEqual(TIMINGS);
  });
});

describe("GET /api/stocks", () => {
  const app = (stocks) => {
    const a = express();
    a.locals.stocks = stocks;
    a.use("/api/stocks", stocksRouter);
    return a;
  };

  it("answers the prices, kept by nothing in between", async () => {
    vi.useRealTimers();
    const fake = fakeFinnhub();
    const { io } = fakeIo();
    const stocks = startStocks({ io, tickers: ["SPY"], apiKey: KEY, transport: fake.transport, timings: { ...TIMINGS, pace: 1 }, log });
    running.push(stocks);
    const res = await request(app(stocks)).get("/api/stocks");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body).toMatchObject({ status: "connecting", error: null, quotes: [{ symbol: "SPY", price: 700 }] });
  });

  it("is a 404 while Stocks isn't set up", async () => {
    vi.useRealTimers();
    const res = await request(app(null)).get("/api/stocks");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/finnhub_api_key/);
    const detail = await request(app(null)).get("/api/stocks/SPY");
    expect(detail.status).toBe(404);
    expect(detail.body.error).toMatch(/finnhub_api_key/);
  });

  it("answers one ticker's detail, kept by nothing in between — and only a ticker of the add-on's", async () => {
    vi.useRealTimers();
    const fake = fakeFinnhub();
    const { io } = fakeIo();
    const stocks = startStocks({ io, tickers: ["SPY"], apiKey: KEY, transport: fake.transport, timings: { ...TIMINGS, pace: 1 }, log });
    running.push(stocks);
    stocks.watch("a");
    const res = await request(app(stocks)).get("/api/stocks/spy");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body).toMatchObject({
      symbol: "SPY",
      pending: [],
      failed: [],
      company: { name: "Apple Inc", exchange: "Nasdaq" },
      metrics: { pe: 36.4 },
      ratings: { buy: 23 },
      news: [{ headline: "A new Mac, sooner than thought" }, { headline: "Apple's services grow again" }],
    });
    expect(JSON.stringify(res.body)).not.toContain(KEY);
    for (const other of ["QQQ", "SPY%2F..", "%20", "a".repeat(40)]) {
      const no = await request(app(stocks)).get(`/api/stocks/${other}`);
      expect(no.status, other).toBe(404);
      expect(no.headers["cache-control"]).toBe("no-store");
    }
    expect(fake.calls.every((c) => c.symbol === undefined || c.symbol === "SPY")).toBe(true);
  });
});
