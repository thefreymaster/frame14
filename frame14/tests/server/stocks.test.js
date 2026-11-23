import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ERROR_MAX,
  REGULAR,
  STOCKS_ROOM,
  TIMINGS,
  capWords,
  changeOf,
  finnhubTransport,
  inRegularHours,
  isSale,
  quoteFrom,
  startStocks,
  timingsFromEnv,
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

/** A Finnhub in memory: its calls, its sockets, and answers a test can change. */
function fakeFinnhub() {
  const fake = {
    quotes: structuredClone(QUOTES),
    market: { exchange: "US", holiday: null, isOpen: true, session: REGULAR, timezone: "America/New_York", t: AT },
    calls: [],
    sockets: [],
    /** Statuses the next calls answer with, in turn (401, 429, …). */
    statuses: [],
    /** Set: every call waits for this promise. */
    hold: null,
    transport: {
      async get(path, params) {
        fake.calls.push({ path, ...params, at: Date.now() });
        if (fake.hold) await fake.hold;
        const status = fake.statuses.shift();
        if (status === 401) return { status, body: { error: "Invalid API key." } };
        if (status) return { status, body: { error: "no" } };
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
  });
});
