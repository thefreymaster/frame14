import { act, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "./helpers/render";

const state = vi.hoisted(() => ({
  status: "connected" as "connecting" | "connected" | "disconnected",
  reloadApp: vi.fn(),
}));
vi.mock("../../src/hooks/useSocket", () => ({
  useSocket: () => ({ status: state.status, connected: state.status === "connected" }),
}));
vi.mock("../../src/hooks/useConnectionInfo", () => ({
  useConnectionInfo: () => ({ data: undefined }),
}));
vi.mock("../../src/lib/appVersion", () => ({
  RUNNING_VERSION: "0.158.0",
  reloadApp: state.reloadApp,
}));
vi.mock("../../src/lib/connection", () => ({
  useConnectionSince: () => Date.now(),
  connectionLabel: (s: string) =>
    s === "connected" ? "Connected" : s === "disconnected" ? "Disconnected" : "Reconnecting…",
}));
vi.mock("../../src/lib/socket", () => ({
  socket: {
    io: { engine: { transport: { name: "websocket" } } },
    timeout: () => ({ emit: vi.fn() }),
  },
}));

import { ConnectionMenu } from "../../src/components/ConnectionMenu";

async function openMenu(label: string) {
  renderWithProviders(<ConnectionMenu />);
  await act(async () => {
    screen.getByRole("button", { name: label }).click();
  });
  await waitFor(() => expect(screen.getByText("Round trip")).toBeInTheDocument());
}

const reload = () => screen.queryByRole("button", { name: "Reload" });

beforeEach(() => {
  state.reloadApp.mockReset();
});

describe("the connection menu's Reload", () => {
  it("is offered once the connection has been given up on, and reloads the page", async () => {
    state.status = "disconnected";
    await openMenu("Disconnected");
    await act(async () => {
      reload()!.click();
    });
    expect(state.reloadApp).toHaveBeenCalledTimes(1);
  });

  it("isn't offered while connected", async () => {
    state.status = "connected";
    await openMenu("Connected");
    expect(reload()).toBeNull();
  });

  it("isn't offered while still reconnecting", async () => {
    state.status = "connecting";
    await openMenu("Reconnecting…");
    expect(reload()).toBeNull();
  });
});
