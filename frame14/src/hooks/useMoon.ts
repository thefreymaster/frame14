import { moonAt, nextMoonPhase, type Moon } from "../lib/moon";
import { useNow } from "./useNow";

/** The moon moves a percent of its disc in a couple of hours: looked at again this often. */
const MOON_EVERY_MS = 10 * 60_000;

/**
 * The moon now, for whatever shows it (MoonPhase's well, MoonLine): how it
 * stands (lib/moon's `moonAt`), which of the two it is on its way to — a
 * full moon while it grows, a new one once it wanes, and on the day of
 * either, the other — and that one's day. It reads the time through
 * `useNow`, not in render: the compiler would keep a `new Date()` for as
 * long as the card is up.
 */
export function useMoon(): { moon: Moon; toFull: boolean; next: Date } {
  const now = new Date(useNow(MOON_EVERY_MS));
  const moon = moonAt(now);
  const toFull = moon.phase === "new" || (moon.phase !== "full" && moon.waxing);
  return { moon, toFull, next: nextMoonPhase(now, toFull ? 2 : 0) };
}

/** A phase's day as the moon's readouts write it: "Nov 24". */
export const moonDay = (date: Date) =>
  date.toLocaleDateString([], { month: "short", day: "numeric" });

/** "53% lit · Full moon Nov 24": how much of the moon is lit, and what it is on its way to. */
export const moonDetail = ({
  moon,
  toFull,
  next,
}: {
  moon: Moon;
  toFull: boolean;
  next: Date;
}) =>
  `${Math.round(moon.lit * 100)}% lit · ${toFull ? "Full" : "New"} moon ${moonDay(next)}`;
