import { useEffect, useState } from "react";

/**
 * Runs the CSS animations on an element, and on everything inside it, at
 * `rate` times their own pace — a callback ref for the element. A rate, not
 * a new animation-duration: a CSS animation keeps its start time when its
 * duration changes, so it would jump to another place at every reading,
 * where a new rate carries on from where it is.
 *
 * Whenever one of them starts again it is paced again (`animationstart`):
 * the browser makes a CSS animation anew when its element comes back from
 * `display: none` — a folded card opened again, reduced motion turned off —
 * or its keyframes change, and a new one runs at its own pace. PowerFlow's
 * waves ran at the 1 kW pace that way after the Home card was folded and
 * opened, whatever the power, until the next reading.
 */
export function usePlaybackRate(rate: number) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!element) return;
    const pace = () => {
      for (const animation of element.getAnimations({ subtree: true })) {
        animation.playbackRate = rate;
      }
    };
    pace();
    element.addEventListener("animationstart", pace);
    return () => element.removeEventListener("animationstart", pace);
  }, [element, rate]);
  return setElement;
}
