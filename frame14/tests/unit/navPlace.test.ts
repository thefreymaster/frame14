import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WITH_RAIL,
  navPlaceFor,
  screenUpright,
  watchNavPlace,
} from "../../src/lib/navPlace";

// 0.178.1: where the nav is goes by the screen as well as the window. With a
// game pinned over the app on the frame — an upright tablet, its screen
// shared — the app's window is a hair wider than tall, and the nav went to
// the side as on a desktop. What a real browser lays out is nav.spec's.

describe("navPlaceFor", () => {
  it("is the rail only for a window wider than tall on a screen that is on its side", () => {
    // A desktop, a phone turned over.
    expect(navPlaceFor(true, false)).toBe("rail");
    // The frame with its screen shared: a landscape window on an upright screen.
    expect(navPlaceFor(true, true)).toBe("bar");
    // The frame, a phone.
    expect(navPlaceFor(false, true)).toBe("bar");
    // A narrow window on a desktop.
    expect(navPlaceFor(false, false)).toBe("bar");
  });
});

describe("screenUpright", () => {
  const screen = (width: number, height: number, type?: string) => ({
    width,
    height,
    orientation: type ? { type } : undefined,
  });

  it("takes the screen's own word where it has one", () => {
    expect(screenUpright({ screen: screen(1600, 2400, "portrait-primary") })).toBe(true);
    expect(screenUpright({ screen: screen(1600, 2400, "portrait-secondary") })).toBe(true);
    expect(screenUpright({ screen: screen(2400, 1600, "landscape-primary") })).toBe(false);
    expect(screenUpright({ screen: screen(2400, 1600, "landscape-secondary") })).toBe(false);
  });

  it("believes that word over the screen's sides, which an iPhone's never turn", () => {
    // An iPhone on its side: still 390 by 844 to the page.
    expect(screenUpright({ screen: screen(390, 844, "landscape-primary") })).toBe(false);
  });

  it("goes by the angle the device is turned by before there was such a word", () => {
    // An iPhone before 16.4: no screen.orientation, and the same sides either way.
    expect(screenUpright({ screen: screen(390, 844), orientation: 0 })).toBe(true);
    expect(screenUpright({ screen: screen(390, 844), orientation: 180 })).toBe(true);
    expect(screenUpright({ screen: screen(390, 844), orientation: 90 })).toBe(false);
    expect(screenUpright({ screen: screen(390, 844), orientation: -90 })).toBe(false);
  });

  it("falls back on the screen's sides", () => {
    expect(screenUpright({ screen: screen(1600, 2400) })).toBe(true);
    expect(screenUpright({ screen: screen(1920, 1080) })).toBe(false);
    // A square screen is nobody's side.
    expect(screenUpright({ screen: screen(1000, 1000) })).toBe(false);
  });
});

describe("watchNavPlace", () => {
  const original = {
    matchMedia: window.matchMedia,
    screen: Object.getOwnPropertyDescriptor(window, "screen"),
  };
  let stop: (() => void) | undefined;

  /** A window of that shape on a screen that way up, both of which the test can turn. */
  function device(landscape: boolean, type: string) {
    const state = { landscape, type };
    const heard = new Set<() => void>();
    window.matchMedia = vi.fn((query: string) => ({
      get matches() {
        return query === "(orientation: landscape)" && state.landscape;
      },
      media: query,
      addEventListener: (_: string, cb: () => void) => heard.add(cb),
      removeEventListener: (_: string, cb: () => void) => heard.delete(cb),
    })) as unknown as typeof window.matchMedia;
    Object.defineProperty(window, "screen", {
      configurable: true,
      value: {
        width: 0,
        height: 0,
        orientation: {
          get type() {
            return state.type;
          },
          addEventListener: (_: string, cb: () => void) => heard.add(cb),
          removeEventListener: (_: string, cb: () => void) => heard.delete(cb),
        },
      },
    });
    return {
      state,
      /** What the browser tells the page when either changes. */
      tell: () => [...heard].forEach((cb) => cb()),
      listening: () => heard.size,
    };
  }

  afterEach(() => {
    stop?.();
    stop = undefined;
    window.matchMedia = original.matchMedia;
    if (original.screen) Object.defineProperty(window, "screen", original.screen);
    delete document.documentElement.dataset.navPlace;
  });

  const place = () => document.documentElement.dataset.navPlace;

  it("marks html with the place before anything is drawn", () => {
    device(true, "landscape-primary");
    stop = watchNavPlace();
    expect(place()).toBe("rail");
  });

  it("keeps the bar on the frame while its screen is shared", () => {
    // Upright and whole: the bar.
    const frame = device(false, "portrait-primary");
    stop = watchNavPlace();
    expect(place()).toBe("bar");

    // A game pinned over the app: the window is landscape now, the screen isn't.
    frame.state.landscape = true;
    frame.tell();
    expect(place()).toBe("bar");

    // Turned on its side, it is the rail's.
    frame.state.type = "landscape-primary";
    frame.tell();
    expect(place()).toBe("rail");
  });

  it("follows a window being resized", () => {
    const desktop = device(true, "landscape-primary");
    stop = watchNavPlace();
    expect(place()).toBe("rail");
    desktop.state.landscape = false;
    window.dispatchEvent(new Event("resize"));
    expect(place()).toBe("bar");
  });

  it("stops listening when told to", () => {
    const desktop = device(true, "landscape-primary");
    stop = watchNavPlace();
    expect(desktop.listening()).toBeGreaterThan(0);
    stop();
    stop = undefined;
    expect(desktop.listening()).toBe(0);
    desktop.state.landscape = false;
    window.dispatchEvent(new Event("resize"));
    expect(place()).toBe("rail");
  });
});

describe("WITH_RAIL", () => {
  it("is a selector on html, not one a stylesheet takes for the element's own", () => {
    // A key that starts with a colon is read as a pseudo-class of the element
    // wearing the style (`.x:root[…] .x`), which matches nothing.
    expect(WITH_RAIL).toBe("html[data-nav-place=rail] &");
  });
});
