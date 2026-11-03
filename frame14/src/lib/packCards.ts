/**
 * Where each card goes on /home's packed grid: `columns` equal columns, each
 * card spanning `span` of them and `rows` of the grid's thin rows
 * (PACKED_ROW_PX each; hooks/usePackedGrid measures them).
 *
 * A card's column is decided by the order alone. Cards take the columns left
 * to right, and one that doesn't fit beside the card before it starts the
 * next band at the left — where a plain CSS grid would put them if every card
 * were one row tall. Its row is then as high as the cards above it in those
 * columns allow: directly under the lowest of them, as a masonry stacks. So a
 * card that changes height — a section expanding or collapsing, data
 * arriving, text re-flowing — moves only the cards under it, in its own
 * columns, down or up; no card ever moves sideways. (Until 0.126 the grid
 * packed by height alone, `grid-auto-flow: row dense`, which put each card in
 * the first hole it fit: a card changing height could send the cards after it
 * to another column.)
 *
 * Leave out cards that aren't on the page (display: none): a card here takes
 * a place. Columns and rows are 1-based grid lines, as CSS grid counts them.
 */
export type PackedCard = { span: number; rows: number };
export type CardPlacement = { column: number; row: number };

export function packCards(
  columns: number,
  cards: PackedCard[],
): CardPlacement[] {
  const width = Math.max(1, Math.floor(columns));
  // The first free row of each column.
  const free: number[] = Array(width).fill(1);
  // The column the next card starts at, in the band being filled.
  let next = 0;
  return cards.map(({ span, rows }) => {
    const across = Math.min(Math.max(1, Math.floor(span)), width);
    if (next + across > width) next = 0;
    const start = next;
    next += across;
    const row = Math.max(...free.slice(start, start + across));
    free.fill(row + Math.max(0, rows), start, start + across);
    return { column: start + 1, row };
  });
}
