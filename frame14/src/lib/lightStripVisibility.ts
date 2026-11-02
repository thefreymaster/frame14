import { useSyncExternalStore } from "react";

// Whether this desktop shows the lights strip along the bottom (LightStrip,
// which Layout renders on desktops only). This device's own setting, kept in
// localStorage like the device mode and not synced: it is set from /control's
// Display card, which offers the switch on a desktop only. Shown unless the
// key says "hidden", so an untouched device follows the default.

const STORAGE_KEY = "light-strip";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getLightStripShown(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "hidden";
  } catch {
    return true;
  }
}

export function setLightStripShown(shown: boolean) {
  try {
    if (shown) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, "hidden");
  } catch {
    // ignore
  }
  listeners.forEach((cb) => cb());
}

/** This device's setting, re-rendering when /control switches it. */
export function useLightStripShown(): boolean {
  return useSyncExternalStore(
    subscribe,
    getLightStripShown,
    getLightStripShown,
  );
}
