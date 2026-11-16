import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TICK_MS } from "../../src/lib/haptics";
import {
  MIN_PRESS_MS,
  PRESS_IN_MS,
  PRESS_OUT_MS,
  PRESS_SCALE,
  PRESSING,
  SCROLL_WAIT_MS,
  pressable,
} from "../../src/lib/press";

// A press as the browser reports one: pointer events on whatever is under the
// finger, bubbling to the document.
function pointer(
  type: "pointerdown" | "pointerup" | "pointercancel",
  target: Element,
  init: PointerEventInit = {},
) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      isPrimary: true,
      button: 0,
      pointerId: 1,
      pointerType: "mouse",
      ...init,
    }),
  );
}

function key(type: "keydown" | "keyup", target: Element, key: string, repeat = false) {
  target.dispatchEvent(new KeyboardEvent(type, { bubbles: true, key, repeat }));
}

/** Makes an element one whose content overflows it and scrolls. */
function scrolling(el: HTMLElement) {
  el.style.overflowY = "auto";
  Object.defineProperty(el, "scrollHeight", { value: 2000, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: 600, configurable: true });
}

const held = (el: Element) => el.hasAttribute(PRESSING);

describe("watchPresses", () => {
  let stop: () => void;
  let vibrate: ReturnType<typeof vi.fn>;

  // A fresh module each case: lib/haptics remembers when it last ticked, and
  // the fake clock starts over.
  beforeEach(async () => {
    vi.resetModules();
    const { watchPresses } = await import("../../src/lib/press");
    vi.useFakeTimers();
    document.body.innerHTML = `
      <div id="page">
        <button id="plain"><span id="inside">Go</span></button>
        <button id="off" disabled>Off</button>
        <div id="card" role="button"><p id="text">Card</p><button id="inner">Inner</button></div>
        <div id="other">Not a button</div>
        <label id="switch" data-scope="switch"><input id="box" type="checkbox" /></label>
      </div>`;
    vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
    stop = watchPresses();
  });

  afterEach(() => {
    stop();
    Reflect.deleteProperty(navigator, "vibrate");
    vi.useRealTimers();
  });

  const $ = (id: string) => document.getElementById(id)!;

  it("presses what is under the pointer at contact, and lets it up when the pointer lifts", () => {
    pointer("pointerdown", $("inside"));
    expect(held($("plain"))).toBe(true);
    vi.advanceTimersByTime(MIN_PRESS_MS + 50);
    expect(held($("plain"))).toBe(true);
    pointer("pointerup", $("inside"));
    expect(held($("plain"))).toBe(false);
  });

  it("holds the quickest tap down long enough to be seen", () => {
    pointer("pointerdown", $("plain"));
    vi.advanceTimersByTime(20);
    pointer("pointerup", $("plain"));
    // The finger has gone; the button hasn't come back yet.
    expect(held($("plain"))).toBe(true);
    vi.advanceTimersByTime(MIN_PRESS_MS - 21);
    expect(held($("plain"))).toBe(true);
    vi.advanceTimersByTime(1);
    expect(held($("plain"))).toBe(false);
    // Long enough for the way in to finish.
    expect(MIN_PRESS_MS).toBeGreaterThanOrEqual(PRESS_IN_MS);
  });

  it("keeps a second tap on the same thing down through the first one's release", () => {
    pointer("pointerdown", $("plain"));
    pointer("pointerup", $("plain"));
    vi.advanceTimersByTime(MIN_PRESS_MS - 10);
    pointer("pointerdown", $("plain"));
    // The first tap's release comes due now, under the second press.
    vi.advanceTimersByTime(20);
    expect(held($("plain"))).toBe(true);
    pointer("pointerup", $("plain"));
    vi.advanceTimersByTime(MIN_PRESS_MS);
    expect(held($("plain"))).toBe(false);
  });

  it("presses the innermost pressable alone: a button in a card that is one, not the card", () => {
    pointer("pointerdown", $("inner"));
    expect(held($("inner"))).toBe(true);
    expect(held($("card"))).toBe(false);
    pointer("pointerup", $("inner"));
    vi.advanceTimersByTime(MIN_PRESS_MS);

    pointer("pointerdown", $("text"));
    expect(held($("card"))).toBe(true);
    expect(held($("inner"))).toBe(false);
  });

  it("leaves alone a disabled button, anything that isn't pressable, and any button but the main one", () => {
    pointer("pointerdown", $("off"));
    pointer("pointerdown", $("other"));
    pointer("pointerdown", $("plain"), { button: 2 });
    pointer("pointerdown", $("plain"), { isPrimary: false });
    expect(document.querySelector(`[${PRESSING}]`)).toBeNull();
  });

  it("lets go at once when the gesture is taken away (a scroll), with no hold", () => {
    pointer("pointerdown", $("plain"));
    pointer("pointercancel", $("plain"));
    expect(held($("plain"))).toBe(false);
  });

  it("ignores another pointer's lift", () => {
    pointer("pointerdown", $("plain"));
    vi.advanceTimersByTime(MIN_PRESS_MS);
    pointer("pointerup", $("plain"), { pointerId: 7 });
    expect(held($("plain"))).toBe(true);
  });

  describe("a touch where the page can scroll", () => {
    beforeEach(() => scrolling($("page")));

    it("waits to be told from a scroll before it shows", () => {
      pointer("pointerdown", $("plain"), { pointerType: "touch" });
      expect(held($("plain"))).toBe(false);
      vi.advanceTimersByTime(SCROLL_WAIT_MS - 1);
      expect(held($("plain"))).toBe(false);
      vi.advanceTimersByTime(1);
      expect(held($("plain"))).toBe(true);
    });

    it("never shows when the touch was a scroll", () => {
      pointer("pointerdown", $("plain"), { pointerType: "touch" });
      vi.advanceTimersByTime(SCROLL_WAIT_MS / 2);
      pointer("pointercancel", $("plain"), { pointerType: "touch" });
      vi.advanceTimersByTime(SCROLL_WAIT_MS * 2);
      expect(held($("plain"))).toBe(false);
    });

    it("shows a tap quicker than the wait as it ends, for the full hold", () => {
      pointer("pointerdown", $("plain"), { pointerType: "touch" });
      vi.advanceTimersByTime(SCROLL_WAIT_MS / 2);
      pointer("pointerup", $("plain"), { pointerType: "touch" });
      expect(held($("plain"))).toBe(true);
      vi.advanceTimersByTime(MIN_PRESS_MS - 1);
      expect(held($("plain"))).toBe(true);
      vi.advanceTimersByTime(1);
      expect(held($("plain"))).toBe(false);
    });

    it("is at contact for a mouse all the same", () => {
      pointer("pointerdown", $("plain"));
      expect(held($("plain"))).toBe(true);
    });
  });

  it("presses at contact where nothing scrolls: content that fits, or a box that only clips", () => {
    // Taller than its box, but `overflow: hidden` scrolls nowhere.
    scrolling($("page"));
    $("page").style.overflowY = "hidden";
    pointer("pointerdown", $("plain"), { pointerType: "touch" });
    expect(held($("plain"))).toBe(true);
  });

  it("presses the focused thing under Space or Enter, once, until the key comes up", () => {
    key("keydown", $("plain"), " ");
    expect(held($("plain"))).toBe(true);
    key("keydown", $("plain"), " ", true);
    vi.advanceTimersByTime(MIN_PRESS_MS);
    key("keyup", $("plain"), " ");
    expect(held($("plain"))).toBe(false);

    key("keydown", $("plain"), "Enter");
    expect(held($("plain"))).toBe(true);
    key("keyup", $("plain"), "Enter");
    vi.advanceTimersByTime(MIN_PRESS_MS);
    key("keydown", $("plain"), "a");
    expect(held($("plain"))).toBe(false);
  });

  it("lets everything up when the window loses the pointer", () => {
    pointer("pointerdown", $("plain"));
    window.dispatchEvent(new Event("blur"));
    expect(held($("plain"))).toBe(false);
  });

  it("ticks once as a tap lands on something pressable", () => {
    $("inside").click();
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(TICK_MS);
  });

  it("doesn't tick for a tap on nothing, or on a disabled button", () => {
    $("other").click();
    $("off").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("ticks once for a switch, whose label hands its input a click of its own", () => {
    $("switch").click();
    expect(($("box") as HTMLInputElement).checked).toBe(true);
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it("doesn't tick for a click swallowed on the window before it (a hold's release)", () => {
    const swallow = (e: Event) => e.stopPropagation();
    window.addEventListener("click", swallow, true);
    $("plain").click();
    window.removeEventListener("click", swallow, true);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("stops: nothing is pressed or ticked once it is undone, and nothing is left down", () => {
    pointer("pointerdown", $("plain"));
    stop();
    expect(held($("plain"))).toBe(false);
    pointer("pointerdown", $("plain"));
    $("plain").click();
    expect(held($("plain"))).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });
});

describe("pressable", () => {
  const rule = (styles: ReturnType<typeof pressable>) =>
    styles as Record<string, Record<string, unknown> | string | undefined>;

  it("goes in further the smaller the thing: a button, then a tile, then a whole card", () => {
    expect(PRESS_SCALE.button).toBeLessThan(PRESS_SCALE.tile);
    expect(PRESS_SCALE.tile).toBeLessThan(PRESS_SCALE.card);
    expect(PRESS_SCALE.card).toBeLessThan(1);
    // Deeper than the 0.98 the tiles had, which read as nothing on the wall.
    expect(PRESS_SCALE.tile).toBeLessThan(0.98);
    for (const depth of ["button", "tile", "card"] as const) {
      expect(rule(pressable(depth))[`&[${PRESSING}]`]).toMatchObject({
        scale: String(PRESS_SCALE[depth]),
      });
    }
  });

  it("goes in fast and comes back slower, on a spring", () => {
    const styles = rule(pressable("tile"));
    expect(PRESS_IN_MS).toBeLessThan(PRESS_OUT_MS / 2);
    expect(styles.transitionDuration).toBe(`var(--press-ms, ${PRESS_OUT_MS}ms)`);
    // Past 1 on the way: the curve's first control point is above the line.
    expect(styles.transitionTimingFunction).toMatch(/cubic-bezier\(0\.\d+, 1\.\d+, /);
    expect(styles[`&[${PRESSING}]`]).toMatchObject({ "--press-ms": `${PRESS_IN_MS}ms` });
  });

  it("writes the element's own transitions beside the press's, one list each way", () => {
    const styles = rule(
      pressable("tile", {
        also: [
          ["background-color", "300ms"],
          ["border-radius", "400ms", "linear"],
        ],
      }),
    );
    expect(styles.transitionProperty).toBe("scale, background-color, border-radius");
    expect(String(styles.transitionDuration).split(/, (?![^(]*\))/)).toHaveLength(3);
    expect(String(styles.transitionDuration)).toMatch(/, 300ms, 400ms$/);
    expect(String(styles.transitionTimingFunction)).toMatch(/, ease, linear$/);
  });

  it("shades the top edge while held, unless there is no face to shade", () => {
    const shaded = rule(pressable("button"));
    expect(shaded._after).toMatchObject({ boxShadow: "press", opacity: 0, pointerEvents: "none" });
    expect(shaded[`&[${PRESSING}]::after`]).toEqual({ opacity: 1 });
    const bare = rule(pressable("button", { shade: false }));
    expect(bare._after).toBeUndefined();
    expect(bare[`&[${PRESSING}]::after`]).toBeUndefined();
  });

  it("stays put under reduced motion", () => {
    expect(rule(pressable("tile"))[`&[${PRESSING}]`]).toMatchObject({
      _motionReduce: { scale: "1" },
    });
  });
});
