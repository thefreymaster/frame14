import { useLayoutEffect, type DependencyList, type RefObject } from "react";

/** Row height of a packed grid; give the grid `grid-auto-rows` of this. */
export const PACKED_ROW_PX = 2;

/**
 * Packs a CSS grid's children under each other like a masonry layout, so a
 * short card isn't followed by the empty height of the tallest card in its
 * row.
 *
 * The grid's rows are PACKED_ROW_PX tall (`grid-auto-rows`, `row-gap: 0`,
 * `align-items: start`, `grid-auto-flow: row dense`), and each child is told
 * how many of them it spans: its measured height plus one column gap, so
 * items stand apart vertically as they do across. Children are re-measured
 * whenever they resize — data arriving, a section collapsing, text re-flowing
 * — and the span is written straight to the DOM, since it changes nothing
 * React renders.
 *
 * Re-run (via `deps`) when the set or order of children changes.
 */
export function usePackedRows(
  ref: RefObject<HTMLElement | null>,
  deps: DependencyList,
) {
  useLayoutEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    const gapPx = parseFloat(getComputedStyle(grid).columnGap) || 0;
    const fit = (el: HTMLElement) => {
      // Layout height, not getBoundingClientRect: that one is scaled by
      // transforms, and /home mounts mid PageTransition's scale-in, so a card
      // measured then came out short and ate the gap below it.
      const height = el.offsetHeight;
      el.style.gridRowEnd =
        height > 0 ? `span ${Math.ceil((height + gapPx) / PACKED_ROW_PX)}` : "";
    };
    const items = Array.from(grid.children) as HTMLElement[];
    items.forEach(fit);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) fit(entry.target as HTMLElement);
    });
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller says when the children change
  }, deps);
}
