/**
 * Whether `at` (ms, or a Date; now by default) is Oct 30 or 31 in this
 * device's own time zone: the two days the Halloween page (routes/Halloween)
 * is offered — in the nav and on a remote's Views card. Pure, so the hook
 * (useHalloween) and the tests pick the day.
 */
export function isHalloween(at: number | Date = Date.now()): boolean {
  const d = at instanceof Date ? at : new Date(at);
  return d.getMonth() === 9 && d.getDate() >= 30;
}

/**
 * The greeting's neon tubes — orange, green, violet and pink — a letter each
 * in turn (components/halloween/NeonWord).
 */
export const NEON = ["#ff8a1f", "#4dff3a", "#c45cff", "#ff3fd8"];
