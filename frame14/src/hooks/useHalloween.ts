import { isHalloween } from "../lib/halloween";
import { useNow } from "./useNow";

/**
 * Oct 30 or 31 today, re-read every minute: the nav's Halloween entry and
 * the Views card's tile arrive at midnight on the 30th and go at midnight on
 * Nov 1 without a reload, and the page itself notices the day end.
 */
export function useHalloween(): boolean {
  return isHalloween(useNow(60_000));
}
