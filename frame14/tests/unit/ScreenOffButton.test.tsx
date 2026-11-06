import { act, fireEvent, screen as dom, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "./helpers/render";

// The socket, its handlers kept so a test can play the server's screen_state.
const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (v: unknown) => void>(),
}));
vi.mock("../../src/lib/socket", () => ({
  socket: {
    emit: vi.fn(),
    on: vi.fn((name: string, handler: (v: unknown) => void) => mocks.handlers.set(name, handler)),
    off: vi.fn(),
  },
}));

import { ScreenOffButton } from "../../src/components/ScreenOffButton";
import { setDeviceMode } from "../../src/lib/deviceMode";
import { DEFAULT_SCREEN, setScreen } from "../../src/lib/screen";

/** The server's `screen_state`, as lib/screen hears it. */
const serverSays = (state: "on" | "off") =>
  act(() => mocks.handlers.get("screen_state")?.({ ...DEFAULT_SCREEN, state }));

describe("the header's power button", () => {
  const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }));

  beforeEach(async () => {
    vi.stubGlobal("fetch", fetchMock);
    await setScreen("on");
    fetchMock.mockClear();
    setDeviceMode("frame");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("turns the frames' screen off from a frame, as the Screen card's switch does", async () => {
    renderWithProviders(<ScreenOffButton />);
    fireEvent.click(dom.getByRole("button", { name: "Turn the screen off" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/screen/off"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("switches the frames' screen off and on again from a remote", async () => {
    setDeviceMode("controller");
    renderWithProviders(<ScreenOffButton />);
    expect(dom.queryByRole("button", { name: "Turn the screen off" })).toBeNull();

    const off = dom.getByRole("button", { name: "Turn the frame's screen off" });
    expect(off).toHaveAttribute("data-state", "on");
    fireEvent.click(off);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/screen/off"));

    const on = await dom.findByRole("button", { name: "Turn the frame's screen on" });
    expect(on).toHaveAttribute("data-state", "off");
    fireEvent.click(on);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/screen/on"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await dom.findByRole("button", { name: "Turn the frame's screen off" })).toBeInTheDocument();
  });

  it("follows the frames' screen on a remote when something else turns it off or on", async () => {
    setDeviceMode("controller");
    renderWithProviders(<ScreenOffButton />);
    serverSays("off");
    expect(await dom.findByRole("button", { name: "Turn the frame's screen on" })).toBeInTheDocument();
    serverSays("on");
    expect(await dom.findByRole("button", { name: "Turn the frame's screen off" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
