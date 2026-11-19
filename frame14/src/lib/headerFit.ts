/**
 * How much of the header there is room for (StatusBanner), written on its
 * row as `data-header-fit` for the stylesheet to act on:
 *
 * - `all`: the icon and the name, every button.
 * - `icon`: the name gone, the app's icon alone at the left — a phone on a
 *   busy day, each running appliance an icon (0.175.0: the name gives way
 *   to the buttons).
 * - `tight`: and the theme's toggle gone too, the one button with another
 *   way to what it does (Settings) — five appliances on a small phone.
 *
 * The row is a grid of three columns — the name, the buttons, the status
 * icons and a desktop's clock — whose outer two share what the buttons
 * leave, so the buttons sit in the header's middle (0.176.0, the user:
 * "Move all the actions buttons in the header to be in the center of the
 * header"; on a phone the two after the name hug what they hold and all of
 * it sits at the right end, 0.176.1). An outer column is never narrower
 * than what is in it, so when the three columns
 * are wider than the row, something has to go. Which is found by trying:
 * each level in turn, until the columns the browser lays out fit the row —
 * read from the layout itself, so it holds for any font, any number of
 * buttons and any width. The stylesheet could not do it alone: a column
 * either holds its content or gives it up, and the name is to stay while
 * there is room and go only when there is not.
 */
export type HeaderFit = "all" | "icon" | "tight";

const LEVELS: readonly HeaderFit[] = ["all", "icon", "tight"];

/** Whether the row's columns, as laid out now, fit in it. */
function fits(row: HTMLElement): boolean {
  const style = getComputedStyle(row);
  const columns = style.gridTemplateColumns.split(" ").map(parseFloat);
  // No layout to read (a test's DOM): nothing to give up.
  if (columns.length === 0 || columns.some(Number.isNaN)) return true;
  const room =
    row.clientWidth -
    parseFloat(style.paddingLeft) -
    parseFloat(style.paddingRight);
  return columns.reduce((sum, width) => sum + width, 0) <= room + 0.5;
}

/** Give the row the most it has room for. */
export function fitHeader(row: HTMLElement): HeaderFit {
  for (const level of LEVELS) {
    row.dataset.headerFit = level;
    if (fits(row)) return level;
  }
  return "tight";
}

/**
 * Keep the row fitted: now, when its width changes (a window, a phone
 * turned) and when an icon comes or goes in one of `groups`, the row's
 * groups of them — its buttons (the device made a remote) and its status
 * icons (an appliance starting). The fit only writes an attribute on the
 * row, which neither watch sees, so it never calls itself. Returns the way
 * to stop.
 */
export function watchHeaderFit(
  row: HTMLElement,
  groups: HTMLElement | readonly HTMLElement[] = row,
): () => void {
  const fit = () => void fitHeader(row);
  fit();
  const resized =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
  resized?.observe(row);
  const changed = new MutationObserver(fit);
  for (const group of Array.isArray(groups) ? groups : [groups]) {
    changed.observe(group, { childList: true, subtree: true });
  }
  return () => {
    resized?.disconnect();
    changed.disconnect();
  };
}
