import { flushSync } from "react-dom";

// Whoever has asked for less motion gets the change at once.
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** Whether this page can cross from one look to another now. */
function canCrossFade(): boolean {
  if (typeof document === "undefined") return false;
  if (typeof document.startViewTransition !== "function") return false;
  // A hidden page (the frame's screen off at Auto's hour, a phone in a
  // pocket) has nothing to fade and no frames to fade it in.
  if (document.visibilityState === "hidden") return false;
  return !window.matchMedia?.(REDUCED_MOTION).matches;
}

/**
 * Make `change` — the theme turning from bright to dark or back — with a
 * short crossfade (0.177.0, the user: "Add a small transition for when the
 * app changes from dark mode to light mode and vice versa").
 *
 * It is the browser's own view transition: a picture of the page as it was
 * is taken, `change` is made under it — the class on <html>, and React's
 * render of whatever reads the mode, flushed at once (`flushSync`) so it is
 * in the picture of the page as it is — and the one fades into the other,
 * the browser's crossfade (250 ms). Two pictures and their opacity, the
 * compositor's work: nothing of the page's own is animated, so no colour
 * of a token, a shadow, a mask or a chart is left behind or repainted
 * frame by frame, and nothing of `pressable`'s transitions is touched. A
 * transition on every element's colours could do none of that (CSS has one
 * transition list an element).
 *
 * Where there is no view transition (an older WebView or Safari), the page
 * is hidden, or motion is reduced, the change is made at once, as it always
 * was.
 */
export function crossFade(change: () => void): void {
  if (!canCrossFade()) {
    change();
    return;
  }
  document.startViewTransition(() => flushSync(change));
}
