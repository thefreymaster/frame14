import { describe, expect, it } from "vitest";
import { deviceName } from "../../src/lib/deviceName";

// 0.168.0: what a page calls its device, for the list of who is signed in.
const UA = {
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  ipadOld: "Mozilla/5.0 (iPad; CPU OS 12_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1",
  // An iPad's Safari says it is a Mac; so does a Mac's.
  macintosh: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  pixel: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  androidTablet: "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  chromebook: "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  linux: "Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0",
};

describe("deviceName", () => {
  it("names a phone, a tablet and a computer by what its browser says", () => {
    expect(deviceName(UA.iphone, 5, false)).toBe("iPhone");
    expect(deviceName(UA.ipadOld, 5, false)).toBe("iPad");
    expect(deviceName(UA.pixel, 5, false)).toBe("Android phone");
    expect(deviceName(UA.androidTablet, 5, false)).toBe("Android tablet");
    expect(deviceName(UA.windows, 0, false)).toBe("Windows PC");
    expect(deviceName(UA.chromebook, 0, false)).toBe("Chromebook");
    expect(deviceName(UA.linux, 0, false)).toBe("Linux PC");
    expect(deviceName("curl/8.5.0", 0, false)).toBe("Browser");
  });

  it("tells an iPad from a Mac by its touch screen, since both say Macintosh", () => {
    expect(deviceName(UA.macintosh, 0, false)).toBe("Mac");
    expect(deviceName(UA.macintosh, 5, false)).toBe("iPad");
    // A touch-screen Windows laptop is still a PC.
    expect(deviceName(UA.windows, 10, false)).toBe("Windows PC");
  });

  it("calls the kitchen frame a Frame, whatever its tablet says", () => {
    expect(deviceName(UA.androidTablet, 5, true)).toBe("Frame");
  });

  it("reads this browser when asked nothing", () => {
    // jsdom: a desktop browser's user agent on this machine's platform.
    expect(["Mac", "Windows PC", "Linux PC", "Browser"]).toContain(deviceName());
  });
});
