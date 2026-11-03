import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  getDeviceMode,
  isMobileUserAgent,
  isSafariEngine,
  setDeviceMode,
  useDeviceMode,
} from "../../src/lib/deviceMode";

const DESKTOP = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/141.0 Safari/537.36";
const PHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
const TABLET = "Mozilla/5.0 (Linux; Android 14; NXTPAPER 14) AppleWebKit/537.36 Chrome/129.0 Safari/537.36";

function userAgent(value: string) {
  Object.defineProperty(navigator, "userAgent", { value, configurable: true });
}

afterEach(() => {
  userAgent(DESKTOP);
});

describe("isMobileUserAgent", () => {
  it("is a phone or any Android device", () => {
    userAgent(DESKTOP);
    expect(isMobileUserAgent()).toBe(false);
    userAgent(PHONE);
    expect(isMobileUserAgent()).toBe(true);
    userAgent(TABLET);
    expect(isMobileUserAgent()).toBe(true);
  });
});

describe("getDeviceMode", () => {
  it("picks a mode from the user agent on the first visit and remembers it", () => {
    userAgent(PHONE);
    expect(getDeviceMode()).toBe("controller");
    expect(localStorage.getItem("device-mode")).toBe("controller");
    userAgent(DESKTOP);
    expect(getDeviceMode()).toBe("controller");
  });

  it("a desktop is a frame", () => {
    userAgent(DESKTOP);
    expect(getDeviceMode()).toBe("frame");
  });

  it("ignores a stored value that isn't a mode", () => {
    localStorage.setItem("device-mode", "toaster");
    userAgent(DESKTOP);
    expect(getDeviceMode()).toBe("frame");
  });
});

describe("useDeviceMode", () => {
  it("re-renders when the mode is switched", () => {
    userAgent(DESKTOP);
    const { result } = renderHook(() => useDeviceMode());
    expect(result.current).toBe("frame");
    act(() => setDeviceMode("controller"));
    expect(result.current).toBe("controller");
    expect(localStorage.getItem("device-mode")).toBe("controller");
  });
});

describe("Safari's engine (0.149.0: the modals' backdrop blur)", () => {
  const AGENTS = {
    iPhoneSafari: PHONE,
    iPhoneHomeScreen: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    iPhoneChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0 Mobile/15E148 Safari/604.1",
    iPad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
    macChrome: DESKTOP,
    macEdge: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36 Edg/141.0",
    macFirefox: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:144.0) Gecko/20100101 Firefox/144.0",
    frame: TABLET,
    fullyKiosk: "Mozilla/5.0 (Linux; Android 14; NXTPAPER 14 Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Safari/537.36",
    androidPhone: "Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36",
  };

  it("is every browser on an iPhone or iPad, and Safari on a Mac", () => {
    for (const name of ["iPhoneSafari", "iPhoneHomeScreen", "iPhoneChrome", "iPad"] as const) {
      expect(isSafariEngine(AGENTS[name]), name).toBe(true);
    }
  });

  it("is never Chrome, Edge or Firefox, nor anything on Android — the frame least of all", () => {
    for (const name of ["macChrome", "macEdge", "macFirefox", "frame", "fullyKiosk", "androidPhone"] as const) {
      expect(isSafariEngine(AGENTS[name]), name).toBe(false);
    }
  });
});
