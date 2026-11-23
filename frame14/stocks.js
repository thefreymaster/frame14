/**
 * The Stocks page's prices (0.179.0), from Finnhub with the add-on's
 * `finnhub_api_key`, for the tickers in `stock_tickers` (entities.js).
 *
 * Two ways in, as Finnhub offers them:
 *
 *   - its trades WebSocket — every US trade as it happens — which sets a
 *     card's price while the market is in its regular session;
 *   - its REST `/quote`, the baseline (previous close, open, high, low) and
 *     the price outside the regular session — and the fallback: while the
 *     socket is refused or silent the quotes are asked for every few seconds
 *     instead of every minute, and the page says "Delayed".
 *
 * Only while someone watches (a page on /stocks emits `stocks:watch`): the
 * socket opens on the first watcher and closes TIMINGS.idle after the last
 * one leaves — SPY alone trades hundreds of times a second, and a key has one
 * socket — and the quotes are asked for again on every first watch and every
 * (re)connect, replacing what was held. What changed goes to the watchers'
 * room at most once every TIMINGS.emit.
 *
 * The rule for a price: the newest wins. A trade counts only in the regular
 * session (market-status says so and the trade's time is within 9:30–16:00
 * New York) and only when it is a sale as the tape counts one (`isSale`: not
 * an odd lot, an average price, a late print — Finnhub's condition codes) —
 * outside it the card shows the quote's own price and change, as Finnhub
 * works them out.
 *
 * Written against Finnhub's documentation — its API spec, its trades page and
 * the conditions list that page links — not against captured answers. The key goes to Finnhub alone: in a header for REST
 * (the socket can only take it in its address), never into a snapshot or a
 * log line.
 */
import WebSocket from "ws";
import { FINNHUB_API_KEY } from "./config.js";
import { ENTITIES } from "./entities.js";

/** The Socket.IO room of the pages on /stocks. */
export const STOCKS_ROOM = "stocks";

/** Set up: a key, and a ticker to ask it for. */
export const STOCKS_ENABLED =
  Boolean(FINNHUB_API_KEY) && (ENTITIES.stocks?.length ?? 0) > 0;

export const FINNHUB_API = "https://finnhub.io/api/v1";
export const FINNHUB_WS = "wss://ws.finnhub.io";

/** What market-status calls the regular session. */
export const REGULAR = "regular";

export const TIMINGS = {
  /** Between REST calls: Finnhub's free tier takes 60 a minute. */
  pace: 1200,
  /** After a 429, before the next call. */
  rateLimit: 30_000,
  /** The quotes again, while the socket brings the trades. */
  livePoll: 60_000,
  /** The quotes again while it doesn't — or every ticker once round the pace. */
  delayedPoll: 5_000,
  /** The market's session again. */
  market: 60_000,
  /** At most one push to the pages in this long. */
  emit: 1000,
  /** The socket closes this long after the last page leaves. */
  idle: 60_000,
  /** A socket that has said nothing this long in the regular session is opened again. */
  silent: 60_000,
  /** A socket's opening handshake unanswered this long is given up and tried again. */
  handshake: 10_000,
  /** The first wait before opening a dropped or refused socket again; doubled each time. */
  backoff: 60_000,
  backoffMax: 600_000,
  /** A GET asks for the quotes again once they're this old… */
  fresh: 60_000,
  /** …and waits this long for them at most. */
  wait: 5_000,
};

/** Finnhub's words about a refusal, at most this long. */
export const ERROR_MAX = 200;

/**
 * The timings, with any FRAME14_STOCKS_TIMINGS overrides (a JSON object of
 * them in ms — the end-to-end tests shorten the pace and the idle close).
 */
export function timingsFromEnv(env = process.env) {
  const raw = env.FRAME14_STOCKS_TIMINGS;
  if (!raw) return { ...TIMINGS };
  let given;
  try {
    given = JSON.parse(raw);
  } catch {
    console.warn("[stocks] FRAME14_STOCKS_TIMINGS isn't JSON — ignored");
    return { ...TIMINGS };
  }
  const out = { ...TIMINGS };
  for (const key of Object.keys(TIMINGS)) {
    const v = Number(given?.[key]);
    if (Number.isFinite(v) && v >= 0) out[key] = v;
  }
  return out;
}

/** Words from outside, held to a line: no control characters, ERROR_MAX at most. */
export function capWords(words) {
  return String(words ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim()
    .slice(0, ERROR_MAX);
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const maxOf = (a, b) => (a == null ? b : b == null ? a : Math.max(a, b));
const minOf = (a, b) => (a == null ? b : b == null ? a : Math.min(a, b));

/** The day's change of `price` against the previous close. */
export function changeOf(price, previousClose) {
  if (price == null || !previousClose) return { change: null, changePercent: null };
  const change = price - previousClose;
  return { change, changePercent: (change / previousClose) * 100 };
}

const NEW_YORK = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

/** Whether `ms` falls in the US markets' regular hours, 9:30–16:00 New York, Monday to Friday. */
export function inRegularHours(ms) {
  const parts = Object.fromEntries(NEW_YORK.formatToParts(ms).map((p) => [p.type, p.value]));
  if (parts.weekday === "Sat" || parts.weekday === "Sun") return false;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60;
}

/**
 * Finnhub's trade conditions, by its documented list's codes ("Consolidated
 * Processing", the column "Update Last"), under which the tape doesn't take a
 * trade for the last price: an average-price trade, a cash sale, a price
 * variation, a cap election, an odd lot, a market centre's official close, a
 * next-day trade, its official open, a seller's, Form T, extended hours sold
 * out of sequence, a contingent trade and a qualified one.
 */
const NEVER_LAST = new Set([3, 5, 10, 11, 12, 16, 17, 20, 22, 24, 25, 26, 37]);
/**
 * …and those it takes only where there is no last price yet (the list's notes
 * #1–#4: bunched sold, sold last, a market centre's opening trade, a prior
 * reference price, sold out of sequence, derivatively priced). Never so here:
 * a trade is applied only over a quote's price. What one adds to the day's
 * range comes with the next quote.
 */
const LAST_IF_NONE = new Set([9, 15, 18, 21, 30, 32]);

/**
 * Whether a trade's conditions (`c`, a list of codes) make it a sale that
 * sets the last price: none of them says it doesn't. A code the list gives no
 * rule for, one not in it, and a trade that names none are all sales.
 */
export function isSale(conditions) {
  if (!Array.isArray(conditions)) return true;
  return !conditions.some((c) => {
    const code = Number(c);
    return NEVER_LAST.has(code) || LAST_IF_NONE.has(code);
  });
}

/** A ticker with nothing from Finnhub yet (or a symbol it doesn't know). */
function noQuote(symbol) {
  return {
    symbol,
    price: null,
    previousClose: null,
    open: null,
    high: null,
    low: null,
    change: null,
    changePercent: null,
    at: null,
  };
}

/** Finnhub's `/quote` as a card's figures; a price of 0 is no quote. */
export function quoteFrom(symbol, q) {
  const price = num(q?.c);
  if (!price) return noQuote(symbol);
  const previousClose = num(q.pc) || null;
  const worked = changeOf(price, previousClose);
  return {
    symbol,
    price,
    previousClose,
    open: num(q.o) || null,
    high: num(q.h) || null,
    low: num(q.l) || null,
    change: num(q.d) ?? worked.change,
    changePercent: num(q.dp) ?? worked.changePercent,
    // Seconds in a quote; milliseconds in a trade.
    at: num(q.t) ? q.t * 1000 : null,
  };
}

/** Finnhub over the network: REST with the key in a header, and its socket. */
export function finnhubTransport({ apiUrl, wsUrl, apiKey, handshakeTimeout = TIMINGS.handshake }) {
  return {
    async get(path, params = {}) {
      const url = new URL(`${apiUrl.replace(/\/+$/, "")}${path}`);
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
      const res = await fetch(url, {
        headers: { "X-Finnhub-Token": apiKey },
        signal: AbortSignal.timeout(10_000),
      });
      let body = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      return { status: res.status, body };
    },
    connect({ onOpen, onMessage, onError, onClose }) {
      let ws;
      try {
        const url = new URL(wsUrl);
        url.searchParams.set("token", apiKey);
        // Without a timeout a handshake nobody answers waits for ever, and
        // the socket is neither open nor closed: given up, it is closed.
        ws = new WebSocket(url, { handshakeTimeout });
      } catch (err) {
        queueMicrotask(() => {
          onError(err);
          onClose();
        });
        return { send() {}, close() {} };
      }
      // Before anything can fail: an unheard 'error' would end the process.
      ws.on("error", (err) => onError(err));
      ws.on("open", () => onOpen());
      ws.on("message", (raw) => {
        let msg;
        try {
          msg = JSON.parse(String(raw));
        } catch {
          return;
        }
        onMessage(msg);
      });
      ws.on("close", () => onClose());
      return {
        send(msg) {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
        },
        close() {
          // Opening, too: that comes back as an 'error' and a 'close', both heard.
          try {
            ws.terminate();
          } catch {
            // already gone
          }
        },
      };
    },
  };
}

export function startStocks({
  io,
  tickers,
  apiKey = FINNHUB_API_KEY,
  transport,
  timings = timingsFromEnv(),
  log = console,
}) {
  const t = { ...TIMINGS, ...timings };
  const net =
    transport ??
    finnhubTransport({
      apiUrl: process.env.FRAME14_FINNHUB_URL || FINNHUB_API,
      wsUrl: process.env.FRAME14_FINNHUB_WS_URL || FINNHUB_WS,
      apiKey,
      handshakeTimeout: t.handshake,
    });

  const quotes = new Map();
  let market = { session: null, isOpen: null, holiday: null };
  /** Finnhub's words when it refused the key: the page's error. */
  let refused = null;
  let stopped = false;

  const watchers = new Set();
  /** The socket while it is open or opening. */
  let upstream = null;
  let socketOpen = false;
  /** The socket was refused, dropped or went quiet: quotes by polling. */
  let socketTrouble = false;
  let socketError = null;
  let lastMessage = 0;
  let backoff = t.backoff;

  let reconnectTimer = null;
  let idleTimer = null;
  let quoteTimer = null;
  let marketTimer = null;
  let silentTimer = null;
  let emitTimer = null;
  let lastEmit = 0;
  /** When the quotes were last all asked for. */
  let quotesAt = 0;
  /**
   * Symbols whose next quote replaces what's held — a newer price from a
   * trade too, unless that trade came on the socket open now.
   */
  const replaceNext = new Set();
  /** Each socket opened is the next number; a trade's price is the socket's it came on. */
  let connection = 0;
  const tradedOn = new Map();

  function status() {
    if (refused) return "error";
    if (socketOpen) return "live";
    if (socketTrouble) return "delayed";
    return "connecting";
  }

  function snapshot() {
    return {
      status: status(),
      error: refused,
      market: { ...market },
      quotes: tickers.map((symbol) => ({ ...(quotes.get(symbol) ?? noQuote(symbol)) })),
    };
  }

  function changed() {
    if (stopped || watchers.size === 0 || emitTimer) return;
    // On a timer even when it's due now: a burst of trades goes out as one.
    emitTimer = setTimeout(() => {
      emitTimer = null;
      lastEmit = Date.now();
      io.to(STOCKS_ROOM).emit("stocks", snapshot());
    }, Math.max(0, lastEmit + t.emit - Date.now()));
  }

  // ── REST: one queue, a call at a time, `pace` apart ────────────────────────

  const jobs = [];
  const pending = new Map();
  let pumping = false;
  let pauseUntil = 0;

  function enqueue(key, run) {
    const have = pending.get(key);
    if (have) return have.done;
    let resolve;
    const done = new Promise((r) => (resolve = r));
    const job = { key, run, done, resolve };
    pending.set(key, job);
    jobs.push(job);
    void pump();
    return done;
  }

  function dropJobs() {
    for (const job of jobs.splice(0)) job.resolve();
    pending.clear();
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function pump() {
    if (pumping) return;
    pumping = true;
    try {
      while (jobs.length && !stopped) {
        const wait = pauseUntil - Date.now();
        if (wait > 0) await sleep(wait);
        if (stopped || !jobs.length) break;
        const job = jobs[0];
        let again = false;
        try {
          again = (await job.run()) === "again";
        } catch (err) {
          log.warn(`[stocks] ${job.key}: ${err.message}`);
        }
        // A 429 asks for the same call again once the wait is over.
        if (again && jobs[0] === job) continue;
        if (jobs[0] === job) jobs.shift();
        pending.delete(job.key);
        job.resolve();
        pauseUntil = Math.max(pauseUntil, Date.now() + t.pace);
      }
    } finally {
      pumping = false;
    }
  }

  /** One REST call: the body, or null — and "again" for a rate limit. */
  async function call(path, params) {
    if (refused) return null;
    let res;
    try {
      res = await net.get(path, params);
    } catch (err) {
      log.warn(`[stocks] ${path}: ${err.message}`);
      return null;
    }
    if (res.status === 429) {
      pauseUntil = Date.now() + t.rateLimit;
      log.warn(`[stocks] Finnhub's rate limit: waiting ${t.rateLimit / 1000}s`);
      return "again";
    }
    if (res.status === 401 || res.status === 403) {
      refuse(res.body?.error ?? res.body?.message ?? `Finnhub refused the key (HTTP ${res.status})`);
      return null;
    }
    if (res.status !== 200 || !res.body || typeof res.body !== "object") {
      log.warn(`[stocks] ${path}: HTTP ${res.status}`);
      return null;
    }
    return res.body;
  }

  function refuse(words) {
    refused = capWords(words) || "Finnhub refused the key";
    log.warn(`[stocks] Finnhub refused the key: ${refused}`);
    dropJobs();
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    closeUpstream();
    changed();
  }

  function fetchMarket() {
    return enqueue("market", async () => {
      const m = await call("/stock/market-status", { exchange: "US" });
      if (m === "again") return "again";
      if (!m) return;
      const next = {
        session: typeof m.session === "string" ? m.session : null,
        isOpen: typeof m.isOpen === "boolean" ? m.isOpen : null,
        holiday: typeof m.holiday === "string" && m.holiday ? m.holiday : null,
      };
      if (JSON.stringify(next) === JSON.stringify(market)) return;
      market = next;
      changed();
    });
  }

  function fetchQuote(symbol) {
    return enqueue(`quote:${symbol}`, async () => {
      const q = await call("/quote", { symbol });
      if (q === "again") return "again";
      if (!q) return;
      applyQuote(symbol, q);
    });
  }

  function applyQuote(symbol, q) {
    const next = quoteFrom(symbol, q);
    // A quote that doesn't say when it was (Finnhub's sample has `t`, its
    // spec doesn't list it) is as of its arrival — or, older than any trade,
    // it would never be the price again once one was held.
    if (next.price != null && next.at == null) next.at = Date.now();
    // What's held is replaced — but not a trade heard on the socket open now,
    // which is newer than any quote asked for as it opened.
    const replace =
      replaceNext.delete(symbol) && !(socketOpen && tradedOn.get(symbol) === connection);
    const held = quotes.get(symbol);
    // A trade newer than the quote, on the same day: its price stands.
    if (
      !replace &&
      held?.price != null &&
      next.price != null &&
      held.at != null &&
      (next.at == null || held.at > next.at) &&
      held.previousClose === next.previousClose
    ) {
      next.price = held.price;
      next.at = held.at;
      next.high = maxOf(next.high, held.high);
      next.low = minOf(next.low, held.low);
      Object.assign(next, changeOf(next.price, next.previousClose));
    }
    if (JSON.stringify(next) === JSON.stringify(held)) return;
    quotes.set(symbol, next);
    changed();
  }

  /** Every ticker's quote; `replace` puts them in place of what's held. */
  function refreshQuotes({ replace = false } = {}) {
    if (replace) for (const s of tickers) replaceNext.add(s);
    return Promise.all(tickers.map(fetchQuote)).then(() => {
      quotesAt = Date.now();
    });
  }

  // ── The socket ─────────────────────────────────────────────────────────────

  function regularAt(ms) {
    return market.session === REGULAR && inRegularHours(ms);
  }

  function applyTrade(trade) {
    const symbol = trade?.s;
    const price = num(trade?.p);
    const at = num(trade?.t);
    const held = quotes.get(symbol);
    if (!held || held.price == null || price == null || price <= 0 || at == null) return;
    if (at <= (held.at ?? 0) || !regularAt(at) || !isSale(trade.c)) return;
    quotes.set(symbol, {
      ...held,
      price,
      at,
      high: maxOf(held.high, price),
      low: minOf(held.low, price),
      ...changeOf(price, held.previousClose),
    });
    tradedOn.set(symbol, connection);
    changed();
  }

  function connect() {
    if (stopped || upstream || refused || watchers.size === 0) return;
    socketError = null;
    connection += 1;
    const conn = net.connect({
      onOpen() {
        if (upstream !== conn) return;
        socketOpen = true;
        socketTrouble = false;
        lastMessage = Date.now();
        for (const symbol of tickers) conn.send({ type: "subscribe", symbol });
        log.log(`[stocks] Finnhub's stream: ${tickers.length} tickers`);
        // What came in while it was down: the quotes again, as they are.
        void refreshQuotes({ replace: true });
        schedulePolls();
        armSilent();
        changed();
      },
      onMessage(msg) {
        if (upstream !== conn) return;
        lastMessage = Date.now();
        if (msg?.type === "trade" && Array.isArray(msg.data)) {
          backoff = t.backoff;
          for (const trade of msg.data) applyTrade(trade);
        } else if (msg?.type === "error") {
          socketError = capWords(msg.msg ?? msg.message ?? "an error");
          dropUpstream();
        }
      },
      onError(err) {
        if (upstream !== conn) return;
        socketError = capWords(err?.message);
      },
      onClose() {
        if (upstream !== conn) return;
        dropUpstream();
      },
    });
    upstream = conn;
  }

  /** The socket went (refused, dropped, quiet): poll, and open it again later. */
  function dropUpstream() {
    const conn = upstream;
    upstream = null;
    socketOpen = false;
    clearTimeout(silentTimer);
    silentTimer = null;
    conn?.close();
    if (stopped || refused || watchers.size === 0) {
      changed();
      return;
    }
    socketTrouble = true;
    log.warn(
      `[stocks] Finnhub's stream went${socketError ? ` (${socketError})` : ""} — polling; again in ${Math.round(backoff / 1000)}s`,
    );
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, backoff);
    backoff = Math.min(backoff * 2, t.backoffMax);
    schedulePolls();
    changed();
  }

  /** Closed on purpose: nobody is watching, or the key was refused. */
  function closeUpstream() {
    const conn = upstream;
    upstream = null;
    socketOpen = false;
    clearTimeout(silentTimer);
    silentTimer = null;
    conn?.close();
  }

  function armSilent() {
    clearTimeout(silentTimer);
    silentTimer = setTimeout(() => {
      silentTimer = null;
      if (!socketOpen) return;
      const now = Date.now();
      if (now - lastMessage >= t.silent && regularAt(now)) {
        socketError = `nothing for ${Math.round(t.silent / 1000)}s`;
        dropUpstream();
        return;
      }
      armSilent();
    }, Math.max(1000, t.silent / 4));
  }

  // ── Polling while watched ──────────────────────────────────────────────────

  function schedulePolls() {
    clearTimeout(quoteTimer);
    quoteTimer = null;
    if (stopped || watchers.size === 0) return;
    const every = socketOpen
      ? t.livePoll
      : Math.max(t.delayedPoll, tickers.length * t.pace);
    quoteTimer = setTimeout(() => {
      quoteTimer = null;
      void refreshQuotes();
      schedulePolls();
    }, every);
  }

  function scheduleMarket() {
    clearTimeout(marketTimer);
    marketTimer = null;
    if (stopped || watchers.size === 0) return;
    marketTimer = setTimeout(() => {
      marketTimer = null;
      void fetchMarket();
      scheduleMarket();
    }, t.market);
  }

  /** Everything asked for again: the market, then every quote in place of what's held. */
  function startOver() {
    void fetchMarket();
    return refreshQuotes({ replace: true });
  }

  return {
    snapshot,

    /** A page on /stocks (idempotent per socket id). */
    watch(id) {
      if (stopped) return;
      const first = watchers.size === 0;
      const wasRefused = refused != null;
      watchers.add(id);
      // After a refusal a new page tries again at once: the key may be fixed.
      if (wasRefused) refused = null;
      if (!first && !wasRefused) return;
      clearTimeout(idleTimer);
      idleTimer = null;
      void startOver();
      schedulePolls();
      scheduleMarket();
      if (!upstream && !reconnectTimer) connect();
      changed();
    },

    unwatch(id) {
      if (!watchers.delete(id) || watchers.size > 0) return;
      clearTimeout(quoteTimer);
      clearTimeout(marketTimer);
      quoteTimer = marketTimer = null;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        idleTimer = null;
        if (watchers.size > 0) return;
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
        closeUpstream();
        socketTrouble = false;
        backoff = t.backoff;
      }, t.idle);
    },

    /**
     * The snapshot for GET /api/stocks: quotes older than `fresh` asked for
     * first, waiting `wait` at most (a fetch already on its way is shared).
     * After a refusal, asked for again at once.
     */
    async ready() {
      if (stopped) return snapshot();
      const wasRefused = refused != null;
      if (wasRefused) refused = null;
      if (!wasRefused && Date.now() - quotesAt < t.fresh) return snapshot();
      let timer;
      await Promise.race([
        startOver(),
        new Promise((r) => {
          timer = setTimeout(r, t.wait);
        }),
      ]);
      clearTimeout(timer);
      // The refusal closed the socket; pages still on /stocks want it back.
      if (wasRefused && !refused && watchers.size > 0 && !upstream && !reconnectTimer) connect();
      return snapshot();
    },

    stop() {
      stopped = true;
      for (const timer of [reconnectTimer, idleTimer, quoteTimer, marketTimer, silentTimer, emitTimer]) {
        clearTimeout(timer);
      }
      closeUpstream();
      dropJobs();
    },
  };
}
