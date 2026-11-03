import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  getDeviceMode,
  isMobileUserAgent,
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
