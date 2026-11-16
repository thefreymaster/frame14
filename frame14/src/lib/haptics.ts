import { hapticTrigger } from "ios-haptics";
import { deviceName } from "./deviceName";

/**
 * A tick under the finger as a tap lands (0.170.0, the user: "use the
 * vibration engine on iPhone and android tablet to give some quick feedback
 * like switches do on iPhone").
 *
 * Two engines, and a browser has one or neither:
 *
 * - **The Vibration API** (`navigator.vibrate`: Android's Chrome and its
 *   WebView, so the frame, where the tablet has a motor and its browser may
 *   use it). `hapticTick` runs it; lib/press calls that on every tap of
 *   something pressable.
 * - **An iPhone's or iPad's Taptic Engine**, which Safari gives a page no
 *   call for at all. The one thing a page has that ticks is a real switch —
 *   `<input type="checkbox" switch>` — toggled by a real tap; a scripted
 *   click on one stopped ticking in iOS 26.5. So every button gets an
 *   invisible `<label>` over it that holds a hidden switch: the tap lands on
 *   the label, bubbles to the button as its click, and the label hands its
 *   switch a trusted click, which ticks. That part is the `ios-haptics`
 *   library's (`hapticTrigger`, since 0.170.1 — the user, of the first
 *   version's own code, which worked on the phone: "I'd like to use a
 *   maintained library"): how Safari can be made to tick is the library's to
 *   keep up with, and it rests on how Safari happens to work, not on
 *   anything Apple promises. What is here is which elements get it
 *   (`watchHapticTriggers`).
 */

/** How long the motor runs for a tick: enough to feel, too short to buzz. */
export const TICK_MS = 15;

// One tap can raise two clicks (a label's own and the one it hands its
// input): the second, a moment after the first, isn't another tick.
const GAP_MS = 40;

let lastTick = -Infinity;

/** One short tick, where the browser has a motor to ask. */
export function hapticTick() {
  const now = performance.now();
  if (now - lastTick < GAP_MS) return;
  lastTick = now;
  try {
    navigator.vibrate?.(TICK_MS);
  } catch {
    // A browser that refuses (no tap yet, a policy): nothing to feel.
  }
}

/** The label the library lays over a button (its attribute, not ours to name). */
export const HAPTIC_LABEL = "data-haptic-trigger";

// What gets a label: a button, and nothing wider. A card that is one big
// button holds buttons of its own, which a label over the whole card would
// cover; inside a link the label takes the click over, and the link no
// longer goes anywhere.
const TRIGGERS = "button";

/**
 * On a static button that stretches its tap target over a positioned
 * ancestor with a pseudo-element (Board's collapsible header, the one such):
 * it says so, and is kept static — its label then covers that same ancestor,
 * as the stretch does. The library makes any other static button the label's
 * containing block, so the label covers the button and nothing else.
 */
export const STRETCHED = "data-stretched";

// What the library's label needs of this app, beside its own inline styles.
// On top of its button — over the button's own ::after too (the stretch of a
// `data-stretched` one), which comes after it in the tree: under that the tap
// lands on the button instead, and nothing ticks. And gone from a disabled
// button, which would tick for a tap that does nothing.
const STYLE = `
[${HAPTIC_LABEL}] {
  z-index: 1;
}
:disabled > [${HAPTIC_LABEL}],
[aria-disabled="true"] > [${HAPTIC_LABEL}] {
  display: none;
}
`;

/** Whether this browser ticks through a switch: an iPhone or an iPad, with no Vibration API. */
export function ticksThroughSwitch(): boolean {
  if (typeof navigator.vibrate === "function") return false;
  const device = deviceName();
  return device === "iPhone" || device === "iPad";
}

function decorate(button: Element) {
  if (!(button instanceof HTMLElement)) return;
  const position = button.style.position;
  // Once only: the library leaves a button that has its label alone.
  hapticTrigger(button);
  if (button.hasAttribute(STRETCHED)) button.style.position = position;
}

function decorateWithin(root: Element) {
  if (root.matches(TRIGGERS)) decorate(root);
  for (const button of root.querySelectorAll(TRIGGERS)) decorate(button);
}

/**
 * Gives every button its label, now and as the page changes, on a browser
 * that ticks through a switch; does nothing on any other. Returns what undoes
 * it (the labels and the watching; a button the library positioned stays so).
 */
export function watchHapticTriggers(): () => void {
  if (!ticksThroughSwitch()) return () => {};

  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.append(style);

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) decorateWithin(node);
      }
      // React writing a button's text anew takes the label out with it.
      for (const node of record.removedNodes) {
        if (
          node instanceof Element &&
          node.hasAttribute(HAPTIC_LABEL) &&
          record.target instanceof Element &&
          record.target.isConnected
        )
          decorate(record.target);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  decorateWithin(document.body);

  return () => {
    observer.disconnect();
    for (const label of document.querySelectorAll(`[${HAPTIC_LABEL}]`))
      label.remove();
    style.remove();
  };
}
