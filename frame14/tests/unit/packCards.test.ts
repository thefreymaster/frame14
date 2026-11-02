import { describe, expect, it } from "vitest";
import { packCards } from "../../src/lib/packCards";

describe("packCards", () => {
  it("takes the columns left to right in order, and starts a new band when a card doesn't fit beside the one before", () => {
    expect(
      packCards(4, [
        { span: 2, rows: 10 },
        { span: 2, rows: 10 },
        { span: 2, rows: 10 },
      ]),
    ).toEqual([
      { column: 1, row: 1 },
      { column: 3, row: 1 },
      { column: 1, row: 11 },
    ]);

    // A half card won't fit beside a three-quarter one; the quarter after it
    // sits under the three-quarter card's right part, not up beside it.
    expect(
      packCards(4, [
        { span: 3, rows: 4 },
        { span: 2, rows: 4 },
        { span: 1, rows: 4 },
      ]),
    ).toEqual([
      { column: 1, row: 1 },
      { column: 1, row: 5 },
      { column: 3, row: 5 },
    ]);
  });

  it("stacks each card directly under the lowest card above it in its columns", () => {
    expect(
      packCards(2, [
        { span: 1, rows: 10 },
        { span: 1, rows: 4 },
        { span: 1, rows: 3 },
        { span: 1, rows: 3 },
        { span: 2, rows: 2 },
      ]),
    ).toEqual([
      { column: 1, row: 1 },
      { column: 2, row: 1 },
      { column: 1, row: 11 },
      { column: 2, row: 5 },
      // Full width: under both columns, so under the taller one.
      { column: 1, row: 14 },
    ]);
  });

  it("a card that grows moves only the cards under it, in its columns, and never a card sideways", () => {
    const cards = [
      { span: 2, rows: 20 }, // header, left
      { span: 2, rows: 12 }, // climate, right
      { span: 2, rows: 16 }, // calendar, under the header
      { span: 2, rows: 14 }, // energy, under climate
      { span: 2, rows: 8 }, // fans, under the calendar
    ];
    const before = packCards(4, cards);
    expect(before).toEqual([
      { column: 1, row: 1 },
      { column: 3, row: 1 },
      { column: 1, row: 21 },
      { column: 3, row: 13 },
      { column: 1, row: 37 },
    ]);

    const climateGrown = packCards(
      4,
      cards.map((c, i) => (i === 1 ? { ...c, rows: c.rows + 10 } : c)),
    );
    expect(climateGrown.map((p) => p.column)).toEqual(
      before.map((p) => p.column),
    );
    expect(climateGrown.map((p) => p.row)).toEqual([1, 1, 21, 23, 37]);

    const headerGrown = packCards(
      4,
      cards.map((c, i) => (i === 0 ? { ...c, rows: c.rows + 10 } : c)),
    );
    expect(headerGrown.map((p) => p.column)).toEqual(
      before.map((p) => p.column),
    );
    expect(headerGrown.map((p) => p.row)).toEqual([1, 1, 31, 13, 47]);
  });

  it("stacks a one-column phone in order, whatever the widths", () => {
    expect(
      packCards(1, [
        { span: 2, rows: 5 },
        { span: 1, rows: 3 },
      ]),
    ).toEqual([
      { column: 1, row: 1 },
      { column: 1, row: 6 },
    ]);
  });

  it("clamps a width to the grid", () => {
    expect(
      packCards(2, [
        { span: 4, rows: 1 },
        { span: 0, rows: 1 },
      ]),
    ).toEqual([
      { column: 1, row: 1 },
      { column: 1, row: 2 },
    ]);
  });
});
