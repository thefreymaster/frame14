import { afterEach, describe, expect, it, vi } from "vitest";
import { pushSupport } from "../../src/lib/push";

// lib/push's pushSupport (0.160.0): what this device can do about
// notifications, which the Settings card says.

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const PIXEL = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";

function device({
  ua = PIXEL,
  secure = true,
  push = true,
  permission = "default",
  touch = 0,
  standalone = false,
}: { ua?: string; secure?: boolean; push?: boolean; permission?: NotificationPermission; touch?: number; standalone?: boolean } = {}) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);
  Object.defineProperty(navigator, "maxTouchPoints", { value: touch, configurable: true });
  vi.stubGlobal("isSecureContext", secure);
  Object.defineProperty(navigator, "standalone", { value: standalone, configurable: true });
  Object.defineProperty(navigator, "serviceWorker", { value: push ? {} : undefined, configurable: true });
  if (!push) delete (navigator as { serviceWorker?: unknown }).serviceWorker;
  vi.stubGlobal("PushManager", push ? class {} : undefined);
  if (!push) delete (window as { PushManager?: unknown }).PushManager;
  vi.stubGlobal("Notification", { permission });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (navigator as { standalone?: unknown }).standalone;
  delete (navigator as { maxTouchPoints?: unknown }).maxTouchPoints;
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
});

describe("pushSupport", () => {
  it("is available on Android's Chrome over https", () => {
    device();
    expect(pushSupport()).toBe("available");
  });

  it("needs https: the LAN's http address can't", () => {
    device({ secure: false });
    expect(pushSupport()).toBe("insecure");
  });

  it("needs the Home Screen app on an iPhone, and an iPad asking for the desktop site", () => {
    device({ ua: IPHONE, push: false });
    expect(pushSupport()).toBe("install");
    device({ ua: IPAD, push: false, touch: 5 });
    expect(pushSupport()).toBe("install");
    device({ ua: IPHONE, standalone: true });
    expect(pushSupport()).toBe("available");
  });

  it("leaves a Mac's Safari, which has no touch screen, alone", () => {
    device({ ua: IPAD, touch: 0 });
    expect(pushSupport()).toBe("available");
  });

  it("says so when the browser has no push, or the site's notifications are blocked", () => {
    device({ push: false });
    expect(pushSupport()).toBe("unsupported");
    device({ permission: "denied" });
    expect(pushSupport()).toBe("denied");
  });
});
