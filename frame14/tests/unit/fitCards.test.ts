import { describe, expect, it } from "vitest";
import { fitCards, type FitCard } from "../../src/lib/fitCards";
import { packedDepths } from "../../src/lib/packCards";

// Cards as the board measures them, in the grid's rows: a card's stops are
// the heights it can be cut to — its header, then under each row of its
// content — and the last is all of it.
const header = 10;
/** A list: its header, then `rows` rows of `each`. */
const list = (rows: number, each = 10, span = 1): FitCard => ({
  span,
  stops: Array.from({ length: rows + 1 }, (_, i) => header + i * each),
});
/** A card that is whole or folded to its header. */
const block = (whole: number, span = 1): FitCard => ({ span, stops: [header, whole] });
/** A card that can't be cut at all (the frame's clock). */
const fixed = (whole: number, span = 1): FitCard => ({ span, stops: [whole] });

const heights = (cards: FitCard[], at: number[]) => at.map((stop, i) => cards[i].stops[stop]);
const deepest = (columns: number, cards: FitCard[], at: number[]) =>
  Math.max(...packedDepths(columns, cards.map((card, i) => ({ span: card.span, rows: card.stops[at[i]] }))));
const whole = (cards: FitCard[]) => cards.map((card) => card.stops.length - 1);

describe("fitCards", () => {
  it("leaves every card whole when the board fits", () => {
    const cards = [block(40), list(5), block(30)];
    expect(fitCards(1, cards, 200)).toEqual(whole(cards));
    // Exactly: the limit is the last row that may be used.
    expect(fitCards(1, cards, 40 + 60 + 30)).toEqual(whole(cards));
  });

  it("holds every column to the limit", () => {
    const cards = [block(60), list(12), block(50), list(8), block(40)];
    for (const limit of [200, 150, 120, 90, 60]) {
      const at = fitCards(2, cards, limit);
      expect(deepest(2, cards, at), `limit ${limit}`).toBeLessThanOrEqual(limit);
    }
  });

  it("trims a long list before a card of two rows loses one", () => {
    // Thermostats in two rows of tiles over a ten-event calendar.
    const climate = list(2, 30);
    const calendar = list(10);
    const cards = [climate, calendar];
    const at = fitCards(1, cards, 130);
    expect(at[0]).toBe(2);
    // Down to what is left: 130 - 70 = 60, the header and five events.
    expect(heights(cards, at)).toEqual([70, 60]);
  });

  it("trims the longest list first, and leaves each two rows before any card is brought to one", () => {
    const cards = [list(8), list(4), list(2, 20)];
    // Whole: 90 + 50 + 50 = 190.
    expect(heights(cards, fitCards(1, cards, 170))).toEqual([70, 50, 50]);
    // Everything that can be trimmed to two rows is, before the third card
    // loses a row.
    expect(heights(cards, fitCards(1, cards, 110))).toEqual([30, 30, 50]);
  });

  it("brings cards to a single row before it folds any, and folds only when nothing else gives", () => {
    const cards = [list(2, 20), list(2, 20), block(40)];
    // 50 + 50 + 40 = 140. Twenty over: one card loses its second row.
    expect(heights(cards, fitCards(1, cards, 120))).toEqual([50, 30, 40]);
    // Forty over: both do, and the block is still whole.
    expect(heights(cards, fitCards(1, cards, 100))).toEqual([30, 30, 40]);
    // Seventy over: now something folds — the block, whose fold is enough
    // by itself, rather than both lists, which hide less each.
    expect(heights(cards, fitCards(1, cards, 70))).toEqual([30, 30, 10]);
    // And when no one fold is enough, the least is hidden first.
    expect(heights(cards, fitCards(1, cards, 50))).toEqual([30, 10, 10]);
  });

  it("asks nothing of a column that has room", () => {
    // Two columns: the first over, the second with room to spare.
    const cards = [list(10), list(3), block(30), block(20)];
    // Column one: the list (110) and the block (30); column two: 40 + 20.
    const at = fitCards(2, cards, 100);
    expect(at[1]).toBe(3);
    expect(at[3]).toBe(1);
    expect(heights(cards, at)).toEqual([70, 40, 30, 20]);
  });

  it("takes the step nearest the size of what is over, rather than a bigger one", () => {
    // Ten over. A card that would give up ten, and one that would give forty.
    const small = { span: 1, stops: [header, 30, 40] };
    const big = { span: 1, stops: [header, 30, 70] };
    const cards = [small, big];
    expect(heights(cards, fitCards(1, cards, 100))).toEqual([30, 70]);
  });

  it("gives a stop back when a later step made room for it", () => {
    // Twenty-five over: the short list's row (10) goes first, as the
    // gentlest step, and isn't enough; then the tall card's half (30), which
    // ends it alone — and makes room for that row again.
    const short = list(3, 10);
    const tall = { span: 1, stops: [header, 40, 70] };
    const cards = [short, tall];
    const at = fitCards(1, cards, 85);
    expect(heights(cards, at)).toEqual([40, 40]);
    expect(deepest(1, cards, at)).toBeLessThanOrEqual(85);
  });

  it("never cuts a card that has no stops", () => {
    const cards = [fixed(80), list(6)];
    const at = fitCards(1, cards, 100);
    expect(at[0]).toBe(0);
    expect(heights(cards, at)).toEqual([80, 20]);
  });

  it("counts a card across two columns in both", () => {
    // A full-width card over two columns: only what is under it differs.
    const cards = [block(40, 2), list(8), list(2)];
    const at = fitCards(2, cards, 100);
    expect(deepest(2, cards, at)).toBeLessThanOrEqual(100);
    // The wide card and the short column are whole; the long list is cut.
    expect(heights(cards, at)).toEqual([40, 60, 30]);
  });

  it("brings every card to its least, and leaves it at that, when the screen can't hold them", () => {
    const cards = [block(50), block(50), list(4)];
    expect(fitCards(1, cards, 20)).toEqual([0, 0, 0]);
  });

  it("holds nothing back for an empty board", () => {
    expect(fitCards(2, [], 100)).toEqual([]);
  });
});
