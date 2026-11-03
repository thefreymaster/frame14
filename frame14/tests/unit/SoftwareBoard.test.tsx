import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SoftwareUpdate } from "../../src/hooks/useSoftware";
import { renderWithProviders } from "./helpers/render";

const state = vi.hoisted(() => ({
  update: null as SoftwareUpdate | null,
  releaseUrl: null as string | null,
  status: "connected" as "connecting" | "connected" | "disconnected",
  reloadApp: vi.fn(),
}));
vi.mock("../../src/hooks/useSoftware", () => ({
  useSoftware: () => ({
    loading: false,
    installed: "0.139.0",
    installedReleaseUrl: state.releaseUrl,
    update: state.update,
    check: vi.fn(),
  }),
  installSoftware: vi.fn(),
}));
vi.mock("../../src/lib/appVersion", () => ({
  RUNNING_VERSION: "0.139.0",
  useAppVersion: () => ({ running: "0.139.0", installed: "0.139.0", outdated: false }),
  reloadApp: state.reloadApp,
}));
vi.mock("../../src/lib/connection", () => ({
  useConnectionStatus: () => state.status,
}));

import { SoftwareBoard } from "../../src/components/SoftwareBoard";

function update(overrides: Partial<SoftwareUpdate> = {}): SoftwareUpdate {
  return {
    entityId: "update.frame14_update",
    installed: "0.139.0",
    latest: "0.140.0",
    available: true,
    releaseUrl: null,
    inProgress: false,
    releaseNotes: null,
    ...overrides,
  };
}

const tryAgain = () => screen.queryByRole("button", { name: "Try again" });

beforeEach(() => {
  state.releaseUrl = null;
  state.reloadApp.mockReset();
  state.status = "connected";
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the Software card's header badge", () => {
  it("says Update available while the store has a newer version", () => {
    state.update = update();
    renderWithProviders(<SoftwareBoard />);
    expect(screen.getByText("Update available")).toBeInTheDocument();
    expect(screen.queryByText("Installing")).toBeNull();
  });

  it("says Installing, in the bar's blue, while the update installs", () => {
    state.update = update({ inProgress: true });
    renderWithProviders(<SoftwareBoard />);
    const badge = screen.getByText("Installing");
    expect(badge).toBeInTheDocument();
    expect(badge.closest(".chakra-badge")).toHaveClass("chakra-badge");
    expect(screen.queryByText("Update available")).toBeNull();
    expect(screen.getByRole("progressbar", { name: "Install progress" })).toBeInTheDocument();
  });
});

describe("the Software card's Try again", () => {
  it("isn't offered while an install is young and the connection holds", () => {
    state.update = update({ inProgress: true });
    renderWithProviders(<SoftwareBoard />);
    expect(tryAgain()).toBeNull();
  });

  it("appears once the connection has been given up on, and reloads this device", async () => {
    state.update = update({ inProgress: true });
    state.status = "disconnected";
    renderWithProviders(<SoftwareBoard />);
    expect(screen.getByText(/Frame14 hasn't come back yet/)).toBeInTheDocument();
    await act(async () => {
      tryAgain()!.click();
    });
    expect(state.reloadApp).toHaveBeenCalledTimes(1);
  });

  it("appears when the install has run two minutes, connection or not", async () => {
    state.update = update({ inProgress: true });
    renderWithProviders(<SoftwareBoard />);
    await act(async () => {
      vi.advanceTimersByTime(2 * 60_000 - 1);
    });
    expect(tryAgain()).toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText(/taking longer than it should/)).toBeInTheDocument();
    expect(tryAgain()).toBeEnabled();
  });

  it("is never offered outside an install", () => {
    state.update = update();
    state.status = "disconnected";
    renderWithProviders(<SoftwareBoard />);
    expect(tryAgain()).toBeNull();
  });
});

describe("the Software card's GitHub link (0.147.0)", () => {
  const RELEASE = "https://github.com/thefreymaster/frame14/releases/tag/v0.139.0";

  it("opens the installed version's release in a new tab", () => {
    state.releaseUrl = RELEASE;
    state.update = update({ available: false, latest: "0.139.0" });
    renderWithProviders(<SoftwareBoard />);
    const link = screen.getByRole("link", { name: "v0.139.0 on GitHub" });
    expect(link).toHaveAttribute("href", RELEASE);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });

  it("is there outside the add-on, with no update entity", () => {
    state.releaseUrl = RELEASE;
    state.update = null;
    renderWithProviders(<SoftwareBoard />);
    expect(screen.getByRole("link", { name: "v0.139.0 on GitHub" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check for updates" })).toBeNull();
  });

  it("is absent without a release to link to, and while an update installs", () => {
    state.update = update({ available: false, latest: "0.139.0" });
    const { unmount } = renderWithProviders(<SoftwareBoard />);
    expect(screen.queryByRole("link", { name: /on GitHub/ })).toBeNull();
    unmount();
    state.releaseUrl = RELEASE;
    state.update = update({ inProgress: true });
    renderWithProviders(<SoftwareBoard />);
    expect(screen.queryByRole("link", { name: /on GitHub/ })).toBeNull();
  });
});
