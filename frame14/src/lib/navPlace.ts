/**
 * Where the nav is: the bar along the bottom, or the rail down the left.
 *
 * It went by the window's shape alone until 0.178.1 — a rail in a landscape
 * window, a bar in a portrait one — and so the frame, an upright tablet, lost
 * its bar whenever its screen was shared: with a game pinned over the app
 * (Android's split screen), the app's window is the screen's width and a
 * little over half its height, landscape by a hair, and the nav went to the
 * side (the user: "The nav thinks it's on a smaller device and is moving to
 * the side. I want it at the bottom still"). A window that is part of an
 * upright screen is still that screen's: the rail is for a window wider than
 * tall **on a screen that is on its side** — a desktop, a phone or tablet
 * turned over.
 *
 * A stylesheet can't say that (a media query's `orientation` is the window's,
 * and `device-aspect-ratio` never turns on an iPhone, whose `screen.width` is
 * always its short side), so the page says it: `watchNavPlace` keeps
 * `<html data-nav-place>` — "bar" or "rail" — and everything that makes room
 * for the nav reads it through WITH_RAIL. The bar is what the styles say
 * without it, so nothing waits on the attribute to be laid out.
 */
export type NavPlace = "bar" | "rail";

/** html's attribute: `data-nav-place`. */
export const NAV_PLACE_ATTRIBUTE = "navPlace";

/**
 * A style key for what holds only while the nav is the rail; without it, the
 * bar's. (A selector, not a Chakra condition: a custom condition has no type
 * to write in a style prop. And `html`, not `:root`: a key that starts with a
 * colon is taken for a pseudo-class of the element itself.)
 */
export const WITH_RAIL = "html[data-nav-place=rail] &";

/** What `screenUpright` reads of the window: its screen, and an old iPhone's angle. */
export interface ScreenSource {
  screen: {
    orientation?: { type?: string } | null;
    width: number;
    height: number;
  };
  orientation?: unknown;
}

/**
 * Whether the screen itself is upright — the device, whatever part of it the
 * window has. The Screen Orientation API says so where there is one; before
 * it (an iPhone until 16.4) `window.orientation`, the angle the device is
 * turned by; and where there is neither, the screen's own sides — last,
 * because an iPhone's don't turn with it.
 */
export function screenUpright(source: ScreenSource = window): boolean {
  const type = source.screen.orientation?.type;
  if (typeof type === "string") return type.startsWith("portrait");
  if (typeof source.orientation === "number") {
    return source.orientation % 180 === 0;
  }
  return source.screen.height > source.screen.width;
}

/** The nav's place in a window of that shape on a screen that way up. */
export function navPlaceFor(
  windowLandscape: boolean,
  upright: boolean,
): NavPlace {
  return windowLandscape && !upright ? "rail" : "bar";
}

const LANDSCAPE = "(orientation: landscape)";

/** The nav's place on this device now. */
export function currentNavPlace(): NavPlace {
  return navPlaceFor(window.matchMedia(LANDSCAPE).matches, screenUpright());
}

/**
 * Keeps `<html data-nav-place>` at the nav's place: now — before the first
 * render, from main.tsx — and whenever the window's shape or the screen's
 * turn changes. A resize is heard before the next frame is drawn, so the nav
 * and the page's room for it move together, as under a media query.
 */
export function watchNavPlace(): () => void {
  const root = document.documentElement;
  const update = () => {
    const place = currentNavPlace();
    if (root.dataset[NAV_PLACE_ATTRIBUTE] !== place) {
      root.dataset[NAV_PLACE_ATTRIBUTE] = place;
    }
  };
  update();
  const landscape = window.matchMedia(LANDSCAPE);
  const turn = window.screen.orientation;
  landscape.addEventListener("change", update);
  window.addEventListener("resize", update);
  window.addEventListener("orientationchange", update);
  turn?.addEventListener?.("change", update);
  return () => {
    landscape.removeEventListener("change", update);
    window.removeEventListener("resize", update);
    window.removeEventListener("orientationchange", update);
    turn?.removeEventListener?.("change", update);
  };
}
