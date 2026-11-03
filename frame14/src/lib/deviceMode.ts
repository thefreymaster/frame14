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

/**
 * Whether the page behind a modal may be blurred here (0.150.0): anything but
 * Android — an iPhone, an iPad, and every desktop browser, Chrome, Edge and
 * Firefox as well as Safari (0.149.0 had Safari's engine alone; the user:
 * "Can we have the blur behind dialogs and drawers on desktop chrome also?
 * Exclude android"). The frame, an Android tablet in Fully Kiosk, recomputed a
 * full-screen backdrop-filter on every frame of a drawer's slide (0.135.1),
 * so no Android device gets it, a phone neither.
 */
export function blursModalBackdrop(userAgent = navigator.userAgent): boolean {
  return !/Android/i.test(userAgent);
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

/** Calls `cb` whenever /control switches this device's mode. */
export function subscribeDeviceMode(cb: () => void) {
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
  return useSyncExternalStore(subscribeDeviceMode, getDeviceMode, getDeviceMode);
}
