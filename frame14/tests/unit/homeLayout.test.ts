import { describe, expect, it } from "vitest";
import {
  clearHomeLayout,
  defaultHomeLayout,
  HOME_CARD_IDS,
  HOME_WIDTHS,
  homeColumnsFor,
  homeGridFor,
  loadHomeLayout,
  saveHomeLayout,
} from "../../src/lib/homeLayout";

describe("columns", () => {
  it("one on a phone, four on a desktop, two otherwise", () => {
    expect(homeColumnsFor(true, true)).toBe(1);
    expect(homeColumnsFor(false, true)).toBe(4);
    expect(homeColumnsFor(false, false)).toBe(2);
  });

  it("a phone reads the two-column layout", () => {
    expect(homeGridFor(1)).toBe(2);
    expect(homeGridFor(2)).toBe(2);
    expect(homeGridFor(4)).toBe(4);
  });

  it("offers quarter to full on four columns, half or full on two", () => {
    expect(HOME_WIDTHS[4].map((w) => w.label)).toEqual(["¼", "½", "¾", "Full"]);
    expect(HOME_WIDTHS[2].map((w) => w.span)).toEqual([1, 2]);
  });
});

describe("defaultHomeLayout", () => {
  it("places every card, the header first, at a width the grid allows", () => {
    for (const grid of [2, 4] as const) {
      const layout = defaultHomeLayout(grid);
      expect(layout[0].id).toBe("header");
      expect(new Set(layout.map((c) => c.id))).toEqual(new Set(HOME_CARD_IDS));
      expect(layout.every((c) => c.span >= 1 && c.span <= grid)).toBe(true);
    }
  });

  it("is a fresh copy each time", () => {
    const a = defaultHomeLayout(4);
    a[0].span = 99;
    expect(defaultHomeLayout(4)[0].span).not.toBe(99);
  });
});

describe("loadHomeLayout", () => {
  it("is the default with nothing saved, and after an unreadable save", () => {
    expect(loadHomeLayout(4)).toEqual(defaultHomeLayout(4));
    localStorage.setItem("home-layout:4col", "{nope");
    expect(loadHomeLayout(4)).toEqual(defaultHomeLayout(4));
  });

  it("trusts nothing it reads back", () => {
    localStorage.setItem(
      "home-layout:4col",
      JSON.stringify([
        { id: "energy", span: 9 },
        { id: "bogus", span: 1 },
        { id: "energy", span: 2 },
        { id: "climate", span: "x", hidden: true },
        { id: "header", span: 0, hidden: "yes" },
        null,
      ]),
    );
    const layout = loadHomeLayout(4);
    expect(layout.slice(0, 3)).toEqual([
      { id: "energy", span: 4 },
      { id: "climate", span: 1, hidden: true },
      { id: "header", span: 1 },
    ]);
    // The cards it didn't mention follow at their defaults.
    const rest = layout.slice(3).map((c) => c.id);
    expect(rest).toEqual(defaultHomeLayout(4).map((c) => c.id).filter((id) => !["energy", "climate", "header"].includes(id)));
    expect(layout.filter((c) => c.id === "energy")).toHaveLength(1);
  });

  it("converts a layout saved as zones, in reading order", () => {
    localStorage.setItem(
      "home-layout:portrait",
      JSON.stringify({ top: ["header"], left: ["climate", "energy"], right: ["calendar"], bottom: ["vacuum"] }),
    );
    const layout = loadHomeLayout(2);
    expect(layout.slice(0, 5)).toEqual([
      { id: "header", span: 2 },
      { id: "climate", span: 1 },
      { id: "calendar", span: 1 },
      { id: "energy", span: 1 },
      { id: "vacuum", span: 2 },
    ]);
    expect(layout).toHaveLength(HOME_CARD_IDS.length);
  });

  it("prefers the current save to a legacy one", () => {
    localStorage.setItem("home-layout:portrait", JSON.stringify({ top: ["vacuum"] }));
    localStorage.setItem("home-layout:2col", JSON.stringify([{ id: "calendar", span: 2 }]));
    expect(loadHomeLayout(2)[0].id).toBe("calendar");
  });
});

describe("save and clear", () => {
  it("round-trips and clears both keys", () => {
    const layout = [{ id: "calendar" as const, span: 2 }, { id: "header" as const, span: 1, hidden: true }];
    saveHomeLayout(2, layout);
    expect(loadHomeLayout(2).slice(0, 2)).toEqual(layout);
    localStorage.setItem("home-layout:portrait", "{}");
    clearHomeLayout(2);
    expect(localStorage.getItem("home-layout:2col")).toBeNull();
    expect(localStorage.getItem("home-layout:portrait")).toBeNull();
  });
});
