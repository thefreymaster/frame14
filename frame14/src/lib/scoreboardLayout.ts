/**
 * How the /football score bug lies in the box it is given (0.178.1).
 *
 * It went by the window until then — every size a `vmin`, and one of two
 * arrangements by the window's orientation — which is right only where the
 * page has the whole screen. With a game pinned over the app on the frame the
 * window is nearly square, a hair wider than tall: that was "landscape", so
 * the broadcast row meant for a 16:9 desktop was drawn in a box with a third
 * less width than it needs, the names cut to a letter and the scores over the
 * clock (the user: "the football should be more responsive for smaller
 * screen sizes like this").
 *
 * So the scoreboard measures **its own box**, a size container, and
 * everything in it is drawn in a unit of that box (`--scoreboard-unit`),
 * never the window's. There are three arrangements, each drawn for a box of
 * its own shape (SCOREBOARD_BOX, in units): the unit is whichever of the
 * box's width and height runs out first, so an arrangement always fits the
 * box it is in — and two games on one day, half the page each, fit theirs.
 *
 * - `tall` — one team a row, the name over its score, the clock a band
 *   between them: the frame upright (a unit is 16px there, the `vmin` it
 *   always was) and a phone.
 * - `wide` — the same rows in a box too short for them, the score beside the
 *   name instead of under it: the frame with its screen shared, a squarish
 *   window. 121 units across: a ranked team of fourteen letters with the
 *   ball, beside a score of two figures.
 * - `broadcast` — cap | team | clock | team | cap across one row: a desktop,
 *   a phone on its side. Its box is 184 units wide, what the row takes with
 *   two-figure scores and the down beside one of them; drawn by the window's
 *   height alone it ran a 28 into the clock on a 16:9 screen.
 *
 * The stylesheet picks (container queries, below); `scoreboardLayoutFor` and
 * `scoreboardUnit` say the same thing in numbers, for the tests to hold the
 * two together.
 */
export type ScoreboardLayout = "tall" | "wide" | "broadcast";

/** The size container's name. */
export const SCOREBOARD = "scoreboard";

/** The box each arrangement is drawn for, in units. */
export const SCOREBOARD_BOX: Record<
  ScoreboardLayout,
  { width: number; height: number }
> = {
  tall: { width: 96.5, height: 126 },
  wide: { width: 121, height: 104 },
  broadcast: { width: 184, height: 72 },
};

/**
 * The box's shape (width : height) from which the wide rows are drawn, and
 * from which the broadcast row. 24:25 is where `tall` and `wide` come to the
 * same unit (121 units across to 126 down), so the score doesn't jump as a
 * box crosses it; the broadcast row starts between a shared frame's widest
 * box and a 16:9 desktop's page.
 */
export const WIDE_FROM = [24, 25] as const;
export const BROADCAST_FROM = [17, 10] as const;

const atLeast = ([w, h]: readonly [number, number]) =>
  `(min-aspect-ratio: ${w}/${h})`;

/** Style keys: what holds only in that arrangement. `tall` is the styles without one. */
export const WIDE = `@container ${SCOREBOARD} ${atLeast(WIDE_FROM)} and (not ${atLeast(BROADCAST_FROM)})`;
export const BROADCAST = `@container ${SCOREBOARD} ${atLeast(BROADCAST_FROM)}`;

/** The custom property every size in the scoreboard is a multiple of. */
export const UNIT_VAR = "--scoreboard-unit";
/** And one saying which arrangement the stylesheet picked, for the tests. */
export const LAYOUT_VAR = "--scoreboard-layout";

const round = (n: number) => Math.round(n * 10000) / 10000;

/** An arrangement's unit as the stylesheet works it out, in the container's own units. */
export function unitCss(layout: ScoreboardLayout): string {
  const { width, height } = SCOREBOARD_BOX[layout];
  return `min(${round(100 / width)}cqw, ${round(100 / height)}cqh)`;
}

/**
 * `n` units, as a CSS length. With `floor`, never under it — for the small
 * print (the strip, the play), which a phone's unit takes under 10px.
 */
export function u(n: number, floor?: string): string {
  const length = `calc(var(${UNIT_VAR}) * ${n})`;
  return floor ? `max(${length}, ${floor})` : length;
}

/** The arrangement for a box of that size. */
export function scoreboardLayoutFor(
  width: number,
  height: number,
): ScoreboardLayout {
  if (width * BROADCAST_FROM[1] >= height * BROADCAST_FROM[0]) {
    return "broadcast";
  }
  if (width * WIDE_FROM[1] >= height * WIDE_FROM[0]) return "wide";
  return "tall";
}

/** A unit's length in a box of that size, in the box's own pixels. */
export function scoreboardUnit(width: number, height: number): number {
  const box = SCOREBOARD_BOX[scoreboardLayoutFor(width, height)];
  return Math.min(width / box.width, height / box.height);
}
