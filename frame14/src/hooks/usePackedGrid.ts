import { useLayoutEffect, type DependencyList, type RefObject } from "react";
import { fitCards } from "../lib/fitCards";
import { packCards } from "../lib/packCards";

/** Row height of a packed grid; give the grid `grid-auto-rows` of this. */
export const PACKED_ROW_PX = 2;

/**
 * A grid that must fit a height (0.171.0, /home where it doesn't scroll):
 * `frame` is the element whose height, less its padding, the grid may take,
 * and `box` finds the part of a child that is cut short when it must be —
 * its card — or nothing for a child that is left whole.
 */
export type GridFit = {
  frame: RefObject<HTMLElement | null>;
  box: (item: HTMLElement) => HTMLElement | null;
  /**
   * The child's button that opens it out whole: shown over a cut box's foot
   * with what is hidden ("+3 more"), or over all of one folded to its header.
   */
  more: (item: HTMLElement) => HTMLElement | null;
};

/** Where a card can be cut: under one of these. Not counted in "+N more" when `="block"`. */
const FIT_ROW = "[data-fit-row]";

/** The top of `el` from the top of `box`'s padding box, in layout pixels. */
function topWithin(el: HTMLElement, box: HTMLElement): number {
  let y = 0;
  for (
    let node: HTMLElement | null = el;
    node && node !== box;
    node = node.offsetParent as HTMLElement | null
  )
    y += node.offsetTop;
  return y;
}

type Stop = { height: number; more: string; folded?: boolean };
type Row = { el: HTMLElement; bottom: number; counted: boolean };

// Cut off, not merely hidden: `clip` can't be scrolled, where a box that is
// `hidden` scrolls to whatever takes the focus inside it — a tile under the
// cut would pull the card's content up over its header.
const CUT_OVERFLOW =
  typeof CSS !== "undefined" && CSS.supports("overflow", "clip")
    ? "clip"
    : "hidden";

/**
 * The heights a card can take, shortest first, the last its whole: its
 * header alone (as a collapsed card looks), then down to under each row of
 * its content — each with the card's own padding left under it, where the
 * button that says how much is hidden, and opens it out, goes (index.css's
 * `.home-card-more`).
 */
function stopsOf(box: HTMLElement): {
  stops: Stop[];
  rows: Row[];
  pad: number;
  under: number;
} {
  const edges = box.offsetHeight - box.clientHeight;
  // Whatever it is cut to now, its content is all there to be measured.
  const whole = box.scrollHeight + edges;
  const body = box.querySelector<HTMLElement>(".chakra-card__body");
  const pad = body ? parseFloat(getComputedStyle(body).paddingBottom) || 0 : 0;
  const rows: Row[] = Array.from(box.querySelectorAll<HTMLElement>(FIT_ROW))
    .filter((row) => row.offsetHeight > 0)
    .map((row) => ({
      el: row,
      bottom: topWithin(row, box) + row.offsetHeight,
      counted: row.dataset.fitRow !== "block",
    }));
  const more = (below: number) => {
    const hidden = rows.filter((row) => row.bottom > below + 1);
    const counted = hidden.filter((row) => row.counted).length;
    return counted > 0 ? `+${counted} more` : hidden.length > 0 ? "More" : "";
  };
  const stops: Stop[] = [];
  const header = box.querySelector<HTMLElement>(".chakra-card__header");
  if (header && body) {
    const bottom = topWithin(header, box) + header.offsetHeight;
    stops.push({ height: bottom + pad + edges, more: "", folded: true });
  }
  for (const bottom of new Set(rows.map((row) => row.bottom))) {
    stops.push({ height: bottom + pad + edges, more: more(bottom) });
  }
  // Shortest first, a pixel or two apart counting as one, and none as tall
  // as the whole card.
  const sorted = stops
    .filter((stop) => stop.height < whole - 2)
    .sort((a, b) => a.height - b.height)
    .filter((stop, i, all) => i === 0 || stop.height - all[i - 1].height > 2);
  return {
    stops: [...sorted, { height: whole, more: "" }],
    rows,
    // What a stop's height holds besides the content down to its row: the
    // card's padding again, and its edges.
    pad,
    under: pad + edges,
  };
}

/**
 * Cuts a card to `stop`, or lets it be whole again. The rows under the cut
 * are made inert as well as unseen — not in the tab order, nor read out —
 * and the child's button to the whole card is shown: along the foot of a cut
 * box, saying what is hidden, or over all of a folded one.
 */
function cut(
  item: HTMLElement,
  box: HTMLElement,
  more: HTMLElement | null,
  stop: Stop | null,
  rows: Row[] = [],
  pad = 0,
  under = 0,
) {
  const max = stop ? `${stop.height}px` : "";
  if (box.style.maxHeight !== max) box.style.maxHeight = max;
  const overflow = stop ? CUT_OVERFLOW : "";
  if (box.style.overflow !== overflow) box.style.overflow = overflow;
  for (const row of rows) {
    const hidden = stop != null && row.bottom > stop.height - under + 1;
    if (row.el.inert !== hidden) row.el.inert = hidden;
  }
  if (stop) {
    const how = stop.folded ? "header" : "";
    if (item.dataset.fitCut !== how) item.dataset.fitCut = how;
  } else {
    delete item.dataset.fitCut;
  }
  if (!more) return;
  if (more.hidden !== (stop == null)) more.hidden = stop == null;
  const words = stop && !stop.folded ? stop.more : "";
  if (more.textContent !== words) more.textContent = words;
  const height = stop && !stop.folded ? `${pad}px` : "";
  if (more.style.height !== height) more.style.height = height;
}

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
 * With `fit`, the grid is also held to its frame's height: each child's box
 * is read for the heights it can be cut to (stopsOf: under a `data-fit-row`
 * of its content, or to its header), lib/fitCards picks one each so no
 * column runs past the frame, and the box is cut to it — a `max-height` and
 * no overflow, with `data-fit-cut` on the child (`="header"` when it is
 * folded to its header alone, which shows a card's `data-fit-folded` words),
 * the rows under the cut inert, and the child's `more` button shown with
 * what is hidden ("+3 more"), which opens the card out whole. Nothing React renders changes there either: a cut card
 * still holds all of its content, so what it would take whole can always be
 * measured (its scrollHeight), and a card that has room again gets it back.
 *
 * Re-run (via `deps`) when the set, order or widths of the children change,
 * or `fit` comes or goes.
 */
export function usePackedGrid(
  ref: RefObject<HTMLElement | null>,
  columns: number,
  deps: DependencyList,
  fit?: GridFit,
) {
  useLayoutEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    const gapPx = parseFloat(getComputedStyle(grid).columnGap) || 0;
    const items = Array.from(grid.children) as HTMLElement[];
    const frame = fit?.frame.current ?? null;
    const rowsOf = (height: number) =>
      Math.ceil((height + gapPx) / PACKED_ROW_PX);
    const place = (el: HTMLElement, column: string, row: string) => {
      if (el.style.gridColumnStart !== column) el.style.gridColumnStart = column;
      if (el.style.gridRow !== row) el.style.gridRow = row;
    };
    // What a resize of means the grid is to be packed again: every child, and
    // with `fit` the frame and the parts of each box — which go on changing
    // size inside a box that is cut and so doesn't.
    const watched = new Set<Element>();
    const observer = new ResizeObserver(() => pack());
    const watch = (el: Element) => {
      if (watched.has(el)) return;
      watched.add(el);
      observer.observe(el);
    };

    const pack = () => {
      const measured = items.map((el) => {
        // Layout height, not getBoundingClientRect: that one is scaled by
        // transforms, and /home mounts mid PageTransition's scale-in, so a
        // card measured then came out short and ate the gap below it.
        const height = el.offsetHeight;
        const box = height > 0 && frame ? (fit?.box(el) ?? null) : null;
        if (box) for (const part of box.children) watch(part);
        return {
          el,
          box,
          span: Number(el.dataset.span) || 1,
          // What the child holds besides its box, which keeps its height.
          around: box ? height - box.offsetHeight : 0,
          ...(box
            ? stopsOf(box)
            : {
                stops: [{ height, more: "" } satisfies Stop],
                rows: [],
                pad: 0,
                under: 0,
              }),
          shown: height > 0,
        };
      });
      const onPage = measured.filter((m) => m.shown);

      // Each card whole — or, held to a frame, at the stop that fits.
      let at = onPage.map((m) => m.stops.length - 1);
      if (frame) {
        const style = getComputedStyle(frame);
        const room =
          frame.clientHeight -
          (parseFloat(style.paddingTop) || 0) -
          (parseFloat(style.paddingBottom) || 0);
        at = fitCards(
          columns,
          onPage.map((m) => ({
            span: m.span,
            stops: m.stops.map((stop) => rowsOf(m.around + stop.height)),
          })),
          // The gap under the last card of a column may hang over the edge.
          Math.floor((room + gapPx) / PACKED_ROW_PX),
        );
      }
      onPage.forEach((m, i) => {
        if (!m.box) return;
        const stop = at[i] < m.stops.length - 1 ? m.stops[at[i]] : null;
        cut(m.el, m.box, fit?.more(m.el) ?? null, stop, m.rows, m.pad, m.under);
      });

      const places = packCards(
        columns,
        onPage.map((m, i) => ({
          span: m.span,
          rows: rowsOf(m.around + m.stops[at[i]].height),
        })),
      );
      for (const m of measured) {
        if (!m.shown) place(m.el, "", "");
      }
      onPage.forEach((m, i) => {
        const { column, row } = places[i];
        const rows = rowsOf(m.around + m.stops[at[i]].height);
        place(m.el, String(column), `${row} / span ${rows}`);
      });
    };

    pack();
    items.forEach(watch);
    if (frame) watch(frame);
    return () => {
      observer.disconnect();
      // Whole again: the next run, or a grid no longer held, starts clean.
      for (const el of items) {
        const box = fit?.box(el);
        if (!box) continue;
        const rows = Array.from(box.querySelectorAll<HTMLElement>(FIT_ROW));
        cut(
          el,
          box,
          fit?.more(el) ?? null,
          null,
          rows.map((row) => ({ el: row, bottom: 0, counted: false })),
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller says when the children change
  }, deps);
}
