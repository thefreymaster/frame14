import { useSyncExternalStore } from "react";

const STORAGE_KEY = "device-mode";

export type DeviceMode = "controller" | "frame";

/**
 * A phone or an Android device by its user agent — the kitchen frame (an
 * Android tablet in Fully Kiosk) is one. Decides the first-visit device mode,
 * and keeps those devices out of useDesktop.
 */
export function isMobileUserAgent(): boolean {
  return /Mobi|Android/i.test(navigator.userAgent);
}

export function getDeviceMode(): DeviceMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "controller" || stored === "frame") return stored;

  // Auto-detect on first visit
  const mode: DeviceMode = isMobileUserAgent() ? "controller" : "frame";
  localStorage.setItem(STORAGE_KEY, mode);
  return mode;
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function setDeviceMode(mode: DeviceMode) {
  localStorage.setItem(STORAGE_KEY, mode);
  listeners.forEach((cb) => cb());
}

/** This device's mode, re-rendering when /control switches it. */
export function useDeviceMode(): DeviceMode {
  return useSyncExternalStore(subscribe, getDeviceMode, getDeviceMode);
}
