import { describe, expect, it } from "vitest";
import {
  defaultNavLayout,
  loadNavLayout,
  resetNavLayout,
  sameNavLayout,
  saveNavLayout,
  shownNavItems,
} from "../../src/lib/navLayout";

const paths = (entries: { path: string }[]) => entries.map((e) => e.path);
const shown = (entries: { path: string; shown: boolean }[]) =>
  entries.filter((e) => e.shown).map((e) => e.path);

describe("defaultNavLayout", () => {
  it("a frame shows everything it can have", () => {
    const layout = defaultNavLayout("frame");
    expect(layout.every((e) => e.shown)).toBe(true);
    expect(paths(layout)).toContain("/clock");
  });

  it("a remote starts with Home, Lights, Climate, Photos and Settings", () => {
    expect(shown(defaultNavLayout("controller"))).toEqual([
      "/home", "/lights", "/climate", "/album", "/control",
    ]);
  });
});

describe("loadNavLayout", () => {
  it("is the defaults until something is saved", () => {
    expect(loadNavLayout("frame")).toEqual(defaultNavLayout("frame"));
  });

  it("hands back the same array while nothing changed", () => {
    expect(loadNavLayout("frame")).toBe(loadNavLayout("frame"));
  });

  it("makes a saved layout safe: Home first, Settings shown, strangers dropped, renames kept in place", () => {
    localStorage.setItem(
      "nav-layout:frame",
      JSON.stringify([
        { path: "/lights", shown: true },
        { path: "/radar", shown: false },
        { path: "/bogus", shown: true },
        { path: "/home", shown: false },
        { path: "/control", shown: false },
      ]),
    );
    const layout = loadNavLayout("frame");
    expect(layout[0]).toEqual({ path: "/home", shown: true });
    expect(layout.find((e) => e.path === "/weather")).toEqual({ path: "/weather", shown: false });
    expect(paths(layout)).not.toContain("/bogus");
    expect(paths(layout)).not.toContain("/radar");
    expect(layout.at(-1)).toEqual({ path: "/control", shown: true });
  });

  it("adds entries saved before they existed, ahead of a trailing Settings", () => {
    localStorage.setItem(
      "nav-layout:frame",
      JSON.stringify([
        { path: "/home", shown: true },
        { path: "/lights", shown: true },
        { path: "/control", shown: true },
      ]),
    );
    const layout = paths(loadNavLayout("frame"));
    expect(layout[1]).toBe("/lights");
    expect(layout.at(-1)).toBe("/control");
    expect(layout).toContain("/climate");
    expect(layout.indexOf("/climate")).toBeLessThan(layout.indexOf("/control"));
  });

  it("two pages that became one are shown if either was", () => {
    localStorage.setItem(
      "nav-layout:frame",
      JSON.stringify([
        { path: "/solar", shown: false },
        { path: "/power", shown: true },
      ]),
    );
    const energy = loadNavLayout("frame").filter((e) => e.path === "/energy");
    expect(energy).toEqual([{ path: "/energy", shown: true }]);
  });

  it("drops entries the mode doesn't offer", () => {
    localStorage.setItem(
      "nav-layout:controller",
      JSON.stringify([{ path: "/clock", shown: true }]),
    );
    expect(paths(loadNavLayout("controller"))).not.toContain("/clock");
  });

  it("ignores a layout that isn't one", () => {
    localStorage.setItem("nav-layout:frame", "not json");
    expect(loadNavLayout("frame")).toEqual(defaultNavLayout("frame"));
    localStorage.setItem("nav-layout:frame", JSON.stringify({ nope: true }));
    expect(loadNavLayout("frame")).toEqual(defaultNavLayout("frame"));
  });
});

describe("save and reset", () => {
  it("round-trips, normalised, and resets to the defaults", () => {
    saveNavLayout("frame", [
      { path: "/control", shown: false },
      { path: "/lights", shown: false },
    ]);
    const saved = loadNavLayout("frame");
    expect(saved[0].path).toBe("/home");
    expect(saved.find((e) => e.path === "/lights")?.shown).toBe(false);
    expect(saved.find((e) => e.path === "/control")?.shown).toBe(true);
    resetNavLayout("frame");
    expect(localStorage.getItem("nav-layout:frame")).toBeNull();
    expect(loadNavLayout("frame")).toEqual(defaultNavLayout("frame"));
  });

  it("sameNavLayout compares paths and visibility in order", () => {
    const a = defaultNavLayout("frame");
    expect(sameNavLayout(a, defaultNavLayout("frame"))).toBe(true);
    expect(sameNavLayout(a, [...a].reverse())).toBe(false);
    expect(sameNavLayout(a, a.map((e, i) => (i === 2 ? { ...e, shown: false } : e)))).toBe(false);
    expect(sameNavLayout(a, a.slice(1))).toBe(false);
  });
});

describe("shownNavItems", () => {
  const everyday = { gameDay: false, halloween: false };

  it("is the shown entries as nav items, Football on game day only", () => {
    const layout = defaultNavLayout("frame");
    const plain = shownNavItems(layout, everyday).map((i) => i.path);
    expect(plain).not.toContain("/football");
    const gameDay = shownNavItems(layout, { ...everyday, gameDay: true }).map((i) => i.path);
    expect(gameDay).toContain("/football");
    const hidden = shownNavItems(
      layout.map((e) => (e.path === "/lights" ? { ...e, shown: false } : e)),
      everyday,
    ).map((i) => i.path);
    expect(hidden).not.toContain("/lights");
  });

  it("Halloween on Oct 30 and 31 only, and only while the device shows it", () => {
    const layout = defaultNavLayout("frame");
    expect(shownNavItems(layout, everyday).map((i) => i.path)).not.toContain("/halloween");
    const halloween = shownNavItems(layout, { ...everyday, halloween: true }).map((i) => i.path);
    expect(halloween).toContain("/halloween");
    expect(halloween).not.toContain("/football");
    // A remote starts with it off; turned on, it comes with the day too.
    expect(shownNavItems(defaultNavLayout("controller"), { ...everyday, halloween: true }).map((i) => i.path)).not.toContain("/halloween");
    const turnedOn = defaultNavLayout("controller").map((e) => (e.path === "/halloween" ? { ...e, shown: true } : e));
    expect(shownNavItems(turnedOn, { ...everyday, halloween: true }).map((i) => i.path)).toContain("/halloween");
    expect(shownNavItems(turnedOn, everyday).map((i) => i.path)).not.toContain("/halloween");
  });
});
