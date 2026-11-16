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

// What gets a label: what lib/press calls pressable, less two kinds. A real
// switch ticks by itself (ui/switch.tsx). And a link is left without: inside
// one the label takes the click over, and the link no longer goes anywhere.
// (0.171.0: buttons alone until then — the user, of the nav's More menu on a
// phone: "These menu items don't have haptics on click".)
const TRIGGERS = [
  "button",
  "[role=button]",
  "[role=menuitem]",
  "label[data-scope=segment-group]",
].join(", ");

// A trigger that holds pressable things of its own (a card that is one big
// button, with buttons in it) goes without: the label would lie over them.
// A segment's own radio is the one thing a trigger may hold.
const HELD = "button, [role=button], [role=menuitem], a[href], label, input:not([type=radio])";

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
// thing, which would tick for a tap that does nothing.
const STYLE = `
[${HAPTIC_LABEL}] {
  z-index: 1;
}
:disabled > [${HAPTIC_LABEL}],
[aria-disabled="true"] > [${HAPTIC_LABEL}],
[data-disabled] > [${HAPTIC_LABEL}] {
  display: none;
}
`;

/** Whether this browser ticks through a switch: an iPhone or an iPad, with no Vibration API. */
export function ticksThroughSwitch(): boolean {
  if (typeof navigator.vibrate === "function") return false;
  const device = deviceName();
  return device === "iPhone" || device === "iPad";
}

const labelOf = (trigger: Element) =>
  trigger.querySelector(`:scope > [${HAPTIC_LABEL}]`);

/** Whether the trigger holds something pressable besides the label's own switch. */
function holdsPressables(trigger: Element) {
  for (const held of trigger.querySelectorAll(HELD)) {
    if (!held.closest(`[${HAPTIC_LABEL}]`)) return true;
  }
  return false;
}

function decorate(trigger: Element) {
  if (!(trigger instanceof HTMLElement)) return;
  if (holdsPressables(trigger)) {
    labelOf(trigger)?.remove();
    return;
  }
  const position = trigger.style.position;
  // Once only: the library leaves alone what has its label already.
  hapticTrigger(trigger);
  if (trigger.hasAttribute(STRETCHED)) trigger.style.position = position;
}

function decorateWithin(root: Element) {
  if (root.matches(TRIGGERS)) decorate(root);
  for (const trigger of root.querySelectorAll(TRIGGERS)) decorate(trigger);
  // Something pressable arriving inside a trigger takes that trigger's label.
  if (root.hasAttribute(HAPTIC_LABEL)) return;
  for (
    let outer = root.parentElement?.closest(TRIGGERS);
    outer;
    outer = outer.parentElement?.closest(TRIGGERS)
  )
    decorate(outer);
}

// A segment of a segmented control is a <label> round its radio. With the
// library's label inside it, that inner label is what takes the tap — and
// the outer one no longer hands its radio the click (a label does nothing
// for a click on something interactive inside it). So it is handed over
// here: the tap that lands on a haptic label inside a label clicks the
// outer label's own control.
function handOver(e: MouseEvent) {
  const label = e.target;
  if (!(label instanceof HTMLLabelElement) || !label.hasAttribute(HAPTIC_LABEL))
    return;
  const outer = label.parentElement;
  if (!(outer instanceof HTMLLabelElement)) return;
  for (const control of outer.querySelectorAll("input")) {
    if (!label.contains(control)) return control.click();
  }
}

/**
 * Gives everything pressable its label, now and as the page changes, on a
 * browser that ticks through a switch; does nothing on any other. Returns what undoes
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
  document.addEventListener("click", handOver, true);

  return () => {
    observer.disconnect();
    document.removeEventListener("click", handOver, true);
    for (const label of document.querySelectorAll(`[${HAPTIC_LABEL}]`))
      label.remove();
    style.remove();
  };
}
