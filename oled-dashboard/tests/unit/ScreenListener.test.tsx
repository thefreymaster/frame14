import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The socket, with its handlers kept so a test can play the server's event.
const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (v: unknown) => void>(),
  emit: vi.fn(),
}));
vi.mock("../../src/lib/socket", () => ({
  socket: {
    emit: mocks.emit,
    on: (event: string, fn: (v: unknown) => void) => {
      mocks.handlers.set(event, fn);
    },
    off: (event: string) => {
      mocks.handlers.delete(event);
    },
  },
}));

import { ScreenListener } from "../../src/components/ScreenListener";
import { setDeviceMode } from "../../src/lib/deviceMode";

const screen = (state: string) => act(() => mocks.handlers.get("screen")?.(state));
const brightness = (level: unknown) => act(() => mocks.handlers.get("brightness")?.(level));

describe("the screen listener", () => {
  const fully = {
    turnScreenOn: vi.fn(),
    turnScreenOff: vi.fn(),
    setScreenBrightness: vi.fn(),
    getScreenBrightness: vi.fn(() => 15),
  };

  beforeEach(() => {
    window.fully = fully;
    fully.turnScreenOn.mockReset();
    fully.turnScreenOff.mockReset();
    fully.setScreenBrightness.mockReset();
    fully.getScreenBrightness.mockReset().mockReturnValue(15);
    mocks.emit.mockReset();
    setDeviceMode("frame");
  });
  afterEach(() => {
    delete window.fully;
    mocks.handlers.clear();
  });

  it("turns a frame's screen off and on through Fully's interface", () => {
    render(<ScreenListener />);
    screen("off");
    expect(fully.turnScreenOff).toHaveBeenCalledTimes(1);
    expect(fully.turnScreenOn).not.toHaveBeenCalled();
    screen("on");
    expect(fully.turnScreenOn).toHaveBeenCalledTimes(1);
    // Anything else is not a state.
    screen("dim");
    expect(fully.turnScreenOff).toHaveBeenCalledTimes(1);
    expect(fully.turnScreenOn).toHaveBeenCalledTimes(1);
  });

  it("sets a frame's brightness, and only from a number (0.131)", () => {
    render(<ScreenListener />);
    brightness(120);
    expect(fully.setScreenBrightness).toHaveBeenCalledWith(120);
    brightness("120");
    brightness(null);
    expect(fully.setScreenBrightness).toHaveBeenCalledTimes(1);
  });

  it("tells the server the frame's brightness as it arrives (0.131)", () => {
    render(<ScreenListener />);
    expect(mocks.emit).toHaveBeenCalledWith("brightness_report", 15);
    // An older Fully without the call: nothing to report.
    mocks.emit.mockReset();
    window.fully = {
      turnScreenOn: fully.turnScreenOn,
      turnScreenOff: fully.turnScreenOff,
      setScreenBrightness: fully.setScreenBrightness,
    };
    render(<ScreenListener />);
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it("leaves a remote's screen alone, and reports nothing", () => {
    setDeviceMode("controller");
    render(<ScreenListener />);
    screen("off");
    brightness(120);
    expect(fully.turnScreenOff).not.toHaveBeenCalled();
    expect(fully.setScreenBrightness).not.toHaveBeenCalled();
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it("does nothing in a browser without Fully", () => {
    delete window.fully;
    render(<ScreenListener />);
    expect(() => screen("off")).not.toThrow();
    expect(() => brightness(120)).not.toThrow();
    expect(fully.turnScreenOff).not.toHaveBeenCalled();
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it("stops listening once unmounted", () => {
    const { unmount } = render(<ScreenListener />);
    expect(mocks.handlers.has("screen")).toBe(true);
    expect(mocks.handlers.has("brightness")).toBe(true);
    unmount();
    expect(mocks.handlers.has("screen")).toBe(false);
    expect(mocks.handlers.has("brightness")).toBe(false);
  });
});
