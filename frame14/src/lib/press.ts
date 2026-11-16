import type { SystemStyleObject } from "@chakra-ui/react";
import { hapticTick } from "./haptics";

/**
 * A press that feels like a real button's (0.170.0, the user: "I want the
 * button press to feel more like a real life button like it depresses when
 * pressed … Currently the animation feels shallow and on a wall mounted
 * tablet it's not great").
 *
 * What was wrong was mostly *when*: Chakra's buttons answer a hover, which a
 * touch screen never has, and the tiles' `:active` is the browser's — on
 * Android applied once it is sure the touch is no scroll, which for a quick
 * tap is after the finger has left. So the press is tracked here, off the
 * pointer itself (`watchPresses`): whatever is under it wears `data-pressing`
 * from the moment of contact, and anything styled with `pressable()` goes in
 * while it does —
 *
 * - **at contact**, fast (PRESS_IN_MS), and **all the way** even under the
 *   quickest tap: the press is held MIN_PRESS_MS at least;
 * - **further than before** (PRESS_SCALE: a button most, a whole card least —
 *   the same travel reads as less on a bigger thing), shaded along its top
 *   edge as a recess is (the theme's `press` shadow);
 * - and **springs back** when let go (PRESS_OUT_MS, a little past flat and
 *   back).
 *
 * A touch that starts where the page can scroll waits SCROLL_WAIT_MS before
 * it shows, as iOS and Android both do: a swipe that happens to start on a
 * tile is the page's, and the browser says so (pointercancel) before the tile
 * has moved. A tap quicker than the wait is shown as it ends.
 *
 * A tap that lands also ticks, where there is a motor (lib/haptics).
 */

/** The attribute a thing wears while it is held down. */
export const PRESSING = "data-pressing";

/** Going in, in ms: quick, as a finger is. */
export const PRESS_IN_MS = 80;
/** Coming back, in ms. */
export const PRESS_OUT_MS = 380;
/** The least a press is shown for, so the quickest tap still reaches the bottom. */
export const MIN_PRESS_MS = 120;
/** How long a touch on a scrolling page waits to be told from a scroll. */
export const SCROLL_WAIT_MS = 70;

/** What takes a press — and a tick as the tap lands. */
export const PRESSABLE = [
  "button",
  "[role=button]",
  "[role=tab]",
  "[role=menuitem]",
  "a[href]",
  "label[data-scope=switch]",
  "label[data-scope=segment-group]",
  "[data-pressable]",
].join(", ");

const DISABLED = ":disabled, [aria-disabled=true], [data-disabled]";

function pressableOf(target: EventTarget | null): Element | null {
  const el = target instanceof Element ? target.closest(PRESSABLE) : null;
  return el && !el.matches(DISABLED) ? el : null;
}

const SCROLLS = /auto|scroll/;
const FIXED = /hidden|clip/;

/** Whether a swipe starting on this element could scroll something. */
function scrollsUnder(el: Element): boolean {
  for (let box = el.parentElement; box; box = box.parentElement) {
    const tall = box.scrollHeight > box.clientHeight + 1;
    const wide = box.scrollWidth > box.clientWidth + 1;
    if (!tall && !wide) continue;
    const style = getComputedStyle(box);
    // The document scrolls by default (Safari on an iPhone, index.css); any
    // other box only when told to.
    const scrolls = (overflow: string) =>
      box === document.documentElement
        ? !FIXED.test(overflow)
        : SCROLLS.test(overflow);
    if ((tall && scrolls(style.overflowY)) || (wide && scrolls(style.overflowX)))
      return true;
  }
  return false;
}

type Press = {
  el: Element;
  pointerId: number;
  /** When it was shown; null while a touch still waits (SCROLL_WAIT_MS). */
  shownAt: number | null;
  wait?: ReturnType<typeof setTimeout>;
};

/**
 * Tracks presses for the whole page, and ticks on taps. Returns what undoes
 * it. Listens in the capture phase, on the document: a handler that stops an
 * event on its way up hides nothing from it, while a click swallowed on the
 * window before it (useLongPress, after a hold) is never seen — or felt.
 */
export function watchPresses(): () => void {
  let held: Press | null = null;
  let keyed: Press | null = null;
  // Let go of, and still down for the rest of MIN_PRESS_MS.
  const leaving = new Map<Element, ReturnType<typeof setTimeout>>();

  const show = (press: Press) => {
    clearTimeout(press.wait);
    clearTimeout(leaving.get(press.el));
    leaving.delete(press.el);
    press.shownAt = performance.now();
    press.el.setAttribute(PRESSING, "");
  };

  // The finger lifted: back up, once the press has been seen.
  const letGo = (press: Press) => {
    if (press.shownAt == null) show(press);
    const left = MIN_PRESS_MS - (performance.now() - press.shownAt!);
    const up = () => {
      leaving.delete(press.el);
      press.el.removeAttribute(PRESSING);
    };
    if (left <= 0) up();
    else leaving.set(press.el, setTimeout(up, left));
  };

  // The gesture turned out to be something else: up at once.
  const drop = (press: Press) => {
    clearTimeout(press.wait);
    if (press.shownAt != null) press.el.removeAttribute(PRESSING);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!e.isPrimary || e.button !== 0) return;
    if (held) drop(held);
    held = null;
    const el = pressableOf(e.target);
    if (!el) return;
    const press: Press = { el, pointerId: e.pointerId, shownAt: null };
    held = press;
    if (e.pointerType === "touch" && scrollsUnder(el))
      press.wait = setTimeout(show, SCROLL_WAIT_MS, press);
    else show(press);
  };
  const onPointerUp = (e: PointerEvent) => {
    if (held?.pointerId !== e.pointerId) return;
    letGo(held);
    held = null;
  };
  const onPointerCancel = (e: PointerEvent) => {
    if (held?.pointerId !== e.pointerId) return;
    drop(held);
    held = null;
  };
  const onBlur = () => {
    if (held) drop(held);
    if (keyed) drop(keyed);
    held = keyed = null;
  };

  // Space and Enter press the focused thing, as a finger would.
  const pressKey = (e: KeyboardEvent) => e.key === " " || e.key === "Enter";
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat || keyed || !pressKey(e)) return;
    const el = pressableOf(e.target);
    if (!el) return;
    keyed = { el, pointerId: -1, shownAt: null };
    show(keyed);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (!keyed || !pressKey(e)) return;
    letGo(keyed);
    keyed = null;
  };

  const onClick = (e: MouseEvent) => {
    if (pressableOf(e.target)) hapticTick();
  };

  const listeners = [
    ["pointerdown", onPointerDown],
    ["pointerup", onPointerUp],
    ["pointercancel", onPointerCancel],
    ["keydown", onKeyDown],
    ["keyup", onKeyUp],
    ["click", onClick],
  ] as [string, EventListener][];
  for (const [type, listener] of listeners)
    document.addEventListener(type, listener, true);
  window.addEventListener("blur", onBlur);

  return () => {
    for (const [type, listener] of listeners)
      document.removeEventListener(type, listener, true);
    window.removeEventListener("blur", onBlur);
    for (const press of [held, keyed]) if (press) drop(press);
    for (const [el, timer] of leaving) {
      clearTimeout(timer);
      el.removeAttribute(PRESSING);
    }
    leaving.clear();
    held = keyed = null;
  };
}

/** How far each kind of thing goes in: its size while held, of its size at rest. */
export const PRESS_SCALE = { button: 0.93, tile: 0.96, card: 0.985 } as const;

export type PressDepth = keyof typeof PRESS_SCALE;

/** Something else the element animates: the property, how long, and how. */
export type Tween = readonly [property: string, duration: string, easing?: string];

// Going in: straight down, easing onto the stop.
const PUSH = "cubic-bezier(0.2, 0, 0.4, 1)";
// Coming back: past flat by about a fifth of the travel, then home.
const SPRING = "cubic-bezier(0.3, 1.9, 0.5, 1)";

/**
 * The styles of something that goes in under a finger: for a component's
 * `css`, or a recipe's base.
 *
 * `also` lists whatever else the element animates. CSS has one transition
 * list an element, so the press's and the element's own must be written
 * together — here as the longhands, which a recipe's own `transitionProperty`
 * can't then half-override.
 *
 * `shade` (on unless told) draws the shadow of the pressed-in thing's top
 * edge, on `::after`: for anything with a face to shade — not a bare icon or
 * a label with no box round it. It needs the element positioned.
 *
 * The scale is the `scale` property, not a transform, so it composes with
 * whatever transform the element already has (a card being dragged).
 */
export function pressable(
  depth: PressDepth,
  { shade = true, also = [] }: { shade?: boolean; also?: readonly Tween[] } = {},
): SystemStyleObject {
  const tweens: Tween[] = [
    ["scale", `var(--press-ms, ${PRESS_OUT_MS}ms)`, `var(--press-ease, ${SPRING})`],
    ...also,
  ];
  const held = `&[${PRESSING}]`;
  return {
    transitionProperty: tweens.map(([property]) => property).join(", "),
    transitionDuration: tweens.map(([, duration]) => duration).join(", "),
    transitionTimingFunction: tweens
      .map(([, , easing]) => easing ?? "ease")
      .join(", "),
    [held]: {
      scale: String(PRESS_SCALE[depth]),
      "--press-ms": `${PRESS_IN_MS}ms`,
      "--press-ease": PUSH,
      // Still shaded, but nothing moves.
      _motionReduce: { scale: "1" },
    },
    ...(shade && {
      _after: {
        content: '""',
        position: "absolute",
        inset: "0",
        borderRadius: "inherit",
        pointerEvents: "none",
        boxShadow: "press",
        opacity: 0,
        transition: `opacity var(--press-ms, ${PRESS_OUT_MS}ms) ease`,
      },
      [`${held}::after`]: { opacity: 1 },
    }),
  };
}
