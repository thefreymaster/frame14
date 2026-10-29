import { useLayoutEffect, type DependencyList, type RefObject } from "react";
import { packCards } from "../lib/packCards";

/** Row height of a packed grid; give the grid `grid-auto-rows` of this. */
export const PACKED_ROW_PX = 2;

/**
 * Packs a CSS grid's children under each other like a masonry layout, so a
 * short card isn't followed by the empty height of the tallest card in its
 * row — with each card's column fixed by its place in the order
 * (lib/packCards), so a card changing height moves only the cards under it.
 *
 * The grid's rows are PACKED_ROW_PX tall (`grid-auto-rows`, `row-gap: 0`,
 * `align-items: start`), and each child carries `data-span`, the columns it
 * spans (its own `grid-column-end: span n`). Each child is measured — its
 * height plus one column gap, so items stand apart vertically as they do
 * across — and placed: `grid-column-start` and `grid-row` (where it starts
 * and the rows it spans), written straight to the DOM, since it changes
 * nothing React renders. A child with no height (display: none — a card with
 * nothing to show) takes no place. Every child is placed again whenever any
 * of them resizes — data arriving, a section collapsing, text re-flowing.
 *
 * Re-run (via `deps`) when the set, order or widths of the children change.
 */
export function usePackedGrid(
  ref: RefObject<HTMLElement | null>,
  columns: number,
  deps: DependencyList,
) {
  useLayoutEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    const gapPx = parseFloat(getComputedStyle(grid).columnGap) || 0;
    const items = Array.from(grid.children) as HTMLElement[];
    const place = (el: HTMLElement, column: string, row: string) => {
      if (el.style.gridColumnStart !== column) el.style.gridColumnStart = column;
      if (el.style.gridRow !== row) el.style.gridRow = row;
    };
    const pack = () => {
      const measured = items.map((el) => {
        // Layout height, not getBoundingClientRect: that one is scaled by
        // transforms, and /home mounts mid PageTransition's scale-in, so a
        // card measured then came out short and ate the gap below it.
        const height = el.offsetHeight;
        return {
          el,
          span: Number(el.dataset.span) || 1,
          rows: height > 0 ? Math.ceil((height + gapPx) / PACKED_ROW_PX) : 0,
        };
      });
      const onPage = measured.filter((m) => m.rows > 0);
      const places = packCards(columns, onPage);
      for (const m of measured) {
        if (m.rows === 0) place(m.el, "", "");
      }
      onPage.forEach((m, i) => {
        const { column, row } = places[i];
        place(m.el, String(column), `${row} / span ${m.rows}`);
      });
    };
    pack();
    const observer = new ResizeObserver(() => pack());
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller says when the children change
  }, deps);
}
