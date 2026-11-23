import { describe, expect, it } from "vitest";
import {
  dayRangeShare,
  direction,
  fmtChange,
  fmtPercent,
  fmtPrice,
  priceMove,
  sessionLabel,
} from "../../src/lib/stocks";

// The Stocks page's figures (0.179.0).

describe("how the figures read", () => {
  it("prices to the cent, with thousands, fractions of a cent under a dollar, a dash for none", () => {
    expect(fmtPrice(717.4)).toBe("717.40");
    expect(fmtPrice(1204.5)).toBe("1,204.50");
    expect(fmtPrice(0.1234)).toBe("0.1234");
    expect(fmtPrice(0.5)).toBe("0.50");
    expect(fmtPrice(null)).toBe("—");
    expect(fmtPrice(Number.NaN)).toBe("—");
  });

  it("says the change's sign always, with a true minus, and none for nothing", () => {
    expect(fmtChange(4.183)).toBe("+4.18");
    expect(fmtChange(-2.35)).toBe("−2.35");
    expect(fmtChange(0)).toBe("0.00");
    expect(fmtChange(-0.001)).toBe("0.00");
    expect(fmtChange(null)).toBe("—");
    expect(fmtPercent(0.5861)).toBe("+0.59%");
    expect(fmtPercent(-0.3574)).toBe("−0.36%");
    expect(fmtPercent(0)).toBe("0.00%");
    expect(fmtPercent(undefined)).toBe("—");
  });

  it("calls a day up, down or flat by the change as shown", () => {
    expect(direction(0.01)).toBe("up");
    expect(direction(-0.01)).toBe("down");
    expect(direction(0.004)).toBe("flat");
    expect(direction(null)).toBe("flat");
  });
});

describe("the day's range", () => {
  it("places the price from the low to the high, held to the range", () => {
    expect(dayRangeShare(100, 200, 150)).toBe(0.5);
    expect(dayRangeShare(100, 200, 100)).toBe(0);
    expect(dayRangeShare(100, 200, 250)).toBe(1);
    expect(dayRangeShare(100, 200, 50)).toBe(0);
    // A range of one price: the middle.
    expect(dayRangeShare(100, 100, 100)).toBe(0.5);
    expect(dayRangeShare(null, 200, 150)).toBeNull();
  });
});

describe("a new price", () => {
  it("moves up or down from the last shown, or not at all", () => {
    expect(priceMove(100, 101)).toBe("up");
    expect(priceMove(100, 99.99)).toBe("down");
    expect(priceMove(100, 100)).toBeNull();
    expect(priceMove(null, 100)).toBeNull();
  });
});

describe("the market's session", () => {
  it("names Finnhub's sessions, a holiday as shut, and anything else by whether it's open", () => {
    const at = (session: string | null, isOpen: boolean | null = null, holiday: string | null = null) =>
      sessionLabel({ session, isOpen, holiday });
    expect(at("regular", true)).toMatchObject({ label: "Market open", palette: "green", session: "regular" });
    expect(at("pre-market")).toMatchObject({ label: "Pre-market", session: "pre" });
    expect(at("post-market")).toMatchObject({ label: "After hours", session: "post" });
    expect(at(null, false)).toMatchObject({ label: "Closed", palette: "gray", session: "closed" });
    expect(at(null, false, "Thanksgiving Day")).toMatchObject({ label: "Closed" });
    expect(at("something new", true)).toMatchObject({ label: "Market open" });
  });
});
