import { useEffect, useState } from "react";

/**
 * The time now (ms), re-rendering every `everyMs`: for "running for 12m"
 * readouts that have to move while they're on screen. Mount it only where
 * the readout is shown (a menu that's open), not on every page.
 */
export function useNow(everyMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}
