import { useSyncExternalStore } from "react";

// Whether this device reloads itself as soon as a newer version of the add-on
// is installed (appVersion's check), instead of showing the toast with the
// Refresh button. This device's own setting, kept in localStorage like the
// device mode and not synced: a kiosk frame wants the reload, a phone in
// someone's hand may not. Off unless the key says "on".

const STORAGE_KEY = "auto-refresh";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getAutoRefresh(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function setAutoRefresh(on: boolean) {
  try {
    if (on) localStorage.setItem(STORAGE_KEY, "on");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  listeners.forEach((cb) => cb());
}

/** This device's setting, re-rendering when /control switches it. */
export function useAutoRefresh(): boolean {
  return useSyncExternalStore(subscribe, getAutoRefresh, getAutoRefresh);
}
