/**
 * The Stocks page's figures (0.179.0): what GET /api/stocks and the socket's
 * `stocks` carry (stocks.js), and how a card says them — and a ticker's
 * detail (0.180.0, GET /api/stocks/<symbol>), for the drawer a card opens.
 */

/** One ticker: null figures until Finnhub has said, or for one it doesn't know. */
export interface StockQuote {
  symbol: string;
  price: number | null;
  previousClose: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  /** Against the previous close. */
  change: number | null;
  changePercent: number | null;
  /** When the price was, in ms. */
  at: number | null;
}

/** The US market, as Finnhub's market status says. */
export interface StockMarket {
  /** "pre-market", "regular", "post-market" — or null, shut. */
  session: string | null;
  isOpen: boolean | null;
  /** The holiday's name, on a day the market is shut for one. */
  holiday: string | null;
}

/**
 * `live`: Finnhub's trades socket is open. `delayed`: it isn't, and the
 * quotes are asked for every few seconds. `connecting`: neither has said
 * anything yet. `error`: Finnhub refused the key.
 */
export type StocksStatus = "connecting" | "live" | "delayed" | "error";

export interface Stocks {
  status: StocksStatus;
  /** What Finnhub said when it refused the key. */
  error: string | null;
  market: StockMarket;
  quotes: StockQuote[];
}

/** The parts of a ticker's detail (0.180.0), as GET /api/stocks/<symbol> names them. */
export type DetailPart = "company" | "metrics" | "ratings" | "news";

/** Finnhub's company profile: nothing of it for an ETF. */
export interface StockCompany {
  name: string;
  industry: string | null;
  exchange: string | null;
  /** In dollars. */
  marketValue: number | null;
  /** On Finnhub's own static host (stocks.js keeps no other). */
  logo: string | null;
}

/** The key numbers, each null where Finnhub gives none. */
export interface StockMetrics {
  week52High: number | null;
  week52Low: number | null;
  pe: number | null;
  eps: number | null;
  /** A percentage. */
  dividendYield: number | null;
  beta: number | null;
  /** Shares a day. */
  averageVolume: number | null;
}

/** The analysts' ratings in the newest month Finnhub has. */
export interface StockRatings {
  /** The month, as "2026-11-01". */
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface StockHeadline {
  headline: string;
  source: string | null;
  /** When, in ms. */
  at: number;
  /** The article, where its address is https. */
  url: string | null;
}

/**
 * One ticker's detail, for the drawer its card opens (StockDialog). A part is
 * null where Finnhub has none; `pending` names the parts still on their way,
 * `failed` those Finnhub didn't answer for.
 */
export interface StockDetail {
  symbol: string;
  pending: DetailPart[];
  failed: DetailPart[];
  company: StockCompany | null;
  metrics: StockMetrics | null;
  ratings: StockRatings | null;
  news: StockHeadline[] | null;
}

/** What a part of the detail is, for its section: on its way, unanswered, there, or nothing. */
export type PartState = "pending" | "failed" | "ready" | "none";

/** A part's state, from the answer — or, before any answer, from the asking's own. */
export function partState(
  detail: StockDetail | undefined,
  part: DetailPart,
  asking: "pending" | "failed",
): PartState {
  if (!detail) return asking;
  if (detail.pending.includes(part)) return "pending";
  if (detail.failed.includes(part)) return "failed";
  return detail[part] == null ? "none" : "ready";
}

/**
 * An upright screen wider than a phone's — the frame, a tablet held upright:
 * where a handful of tickers are a card a row, sharing the page's height
 * (StocksList, StockCard).
 */
export const UPRIGHT_WIDE = "@media (orientation: portrait) and (min-width: 48em)";

/** Up to this many tickers are rows there; more are a grid there too. */
export const ROWS_MAX = 6;

const MINUS = "−";

const PRICE = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
// A share under a dollar shows its fractions of a cent.
const SMALL_PRICE = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

/** "717.42", "1,204.50" — or "—" for none. */
export function fmtPrice(price: number | null | undefined): string {
  if (price == null || !Number.isFinite(price)) return "—";
  return (Math.abs(price) < 1 ? SMALL_PRICE : PRICE).format(price);
}

/** "+4.18", "−2.35", "0.00" — to the cent, the sign always said, a true minus. */
export function fmtChange(change: number | null | undefined): string {
  if (change == null || !Number.isFinite(change)) return "—";
  const text = PRICE.format(Math.abs(change));
  if (text === "0.00") return text;
  return `${change > 0 ? "+" : MINUS}${text}`;
}

/** "+0.59%", "−0.36%", "0.00%". */
export function fmtPercent(percent: number | null | undefined): string {
  if (percent == null || !Number.isFinite(percent)) return "—";
  const text = Math.abs(percent).toFixed(2);
  if (text === "0.00") return "0.00%";
  return `${percent > 0 ? "+" : MINUS}${text}%`;
}

const ONE = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const WHOLE = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const UNITS = [
  [1e12, "T"],
  [1e9, "B"],
  [1e6, "M"],
  [1e3, "K"],
] as const;

/** A large figure in its largest unit — "T", "B", "M", "K" — two decimals under ten of it, one above. */
function inUnits(value: number): string {
  for (const [size, unit] of UNITS) {
    if (Math.abs(value) < size) continue;
    const n = value / size;
    return `${(Math.abs(n) < 10 ? PRICE : ONE).format(n)}${unit}`;
  }
  return WHOLE.format(value);
}

/** A company's market value: "$3.98T", "$845.3B", "$12.4M" — or "—". */
export function fmtMarketValue(dollars: number | null | undefined): string {
  if (dollars == null || !Number.isFinite(dollars) || dollars <= 0) return "—";
  return `$${inUnits(dollars)}`;
}

/** Shares a day: "48.3M", "1.20B", "850.0K" — or "—". */
export function fmtVolume(shares: number | null | undefined): string {
  if (shares == null || !Number.isFinite(shares) || shares <= 0) return "—";
  return inUnits(shares);
}

/** A ratio to two places — a P/E, a beta: "35.98", "1.29". */
export function fmtRatio(ratio: number | null | undefined): string {
  if (ratio == null || !Number.isFinite(ratio)) return "—";
  return PRICE.format(ratio);
}

/** Earnings per share, in dollars, a loss with a true minus: "$7.46", "−$1.50". */
export function fmtEarnings(eps: number | null | undefined): string {
  if (eps == null || !Number.isFinite(eps)) return "—";
  return `${eps < 0 ? MINUS : ""}$${PRICE.format(Math.abs(eps))}`;
}

/** A dividend's yield, already a percentage: "0.39%". */
export function fmtYield(percent: number | null | undefined): string {
  if (percent == null || !Number.isFinite(percent)) return "—";
  return `${PRICE.format(percent)}%`;
}

/** The analysts' ratings, from the keenest to buy to the keenest to sell: the bar's order. */
export const RATING_KEYS = ["strongBuy", "buy", "hold", "sell", "strongSell"] as const;
export type RatingKey = (typeof RATING_KEYS)[number];

export const RATING_LABEL: Record<RatingKey, string> = {
  strongBuy: "Strong buy",
  buy: "Buy",
  hold: "Hold",
  sell: "Sell",
  strongSell: "Strong sell",
};

/**
 * The ratings' colours: a diverging scale — two steps of blue to buy, two of
 * red to sell, gray between — each mode its own steps, the strong end the
 * one that stands out from the well: the darker by day, the brighter by
 * night (the dataviz skill's validator, against the wells' floor: every pair
 * apart for red-green colour-blind eyes too, ΔE 9.5 at worst in either
 * mode). Not the page's green and red: a green and a red of like lightness
 * measured 1.1 apart for a deuteranope — the buys and the sells one colour.
 * The quieter steps are under 3:1 against the well, which the validator
 * allows only with the values in words: the legend names each rating with
 * its count, so no reading rests on colour alone.
 */
export const RATING_COLOR: Record<RatingKey, { base: string; _dark: string }> = {
  strongBuy: { base: "blue.600", _dark: "blue.400" },
  buy: { base: "blue.400", _dark: "blue.600" },
  hold: { base: "gray.500", _dark: "gray.500" },
  sell: { base: "red.400", _dark: "red.700" },
  strongSell: { base: "red.700", _dark: "red.400" },
};

/** How many analysts there are, and each rating's count and share of them, in the bar's order. */
export function ratingsShares(ratings: StockRatings): {
  total: number;
  parts: { key: RatingKey; count: number; share: number }[];
} {
  const count = (key: RatingKey) => Math.max(0, ratings[key] || 0);
  const total = RATING_KEYS.reduce((sum, key) => sum + count(key), 0);
  return {
    total,
    parts: RATING_KEYS.map((key) => ({ key, count: count(key), share: total > 0 ? count(key) / total : 0 })),
  };
}

const MONTH = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

/** A ratings' month in words: "2026-11-01" is "November 2026". */
export function ratingsMonth(period: string): string {
  const at = Date.parse(`${period}T00:00:00Z`);
  return Number.isFinite(at) ? MONTH.format(at) : "";
}

const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/** How long ago a headline was: "Just now", "25m ago", "3h ago", "2d ago" — a date past a week. */
export function timeAgo(at: number, now: number): string {
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return DAY.format(at);
}

export type Direction = "up" | "down" | "flat";

/** The day's way, by the change as it would be shown (a hundredth). */
export function direction(change: number | null | undefined): Direction {
  if (change == null || Math.abs(change) < 0.005) return "flat";
  return change > 0 ? "up" : "down";
}

/** A direction's colour: green up, red down, the text's own flat. */
export const DIRECTION_COLOR: Record<Direction, string> = {
  up: "fg.success",
  down: "fg.error",
  flat: "fg.muted",
};

/**
 * Where the price lies in the day's range, 0 at the low to 1 at the high —
 * held to the range (a trade can run ahead of the quote's high) and the
 * middle when the range is a single price. Null without the three.
 */
export function dayRangeShare(
  low: number | null | undefined,
  high: number | null | undefined,
  price: number | null | undefined,
): number | null {
  if (low == null || high == null || price == null) return null;
  if (high <= low) return 0.5;
  return Math.min(1, Math.max(0, (price - low) / (high - low)));
}

/** Which way a shown price moved: what its flash says. Null when it didn't. */
export function priceMove(
  before: number | null | undefined,
  after: number | null | undefined,
): "up" | "down" | null {
  if (before == null || after == null || before === after) return null;
  return after > before ? "up" : "down";
}

/** The market's session in words, with its badge's palette. */
export function sessionLabel(market: StockMarket | undefined): {
  label: string;
  palette: "green" | "orange" | "purple" | "gray";
  session: "regular" | "pre" | "post" | "closed";
} {
  if (market?.holiday) return { label: "Closed", palette: "gray", session: "closed" };
  switch (market?.session) {
    case "regular":
      return { label: "Market open", palette: "green", session: "regular" };
    case "pre-market":
      return { label: "Pre-market", palette: "orange", session: "pre" };
    case "post-market":
      return { label: "After hours", palette: "purple", session: "post" };
    default:
      // A word Finnhub hasn't used before: open is open.
      return market?.isOpen
        ? { label: "Market open", palette: "green", session: "regular" }
        : { label: "Closed", palette: "gray", session: "closed" };
  }
}
