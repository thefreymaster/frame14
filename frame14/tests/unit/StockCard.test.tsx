import { act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StockCard } from "../../src/components/StockCard";
import type { StockQuote } from "../../src/lib/stocks";
import { renderWithProviders } from "./helpers/render";

// A ticker's card on the Stocks page (0.179.0).

const SPY: StockQuote = {
  symbol: "SPY",
  price: 717.42,
  previousClose: 713.24,
  open: 713.6,
  high: 718.9,
  low: 713.05,
  change: 4.18,
  changePercent: 0.586,
  at: 1,
};

function card(quote: StockQuote) {
  const view = renderWithProviders(<StockCard quote={quote} />);
  const price = () => view.container.querySelector<HTMLElement>("[data-stock-price]")!;
  const flash = () => view.container.querySelector<HTMLElement>("[data-price-flash]");
  const show = (next: Partial<StockQuote>) =>
    act(() => {
      view.rerender(<StockCard quote={{ ...quote, ...next }} />);
    });
  return { ...view, price, flash, show };
}

describe("StockCard", () => {
  it("says the ticker, the price, the change and its share, the range and the day's figures", () => {
    const { getByText, container } = card(SPY);
    expect(getByText("SPY")).toBeInTheDocument();
    expect(getByText("717.42")).toBeInTheDocument();
    expect(getByText("+4.18 (+0.59%)")).toBeInTheDocument();
    expect(container.querySelector("[data-stock-low]")).toHaveTextContent("713.05");
    expect(container.querySelector("[data-stock-high]")).toHaveTextContent("718.90");
    expect(container.querySelector("[data-stock-open]")).toHaveTextContent("713.60");
    expect(container.querySelector("[data-stock-previous-close]")).toHaveTextContent("713.24");
    expect(container.querySelector("[data-stock]")).toHaveAttribute("data-direction", "up");
    // The marker where the price is, a share of the day's range.
    expect(Number(container.querySelector("[data-stock-range-share]")!.getAttribute("data-stock-range-share"))).toBeCloseTo(
      (717.42 - 713.05) / (718.9 - 713.05),
      3,
    );
  });

  it("is down in red's way, and flat for no change", () => {
    expect(card({ ...SPY, change: -2.35, changePercent: -0.33 }).container.querySelector("[data-stock]")).toHaveAttribute(
      "data-direction",
      "down",
    );
    expect(card({ ...SPY, change: 0, changePercent: 0 }).getByText("0.00 (0.00%)")).toBeInTheDocument();
  });

  it("says so for a ticker Finnhub has no quote for", () => {
    const { getByText, container } = card({ ...SPY, price: null, change: null, changePercent: null, low: null, high: null });
    expect(getByText("No quote from Finnhub")).toBeInTheDocument();
    expect(container.querySelector("[data-stock-price]")).toHaveTextContent("—");
    expect(container.querySelector("[data-stock-range-marker]")).toBeNull();
  });

  it("flashes when the price shown changes — up green, down red — and not when the same price comes again", () => {
    const { price, flash, show } = card(SPY);
    expect(flash()).toBeNull();
    expect(price()).toHaveAttribute("data-flash-count", "0");
    show({ price: 717.5, at: 2 });
    expect(flash()).toHaveAttribute("data-price-flash", "up");
    expect(price()).toHaveAttribute("data-flash-count", "1");
    const first = flash();
    show({ price: 717.5, at: 3 });
    expect(price()).toHaveAttribute("data-flash-count", "1");
    expect(flash()).toBe(first);
    show({ price: 717.1, at: 4 });
    expect(flash()).toHaveAttribute("data-price-flash", "down");
    expect(price()).toHaveAttribute("data-flash-count", "2");
    // A new element, so the light plays from the start.
    expect(flash()).not.toBe(first);
  });
});
