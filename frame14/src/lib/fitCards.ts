import { packedDepths } from "./packCards";

/**
 * Which of its heights each card on /home takes so that the board fits the
 * screen without scrolling (0.171.0, the user: "I want the Home Screen on
 * frame14 and desktops to not scroll. Figure out a way so that cards are
 * shown but the content does not scroll. I want it to feel more native app
 * which there generally is no scrolling").
 *
 * A card isn't squeezed: it has stops — the heights at which it can be cut
 * cleanly, under a row of its content (an event, a row of tiles), down to
 * its header alone — and its whole height last (hooks/usePackedGrid reads
 * them off the page). The board is packed as ever (lib/packCards: a card's
 * column comes from the order, so nothing moves sideways), and while a
 * column runs past the screen one card steps down a stop. Which one, in
 * this order:
 *
 * - **the gentlest kind of step first**: one that still leaves the card two
 *   rows or more (a long list losing an event), before one that leaves it a
 *   single row (a card losing its second half), before one that folds a card
 *   to its header — so the calendar is trimmed before the thermostats lose a
 *   row, and nothing folds while anything can still give;
 * - then a step that ends the overflow by itself, over ones that only
 *   lessen it — one card folded rather than two;
 * - then the step that wastes the least: all of what it hides goes to the
 *   overflow, so a card in a column with room to spare gives up nothing and
 *   the last step taken is the one nearest the size of what is still over;
 * - then the longest card (the most stops still showing), the step that
 *   hides the least, and the card lower on the page.
 *
 * Then any card that can have a stop back without overflowing gets it, the
 * worst-off first: the steps are coarse, and the last one taken may have
 * made room for an earlier one to be undone.
 *
 * Heights and the limit are in the grid's rows (PACKED_ROW_PX each, a card's
 * with the gap under it), as packCards counts them. Returns, per card, the
 * index into its `stops` — the last one meaning whole. A board that can't be
 * made to fit (every card at its least) is left at that.
 */
export type FitCard = {
  span: number;
  /** The rows the card takes at each of its stops, shortest first; the last is all of it. */
  stops: number[];
};

/** Whether `a` comes before `b`: the greater at the first place they differ. */
function outranks(a: number[], b: number[]) {
  const k = a.findIndex((value, i) => value !== b[i]);
  return k >= 0 && a[k] > b[k];
}

export function fitCards(
  columns: number,
  cards: FitCard[],
  limit: number,
): number[] {
  const at = cards.map((card) => card.stops.length - 1);
  const over = () =>
    packedDepths(
      columns,
      cards.map((card, i) => ({ span: card.span, rows: card.stops[at[i]] })),
    ).reduce((sum, depth) => sum + Math.max(0, depth - limit), 0);

  let excess = over();
  while (excess > 0) {
    // What decides between two steps, the first that differs: the kind of
    // step, whether it is the last one needed, how little it wastes, how
    // long the card, how little it hides, how low on the page.
    let best: { card: number; excess: number; rank: number[] } | null = null;
    for (let i = 0; i < cards.length; i++) {
      if (at[i] === 0) continue;
      const { stops } = cards[i];
      at[i] -= 1;
      const after = over();
      at[i] += 1;
      const gained = excess - after;
      if (gained <= 0) continue;
      const given = Math.max(1, stops[at[i]] - stops[at[i] - 1]);
      const rank = [
        // What the step leaves: two rows or more, one, or the header.
        Math.min(at[i] - 1, 2),
        after === 0 ? 1 : 0,
        // To a hundredth: a row here or there doesn't make one step better.
        Math.round((100 * Math.min(gained, given)) / given),
        at[i],
        -given,
        i,
      ];
      if (!best || outranks(rank, best.rank))
        best = { card: i, excess: after, rank };
    }
    if (!best) break;
    at[best.card] -= 1;
    excess = best.excess;
  }

  if (excess === 0) {
    for (let changed = true; changed; ) {
      changed = false;
      const worstOff = cards
        .map((_, i) => i)
        .filter((i) => at[i] < cards[i].stops.length - 1)
        .sort((a, b) => at[a] - at[b]);
      for (const i of worstOff) {
        at[i] += 1;
        if (over() === 0) {
          changed = true;
          break;
        }
        at[i] -= 1;
      }
    }
  }
  return at;
}
