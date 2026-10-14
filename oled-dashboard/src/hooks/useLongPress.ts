import { useEffect, useRef } from "react";

/**
 * Press and hold to trigger, as on a phone's home screen. Moving more than a
 * few pixels first cancels it, so scrolling the page never counts as a hold.
 *
 * Returns pointer handlers to spread on the element. Presses that only reach
 * it through a React portal (a modal opened from a card) are ignored — React
 * bubbles them here, but they aren't on this part of the page.
 */
export function useLongPress(
  onLongPress: () => void,
  { delayMs = 600, tolerancePx = 10, enabled = true } = {},
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
  };

  useEffect(() => cancel, []);

  if (!enabled) return {};

  return {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (!e.isPrimary || e.button !== 0) return;
      if (!e.currentTarget.contains(e.target as Node)) return;
      cancel();
      origin.current = { x: e.clientX, y: e.clientY };
      timer.current = setTimeout(() => {
        timer.current = null;
        origin.current = null;
        swallowClickAfterRelease();
        onLongPress();
      }, delayMs);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const from = origin.current;
      if (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) > tolerancePx) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    // Android raises a context menu on a long touch; it must not win the race.
    onContextMenu: (e: React.MouseEvent) => {
      if (timer.current) e.preventDefault();
    },
  };
}

/**
 * The finger that held is still down when the hold fires; letting go would
 * then "click" whatever it was resting on — collapsing a card, opening a
 * modal. Eat that one click; the next press clears the trap if no click comes.
 */
function swallowClickAfterRelease() {
  const swallow = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cleanup();
  };
  const cleanup = () => {
    window.removeEventListener("click", swallow, true);
    window.removeEventListener("pointerdown", cleanup, true);
  };
  window.addEventListener("click", swallow, true);
  window.addEventListener("pointerdown", cleanup, true);
}
