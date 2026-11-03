import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SoftwareUpdate } from "../../src/hooks/useSoftware";
import { renderWithProviders } from "./helpers/render";

const state = vi.hoisted(() => ({
  update: null as SoftwareUpdate | null,
  repoUrl: null as string | null,
  status: "connected" as "connecting" | "connected" | "disconnected",
  reloadApp: vi.fn(),
}));
vi.mock("../../src/hooks/useSoftware", () => ({
  useSoftware: () => ({
    loading: false,
    installed: "0.139.0",
    repoUrl: state.repoUrl,
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
  state.repoUrl = null;
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

describe("the Software card's versions link their releases (0.149.1)", () => {
  const REPO = "https://github.com/thefreymaster/frame14";
  const release = (version: string) => screen.queryByRole("link", { name: `${version} release on GitHub` });

  it("links the installed and the latest version to their releases, in a new tab", () => {
    state.repoUrl = REPO;
    state.update = update({ available: true, latest: "0.140.0" });
    renderWithProviders(<SoftwareBoard />);
    const installed = release("0.139.0")!;
    expect(installed).toHaveAttribute("href", `${REPO}/releases/tag/v0.139.0`);
    expect(installed).toHaveAttribute("target", "_blank");
    expect(installed).toHaveAttribute("rel", "noreferrer");
    expect(installed).toHaveTextContent("0.139.0");
    expect(release("0.140.0")).toHaveAttribute("href", `${REPO}/releases/tag/v0.140.0`);
    // No button for it any more (0.147.0's "v… on GitHub").
    expect(screen.queryByText(/on GitHub/)).toBeNull();
  });

  it("links the installed version outside the add-on, with no update entity and no latest", () => {
    state.repoUrl = REPO;
    state.update = null;
    renderWithProviders(<SoftwareBoard />);
    expect(release("0.139.0")).toHaveAttribute("href", `${REPO}/releases/tag/v0.139.0`);
    expect(screen.getByText("Not known")).toBeInTheDocument();
  });

  it("shows plain versions without the repository", () => {
    state.update = update({ available: false, latest: "0.139.0" });
    renderWithProviders(<SoftwareBoard />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getAllByText("0.139.0").length).toBeGreaterThanOrEqual(2);
  });
});
