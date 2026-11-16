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
 *   invisible `<label>` over it for one hidden switch (`watchHapticTriggers`):
 *   the tap lands on the label, bubbles to the button as its click, and the
 *   label hands the switch a trusted click of its own, which ticks. Nothing
 *   here is called at tap time. It rests on how Safari happens to work, not
 *   on anything Apple promises: if a release closes it, the taps go quiet and
 *   nothing else changes.
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

/** The label over a button, and the switch they all answer to. */
export const HAPTIC_LABEL = "data-haptic";
export const HAPTIC_SWITCH_ID = "haptic-switch";

// What gets a label: a button, and nothing wider. A card that is one big
// button holds buttons of its own, which a label over the whole card would
// cover; a link's navigation and a form control's label are the browser's
// own handling of the click, which a label inside would take over.
const TRIGGERS = "button";

// The label is the top of its button — over the button's own ::after too
// (the stretch of a `data-stretched` one), which comes after it in the tree:
// under that the tap lands on the button instead, and nothing ticks.
const STYLE = `
[${HAPTIC_LABEL}] {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  -webkit-tap-highlight-color: transparent;
}
:disabled > [${HAPTIC_LABEL}],
[aria-disabled="true"] > [${HAPTIC_LABEL}] {
  display: none;
}
#${HAPTIC_SWITCH_ID} {
  position: fixed;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  margin: 0;
  visibility: hidden;
}
`;

/** Whether this browser ticks through a switch: an iPhone or an iPad, with no Vibration API. */
export function ticksThroughSwitch(): boolean {
  if (typeof navigator.vibrate === "function") return false;
  const device = deviceName();
  return device === "iPhone" || device === "iPad";
}

// The buttons made `position: relative` here, to put back.
const positioned = new Set<HTMLElement>();

/**
 * On a static button that stretches its tap target over a positioned
 * ancestor with a pseudo-element (Board's collapsible header, the one such):
 * it says so, and is left static — its label then covers that same ancestor,
 * as the stretch does.
 */
export const STRETCHED = "data-stretched";

function decorate(button: Element) {
  if (button.querySelector(`:scope > [${HAPTIC_LABEL}]`)) return;
  // The label covers its containing block, which must be the button: under
  // any other static button it would cover someone else's box and hand the
  // button every tap there. So a static button is made the containing block.
  if (
    button instanceof HTMLElement &&
    getComputedStyle(button).position === "static" &&
    !button.hasAttribute(STRETCHED)
  ) {
    button.style.position = "relative";
    positioned.add(button);
  }
  const label = document.createElement("label");
  label.setAttribute(HAPTIC_LABEL, "");
  label.setAttribute("aria-hidden", "true");
  label.htmlFor = HAPTIC_SWITCH_ID;
  button.append(label);
}

function decorateWithin(root: Element) {
  if (root.matches(TRIGGERS)) decorate(root);
  for (const button of root.querySelectorAll(TRIGGERS)) decorate(button);
}

/**
 * Gives every button its label, now and as the page changes, on a browser
 * that ticks through a switch; does nothing on any other. Returns what undoes
 * it.
 */
export function watchHapticTriggers(): () => void {
  if (!ticksThroughSwitch()) return () => {};

  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.append(style);

  // Hidden by `visibility`, so it is never under a finger (a switch that is
  // takes the touch for its thumb, and the page stops scrolling), never
  // focused and not in the accessibility tree.
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = HAPTIC_SWITCH_ID;
  input.setAttribute("switch", "");
  document.body.append(input);

  // The click the label hands the switch is the switch's alone: no listener
  // of the page's should take it for a click outside whatever is open.
  const quiet = (e: Event) => {
    if (e.target === input) e.stopImmediatePropagation();
  };
  window.addEventListener("click", quiet, true);

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
    window.removeEventListener("click", quiet, true);
    for (const label of document.querySelectorAll(`[${HAPTIC_LABEL}]`))
      label.remove();
    for (const button of positioned) button.style.position = "";
    positioned.clear();
    input.remove();
    style.remove();
  };
}
