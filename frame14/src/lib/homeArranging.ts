import { useSyncExternalStore } from "react";

// Whether /home is being arranged right now. HomeBoard sets it; Layout reads
// it for the parts of the shell outside the page — the header and the navs —
// which it veils and makes inert meanwhile (ArrangingVeil), so arranging is
// the only thing to do until Done.

let arranging = false;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function setHomeArranging(v: boolean) {
  if (arranging === v) return;
  arranging = v;
  listeners.forEach((cb) => cb());
}

export function useHomeArranging() {
  return useSyncExternalStore(
    subscribe,
    () => arranging,
    () => false,
  );
}
