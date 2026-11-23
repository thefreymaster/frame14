/**
 * The Stocks page's figures (0.179.0): what GET /api/stocks and the socket's
 * `stocks` carry (stocks.js), and how a card says them.
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
