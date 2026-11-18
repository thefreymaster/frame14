import { act, fireEvent, screen as dom } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "./helpers/render";

const mocks = vi.hoisted(() => ({ emit: vi.fn(), toast: vi.fn() }));
vi.mock("../../src/lib/socket", () => ({ socket: { emit: mocks.emit } }));
vi.mock("../../src/components/ui/toaster", () => ({ toaster: { create: mocks.toast } }));

import { RefreshFramesButton } from "../../src/components/RefreshFramesButton";
import { setDeviceMode } from "../../src/lib/deviceMode";

const button = () => dom.queryByRole("button", { name: "Refresh the frames" });

describe("the header's button to refresh the frames", () => {
  beforeEach(() => {
    mocks.emit.mockClear();
    mocks.toast.mockClear();
  });

  it("asks the server to refresh the frames from a remote, once a tap, and says so", () => {
    setDeviceMode("controller");
    renderWithProviders(<RefreshFramesButton />);
    fireEvent.click(button()!);
    // The Display card's "Refresh displays": the server sends `reload` on.
    expect(mocks.emit.mock.calls).toEqual([["refresh"]]);
    // Nothing on the remote itself changes, so a toast says it went.
    expect(mocks.toast).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledWith({ title: "Refreshing the frames", type: "info" });
  });

  it("isn't on a frame, and nothing is sent by having it", () => {
    setDeviceMode("frame");
    renderWithProviders(<RefreshFramesButton />);
    expect(button()).toBeNull();
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it("comes and goes as Settings switches the device's mode", () => {
    setDeviceMode("frame");
    renderWithProviders(<RefreshFramesButton />);
    expect(button()).toBeNull();
    act(() => setDeviceMode("controller"));
    expect(button()).toBeInTheDocument();
    act(() => setDeviceMode("frame"));
    expect(button()).toBeNull();
  });
});
