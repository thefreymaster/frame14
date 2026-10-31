import { fireEvent, screen as dom, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "./helpers/render";

vi.mock("../../src/lib/socket", () => ({
  socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

import { ScreenOffButton } from "../../src/components/ScreenOffButton";
import { setDeviceMode } from "../../src/lib/deviceMode";

describe("the header's power button", () => {
  const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }));

  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
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

  it("is not on a remote", () => {
    setDeviceMode("controller");
    renderWithProviders(<ScreenOffButton />);
    expect(dom.queryByRole("button", { name: "Turn the screen off" })).toBeNull();
  });
});
