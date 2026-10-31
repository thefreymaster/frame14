import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The socket, with its handlers kept so a test can play the server's event.
const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (state: string) => void>(),
}));
vi.mock("../../src/lib/socket", () => ({
  socket: {
    emit: vi.fn(),
    on: (event: string, fn: (state: string) => void) => {
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

describe("the screen listener", () => {
  const fully = { turnScreenOn: vi.fn(), turnScreenOff: vi.fn() };

  beforeEach(() => {
    window.fully = fully;
    fully.turnScreenOn.mockReset();
    fully.turnScreenOff.mockReset();
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

  it("leaves a remote's screen alone", () => {
    setDeviceMode("controller");
    render(<ScreenListener />);
    screen("off");
    expect(fully.turnScreenOff).not.toHaveBeenCalled();
  });

  it("does nothing in a browser without Fully", () => {
    delete window.fully;
    render(<ScreenListener />);
    expect(() => screen("off")).not.toThrow();
    expect(fully.turnScreenOff).not.toHaveBeenCalled();
  });

  it("stops listening once unmounted", () => {
    const { unmount } = render(<ScreenListener />);
    expect(mocks.handlers.has("screen")).toBe(true);
    unmount();
    expect(mocks.handlers.has("screen")).toBe(false);
  });
});
