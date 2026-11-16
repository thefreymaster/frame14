import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1";
const IPAD_AS_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15";
const PIXEL =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

type Haptics = typeof import("../../src/lib/haptics");

// lib/haptics remembers when it last ticked: a fresh module per case.
async function load(): Promise<Haptics> {
  vi.resetModules();
  return import("../../src/lib/haptics");
}

function device(userAgent: string, { touchPoints = 5, vibrate }: { touchPoints?: number; vibrate?: () => boolean } = {}) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
  // jsdom's navigator has neither of these.
  Object.defineProperty(navigator, "maxTouchPoints", { value: touchPoints, configurable: true });
  Reflect.deleteProperty(navigator, "vibrate");
  if (vibrate) Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
}

// The observer reports after the current task.
const settled = () => new Promise((resolve) => setTimeout(resolve));

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, "vibrate");
  Reflect.deleteProperty(navigator, "maxTouchPoints");
  document.body.innerHTML = "";
});

describe("hapticTick", () => {
  it("runs the motor for a tick", async () => {
    const vibrate = vi.fn(() => true);
    device(PIXEL, { vibrate });
    const { hapticTick, TICK_MS } = await load();
    hapticTick();
    expect(vibrate).toHaveBeenCalledExactlyOnceWith(TICK_MS);
    // A tick, not a buzz.
    expect(TICK_MS).toBeLessThanOrEqual(20);
  });

  it("is one tick for two calls a moment apart, and two for two taps", async () => {
    vi.useFakeTimers();
    const vibrate = vi.fn(() => true);
    device(PIXEL, { vibrate });
    const { hapticTick } = await load();
    hapticTick();
    vi.advanceTimersByTime(5);
    hapticTick();
    expect(vibrate).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(150);
    hapticTick();
    expect(vibrate).toHaveBeenCalledTimes(2);
  });

  it("does nothing, quietly, without a motor to ask or when the browser refuses", async () => {
    device(IPHONE);
    const { hapticTick } = await load();
    expect(() => hapticTick()).not.toThrow();

    device(PIXEL, {
      vibrate: () => {
        throw new Error("blocked");
      },
    });
    const again = await load();
    expect(() => again.hapticTick()).not.toThrow();
  });
});

describe("ticksThroughSwitch", () => {
  it("is an iPhone or an iPad — one that calls itself a Mac too — and nothing with the Vibration API", async () => {
    const { ticksThroughSwitch } = await load();
    device(IPHONE);
    expect(ticksThroughSwitch()).toBe(true);
    device(IPAD_AS_MAC, { touchPoints: 5 });
    expect(ticksThroughSwitch()).toBe(true);
    // A real Mac: no touch screen.
    device(IPAD_AS_MAC, { touchPoints: 0 });
    expect(ticksThroughSwitch()).toBe(false);
    device(PIXEL, { vibrate: () => true });
    expect(ticksThroughSwitch()).toBe(false);
    // Whatever says it is an iPhone but can vibrate uses that.
    device(IPHONE, { vibrate: () => true });
    expect(ticksThroughSwitch()).toBe(false);
  });
});

describe("watchHapticTriggers", () => {
  let haptics: Haptics;
  let stop: () => void = () => {};

  const label = (button: Element) => button.querySelector<HTMLLabelElement>(`:scope > label[${haptics.HAPTIC_LABEL}]`);
  /** The hidden switch the library puts in a button's label. */
  const switchOf = (button: Element) => label(button)?.querySelector<HTMLInputElement>("input[type=checkbox]") ?? null;

  beforeEach(async () => {
    haptics = await load();
    document.body.innerHTML = `
      <button id="go" style="position: relative"><span>Go</span></button>
      <button id="static">Static</button>
      <header style="position: relative"><button id="stretch" data-stretched>Title</button></header>
      <button id="off" style="position: relative" disabled>Off</button>
      <div id="card" role="button" style="position: relative"><button id="inner" style="position: relative">In</button></div>
      <a id="link" href="/x" style="position: relative">Link</a>`;
  });

  afterEach(() => stop());

  const $ = (id: string) => document.getElementById(id)!;

  it("does nothing where the browser doesn't tick through a switch", () => {
    device(PIXEL, { vibrate: () => true });
    stop = haptics.watchHapticTriggers();
    expect(document.querySelector(`[${haptics.HAPTIC_LABEL}]`)).toBeNull();
    expect(document.querySelector("input[switch]")).toBeNull();
  });

  describe("on an iPhone", () => {
    beforeEach(() => {
      device(IPHONE);
      stop = haptics.watchHapticTriggers();
    });

    it("has the library lay its label, with a hidden switch in it, over every button", () => {
      for (const id of ["go", "static", "stretch", "off", "inner"]) {
        const over = label($(id));
        expect(over, id).not.toBeNull();
        expect(over!.getAttribute("aria-hidden")).toBe("true");
        // The last thing in the button: over everything else it holds.
        expect($(id).lastElementChild).toBe(over);
        expect(switchOf($(id))?.hasAttribute("switch"), id).toBe(true);
      }
    });

    it("leaves alone a card that is a button, and a link", () => {
      // A label over the card would cover the card's own buttons.
      expect(label($("card"))).toBeNull();
      // Inside a link the label takes the click, and the link goes nowhere.
      expect(label($("link"))).toBeNull();
    });

    it("keeps the label on top of its button, and off a disabled one", () => {
      expect(getComputedStyle(label($("go"))!).zIndex).toBe("1");
      expect(getComputedStyle(label($("go"))!).display).not.toBe("none");
      expect(getComputedStyle(label($("off"))!).display).toBe("none");
    });

    it("lets the library make a static button the label's box, but not one that stretches its tap target over an ancestor", () => {
      expect($("static").style.position).toBe("relative");
      // Its label stretches over the header as the tap target does.
      expect($("stretch").style.position).toBe("");
      expect(label($("stretch"))).not.toBeNull();
    });

    it("a tap on the label is the button's click, once, and toggles the switch", () => {
      const clicks = vi.fn();
      $("go").addEventListener("click", clicks);

      label($("go"))!.click();

      expect(clicks).toHaveBeenCalledTimes(1);
      // What ticks, on the phone.
      expect(switchOf($("go"))!.checked).toBe(true);
    });

    it("gives a button its label as it arrives, and once only", async () => {
      const late = document.createElement("div");
      late.innerHTML = `<button id="late" style="position: relative">Late</button>`;
      document.body.append(late);
      await settled();
      expect(label($("late"))).not.toBeNull();
      expect($("late").querySelectorAll(`[${haptics.HAPTIC_LABEL}]`)).toHaveLength(1);
    });

    it("puts the label back when the button's text is written anew", async () => {
      // As React does for a button whose only child is its text.
      $("go").textContent = "Stop";
      expect(label($("go"))).toBeNull();
      await settled();
      expect(label($("go"))).not.toBeNull();
      expect($("go").textContent).toBe("Stop");
    });

    it("takes the labels away again when undone, and stops watching", async () => {
      stop();
      expect(document.querySelector(`[${haptics.HAPTIC_LABEL}]`)).toBeNull();
      expect(document.querySelector("input[switch]")).toBeNull();
      document.body.append(Object.assign(document.createElement("button"), { style: "position: relative" }));
      await settled();
      expect(document.querySelector(`[${haptics.HAPTIC_LABEL}]`)).toBeNull();
    });
  });
});
