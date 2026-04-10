const STORAGE_KEY = "device-mode";

export type DeviceMode = "controller" | "frame";

export function getDeviceMode(): DeviceMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "controller" || stored === "frame") return stored;

  // Auto-detect on first visit
  const mode: DeviceMode = /Mobi|Android/i.test(navigator.userAgent)
    ? "controller"
    : "frame";
  localStorage.setItem(STORAGE_KEY, mode);
  return mode;
}

export function setDeviceMode(mode: DeviceMode) {
  localStorage.setItem(STORAGE_KEY, mode);
}
