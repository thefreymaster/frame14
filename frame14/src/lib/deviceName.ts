/**
 * What kind of device this page is on, for the list of who is signed in
 * (0.168.0, Settings' Account card): the page says it of itself as its
 * socket connects (lib/socket), since only the browser can tell — an iPad's
 * Safari calls itself a Mac, and gives itself away by having a touch screen.
 * The kitchen frame is a Frame (Fully Kiosk's `window.fully`).
 *
 * The server takes only these names (people.js's DEVICES — keep them in
 * step; access.test.js holds them together).
 */
export const DEVICE_NAMES = [
  "iPhone",
  "iPad",
  "Mac",
  "Windows PC",
  "Android phone",
  "Android tablet",
  "Chromebook",
  "Linux PC",
  "Frame",
  "Browser",
] as const;

export type DeviceName = (typeof DEVICE_NAMES)[number];

export function deviceName(
  userAgent: string = navigator.userAgent,
  touchPoints: number = navigator.maxTouchPoints ?? 0,
  fully: boolean = window.fully != null,
): DeviceName {
  if (fully) return "Frame";
  if (/iPhone|iPod/.test(userAgent)) return "iPhone";
  if (/iPad/.test(userAgent)) return "iPad";
  if (/Android/.test(userAgent)) {
    return /Mobi/.test(userAgent) ? "Android phone" : "Android tablet";
  }
  if (/CrOS/.test(userAgent)) return "Chromebook";
  if (/Macintosh/.test(userAgent)) return touchPoints > 1 ? "iPad" : "Mac";
  if (/Windows/.test(userAgent)) return "Windows PC";
  if (/Linux|X11/.test(userAgent)) return "Linux PC";
  return "Browser";
}
