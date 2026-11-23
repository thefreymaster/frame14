import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StockCard } from "../../src/components/StockCard";
import { StockDetailPanels } from "../../src/components/StockDetailPanels";
import { BoardFrame } from "../../src/lib/boardFrame";
import {
  RATING_KEYS,
  fmtEarnings,
  fmtMarketValue,
  fmtRatio,
  fmtVolume,
  fmtYield,
  partState,
  ratingsMonth,
  ratingsShares,
  timeAgo,
  type StockDetail,
  type StockQuote,
} from "../../src/lib/stocks";
import { renderWithProviders } from "./helpers/render";

// A ticker's drawer (0.180.0): what a tap on its card opens, and how its
// parts are said. The detail is the server's (GET /api/stocks/<symbol>); here
// the hook that asks for it is a made-up answer.

const hook = vi.hoisted(() => ({ data: undefined as unknown, isError: false }));
vi.mock("../../src/hooks/useStockDetail", () => ({
  useStockDetail: () => hook,
}));

const NOW = new Date("2026-11-23T17:00:00Z").getTime();

const AAPL: StockQuote = {
  symbol: "AAPL",
  price: 268.4,
  previousClose: 266.48,
  open: 266.1,
  high: 269.87,
  low: 265.3,
  change: 1.92,
  changePercent: 0.7205,
  at: 1,
};

const DETAIL: StockDetail = {
  symbol: "AAPL",
  pending: [],
  failed: [],
  company: {
    name: "Apple Inc",
    industry: "Technology",
    exchange: "Nasdaq",
    marketValue: 3_982_650_400_000,
    logo: "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/AAPL.png",
  },
  metrics: { week52High: 277.32, week52Low: 169.21, pe: 35.98, eps: 7.46, dividendYield: 0.39, beta: 1.29, averageVolume: 48_250_000 },
  ratings: { period: "2026-11-01", strongBuy: 15, buy: 23, hold: 14, sell: 2, strongSell: 1 },
  news: [
    { headline: "Apple's services revenue sets another record", source: "Example Wire", at: NOW - 25 * 60_000, url: "https://example.com/a" },
    { headline: "A headline with no address to go to", source: null, at: NOW - 3 * 3_600_000, url: null },
  ],
};

function drawer(detail: StockDetail | undefined, isError = false) {
  hook.data = detail;
  hook.isError = isError;
  const view = renderWithProviders(
    <BoardFrame.Provider value="panel">
      <StockDetailPanels quote={AAPL} />
    </BoardFrame.Provider>,
  );
  const part = (name: string) => view.container.querySelector<HTMLElement>(`[data-stock-part="${name}"]`);
  return { ...view, part };
}

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  delete (window as { fully?: unknown }).fully;
});

describe("a card on the Stocks page", () => {
  it("is one button that opens its ticker's drawer, by a click and from the keyboard", () => {
    const onOpen = vi.fn();
    const { getByRole } = renderWithProviders(<StockCard quote={AAPL} onOpen={onOpen} />);
    const card = getByRole("button", { name: "Show AAPL detail" });
    fireEvent.click(card);
    expect(onOpen).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(card, { key: "Enter" });
    fireEvent.keyDown(card, { key: " " });
    expect(onOpen).toHaveBeenCalledTimes(3);
  });

  it("is no button without something to open — as in the drawer, where it is the Today section", () => {
    const { queryByRole, getByText, container } = renderWithProviders(
      <BoardFrame.Provider value="panel">
        <StockCard quote={AAPL} heading="Today" onOpen={() => {}} />
      </BoardFrame.Provider>,
    );
    expect(queryByRole("button")).toBeNull();
    expect(getByText("Today")).toBeInTheDocument();
    // The card's own figures, under the heading in place of the ticker.
    expect(container.querySelector("[data-stock-price]")).toHaveTextContent("268.40");
    expect(container.querySelector("[data-board-panel]")).not.toBeNull();
    expect(renderWithProviders(<StockCard quote={AAPL} />).queryByRole("button")).toBeNull();
  });
});

describe("a ticker's drawer", () => {
  it("has today's figures, the company, the key numbers, the ratings and the news", () => {
    const { getByText, part, container } = drawer(DETAIL);
    expect(getByText("Today")).toBeInTheDocument();
    expect(container.querySelector("[data-stock-price]")).toHaveTextContent("268.40");

    expect(part("company")).toHaveAttribute("data-part-state", "ready");
    expect(getByText("Apple Inc")).toBeInTheDocument();
    expect(getByText("Technology · Nasdaq")).toBeInTheDocument();
    expect(container.querySelector('[data-stock-stat="market-value"]')).toHaveTextContent("$3.98T");
    const logo = container.querySelector<HTMLImageElement>("[data-stock-logo]")!;
    expect(logo).toHaveAttribute("src", DETAIL.company!.logo);
    // The page's address isn't sent to Finnhub's host with the request.
    expect(logo).toHaveAttribute("referrerpolicy", "no-referrer");

    const year = container.querySelector('[data-stock-range="year"]')!;
    expect(year.querySelector("[data-stock-low]")).toHaveTextContent("169.21");
    expect(year.querySelector("[data-stock-high]")).toHaveTextContent("277.32");
    expect(year).toHaveTextContent("52-week range");
    // Today's price on the year's range.
    expect(Number(year.querySelector("[data-stock-range-share]")!.getAttribute("data-stock-range-share"))).toBeCloseTo(
      (268.4 - 169.21) / (277.32 - 169.21),
      3,
    );
    expect(container.querySelector('[data-stock-stat="pe"]')).toHaveTextContent("35.98");
    expect(container.querySelector('[data-stock-stat="eps"]')).toHaveTextContent("$7.46");
    expect(container.querySelector('[data-stock-stat="dividend-yield"]')).toHaveTextContent("0.39%");
    expect(container.querySelector('[data-stock-stat="beta"]')).toHaveTextContent("1.29");
    expect(container.querySelector('[data-stock-stat="average-volume"]')).toHaveTextContent("48.3M");

    // The bar: a part a rating, in order, as wide as its count; the legend says each.
    const bar = container.querySelector("[data-rating-bar]")!;
    expect([...bar.children].map((el) => el.getAttribute("data-rating"))).toEqual([...RATING_KEYS]);
    expect(bar).toHaveAttribute("aria-label", "15 strong buy, 23 buy, 14 hold, 2 sell, 1 strong sell");
    expect([...container.querySelectorAll("[data-rating-count]")].map((el) => el.textContent)).toEqual(["15", "23", "14", "2", "1"]);
    expect(container.querySelector("[data-rating-month]")).toHaveTextContent("November 2026 · 55 analysts");

    const headlines = [...container.querySelectorAll("[data-stock-news] li")];
    expect(headlines).toHaveLength(2);
    expect(headlines[0]).toHaveTextContent("Apple's services revenue sets another record");
    expect(headlines[0]).toHaveTextContent("Example Wire · 25m ago");
    expect(headlines[1]).toHaveTextContent("3h ago");
  });

  it("leaves out a rating nobody gave, and a key number Finnhub hasn't", () => {
    const { container } = drawer({
      ...DETAIL,
      ratings: { period: "2026-11-01", strongBuy: 0, buy: 4, hold: 1, sell: 0, strongSell: 0 },
      metrics: { week52High: null, week52Low: null, pe: null, eps: -1.5, dividendYield: null, beta: null, averageVolume: null },
    });
    expect([...container.querySelector("[data-rating-bar]")!.children].map((el) => el.getAttribute("data-rating"))).toEqual(["buy", "hold"]);
    // Every rating still has its row.
    expect(container.querySelectorAll("[data-rating-count]")).toHaveLength(5);
    expect(container.querySelector('[data-stock-range="year"]')).toBeNull();
    expect([...container.querySelectorAll("[data-stock-key-numbers] [data-stock-stat]")].map((el) => el.textContent)).toEqual(["−$1.50"]);
  });

  it("has a headline as a link to its article in a new tab — where it has an https address", () => {
    const { container } = drawer(DETAIL);
    const links = [...container.querySelectorAll<HTMLAnchorElement>("[data-stock-news] a")];
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "https://example.com/a");
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(links[0].rel.split(" ").sort()).toEqual(["noopener", "noreferrer"]);
  });

  it("has no link at all on the wall's frame: a tap there would take the kiosk off the dashboard", () => {
    (window as { fully?: unknown }).fully = {};
    const { container } = drawer(DETAIL);
    expect(container.querySelectorAll("[data-stock-news] li")).toHaveLength(2);
    expect(container.querySelectorAll("[data-stock-news] a")).toHaveLength(0);
    expect(container.querySelector("[data-stock-news]")).toHaveTextContent("Apple's services revenue sets another record");
  });

  it("leaves out a section Finnhub has nothing for — an ETF's company and analysts", () => {
    const { part, queryByText, container } = drawer({ ...DETAIL, company: null, ratings: null, news: null });
    expect(part("company")).toBeNull();
    expect(part("ratings")).toBeNull();
    expect(part("news")).toBeNull();
    expect(queryByText("Company")).toBeNull();
    expect(queryByText("Analyst ratings")).toBeNull();
    expect(part("metrics")).toHaveAttribute("data-part-state", "ready");
    // Today is the card's own, whatever Finnhub has.
    expect(container.querySelector("[data-stock-price]")).toHaveTextContent("268.40");
  });

  it("holds a part's place while it is on its way, and says so of one Finnhub didn't answer for", () => {
    const { part, getByText } = drawer({ ...DETAIL, company: null, news: null, pending: ["company"], failed: ["news"] });
    expect(part("company")).toHaveAttribute("data-part-state", "pending");
    expect(part("company")).toHaveAttribute("aria-busy", "true");
    expect(getByText("Company")).toBeInTheDocument();
    expect(part("news")).toHaveAttribute("data-part-state", "failed");
    expect(part("news")).toHaveTextContent("Finnhub didn’t answer for this. It’s asked again in a minute.");
    expect(part("ratings")).toHaveAttribute("data-part-state", "ready");
  });

  it("holds every part's place before the first answer, and says so of all four when the add-on didn't answer", () => {
    const waiting = drawer(undefined);
    for (const name of ["company", "metrics", "ratings", "news"]) expect(waiting.part(name)).toHaveAttribute("data-part-state", "pending");
    waiting.unmount();
    const failed = drawer(undefined, true);
    for (const name of ["company", "metrics", "ratings", "news"]) expect(failed.part(name)).toHaveAttribute("data-part-state", "failed");
  });
});

describe("the drawer's figures", () => {
  it("says a market value and a volume in their largest unit", () => {
    expect(fmtMarketValue(3_982_650_400_000)).toBe("$3.98T");
    expect(fmtMarketValue(845_300_000_000)).toBe("$845.3B");
    expect(fmtMarketValue(12_400_000)).toBe("$12.4M");
    expect(fmtMarketValue(1_500)).toBe("$1.50K");
    expect(fmtMarketValue(950)).toBe("$950");
    expect(fmtMarketValue(0)).toBe("—");
    expect(fmtMarketValue(null)).toBe("—");
    expect(fmtVolume(48_250_000)).toBe("48.3M");
    expect(fmtVolume(1_200_000_000)).toBe("1.20B");
    expect(fmtVolume(850_000)).toBe("850.0K");
    expect(fmtVolume(undefined)).toBe("—");
  });

  it("says a ratio, earnings a share and a yield to the cent, a loss with a true minus", () => {
    expect(fmtRatio(35.984)).toBe("35.98");
    expect(fmtRatio(1.2)).toBe("1.20");
    expect(fmtRatio(null)).toBe("—");
    expect(fmtEarnings(7.456)).toBe("$7.46");
    expect(fmtEarnings(-1.5)).toBe("−$1.50");
    expect(fmtEarnings(Number.NaN)).toBe("—");
    expect(fmtYield(0.39)).toBe("0.39%");
    expect(fmtYield(null)).toBe("—");
  });

  it("shares the analysts out by rating, in the bar's order", () => {
    const { total, parts } = ratingsShares(DETAIL.ratings!);
    expect(total).toBe(55);
    expect(parts.map((p) => p.key)).toEqual(["strongBuy", "buy", "hold", "sell", "strongSell"]);
    expect(parts.map((p) => p.count)).toEqual([15, 23, 14, 2, 1]);
    expect(parts.reduce((sum, p) => sum + p.share, 0)).toBeCloseTo(1);
    expect(ratingsShares({ period: "", strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0 }).parts.every((p) => p.share === 0)).toBe(true);
    expect(ratingsMonth("2026-11-01")).toBe("November 2026");
    expect(ratingsMonth("2026-01-31")).toBe("January 2026");
    expect(ratingsMonth("soon")).toBe("");
  });

  it("says how long ago a headline was", () => {
    const ago = (ms: number) => timeAgo(NOW - ms, NOW);
    expect(ago(20_000)).toBe("Just now");
    expect(ago(-60_000)).toBe("Just now");
    expect(ago(25 * 60_000)).toBe("25m ago");
    expect(ago(3 * 3_600_000 + 60_000)).toBe("3h ago");
    expect(ago(47 * 3_600_000)).toBe("1d ago");
    expect(ago(6 * 86_400_000)).toBe("6d ago");
    expect(ago(9 * 86_400_000)).toBe("Nov 14");
  });

  it("knows what each part is: on its way, unanswered, there, or nothing", () => {
    expect(partState(undefined, "news", "pending")).toBe("pending");
    expect(partState(undefined, "news", "failed")).toBe("failed");
    expect(partState(DETAIL, "news", "pending")).toBe("ready");
    expect(partState({ ...DETAIL, news: null }, "news", "pending")).toBe("none");
    expect(partState({ ...DETAIL, news: null, pending: ["news"] }, "news", "failed")).toBe("pending");
    expect(partState({ ...DETAIL, news: null, failed: ["news"] }, "news", "pending")).toBe("failed");
  });
});
