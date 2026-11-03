import { describe, expect, it } from "vitest";
import {
  HOME_PATH,
  NAV_BAR_ENTRIES,
  NAV_ITEMS,
  navItemsFor,
  RENAMED_PATHS,
  SETTINGS_PATH,
  splitForBar,
} from "../../src/lib/navItems";

const paths = (items: { path: string }[]) => items.map((i) => i.path);

describe("NAV_ITEMS", () => {
  it("starts with Home and ends with Settings", () => {
    expect(NAV_ITEMS[0].path).toBe(HOME_PATH);
    expect(NAV_ITEMS.at(-1)?.path).toBe(SETTINGS_PATH);
  });

  it("marks the two Photos entries as needing Immich (0.145.0)", () => {
    expect(NAV_ITEMS.filter((i) => i.photos).map((i) => i.path)).toEqual(["/photos", "/album"]);
  });

  it("keeps the 0.109 order, Unraid (0.151.0) after Cameras, Halloween (0.128) before Settings", () => {
    expect(paths(NAV_ITEMS)).toEqual([
      "/home", "/clock", "/lights", "/climate", "/photos", "/album", "/energy",
      "/weather", "/printer", "/vacuum", "/cameras", "/unraid", "/calendar", "/football", "/halloween", "/control",
    ]);
  });

  it("offers Unraid (0.151.0) only with a server, and off on a remote until turned on", () => {
    expect(NAV_ITEMS.filter((i) => i.unraid).map((i) => i.path)).toEqual(["/unraid"]);
    expect(NAV_ITEMS.find((i) => i.path === "/unraid")).toMatchObject({ remoteOff: true });
  });

  it("Football and Halloween come and go with the day, and start off on a remote", () => {
    const football = NAV_ITEMS.find((i) => i.path === "/football");
    const halloween = NAV_ITEMS.find((i) => i.path === "/halloween");
    expect(football).toMatchObject({ gameDay: true, remoteOff: true });
    expect(halloween).toMatchObject({ halloween: true, remoteOff: true });
    expect(halloween?.gameDay).toBeUndefined();
  });
});

describe("navItemsFor", () => {
  it("a frame has the clock and the slideshow, not the remote's album", () => {
    const frame = paths(navItemsFor("frame"));
    expect(frame).toContain("/clock");
    expect(frame).toContain("/photos");
    expect(frame).not.toContain("/album");
  });

  it("a remote has the album in place of the clock and the slideshow", () => {
    const remote = paths(navItemsFor("controller"));
    expect(remote).toContain("/album");
    expect(remote).not.toContain("/clock");
    expect(remote).not.toContain("/photos");
  });

  it("both keep Home first and Settings last", () => {
    for (const mode of ["frame", "controller"] as const) {
      const items = paths(navItemsFor(mode));
      expect(items[0]).toBe(HOME_PATH);
      expect(items.at(-1)).toBe(SETTINGS_PATH);
    }
  });
});

describe("splitForBar", () => {
  const items = NAV_ITEMS.slice(0, 7);

  it("fits what fits", () => {
    const { bar, more } = splitForBar(items.slice(0, 5), 5);
    expect(bar).toHaveLength(5);
    expect(more).toEqual([]);
  });

  it("gives More the last slot when there are too many", () => {
    const { bar, more } = splitForBar(items.slice(0, 6), NAV_BAR_ENTRIES.controller);
    expect(paths(bar)).toEqual(paths(items.slice(0, 4)));
    expect(paths(more)).toEqual(paths(items.slice(4, 6)));
  });

  it("the frame's six slots hold six, seven put five in the bar", () => {
    expect(splitForBar(items.slice(0, 6), NAV_BAR_ENTRIES.frame).more).toEqual([]);
    const { bar, more } = splitForBar(items, NAV_BAR_ENTRIES.frame);
    expect(bar).toHaveLength(5);
    expect(more).toHaveLength(2);
  });
});

describe("RENAMED_PATHS", () => {
  it("maps the old pages onto their new homes", () => {
    expect(RENAMED_PATHS["/solar"]).toBe("/energy");
    expect(RENAMED_PATHS["/power"]).toBe("/energy");
    expect(RENAMED_PATHS["/radar"]).toBe("/weather");
  });
});
