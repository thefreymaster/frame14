import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "./helpers/render";

// The router's navigate and the socket, which the nav's visibility reaches.
const mocks = vi.hoisted(() => ({ navigate: vi.fn(), emit: vi.fn() }));

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => mocks.navigate,
}));
vi.mock("../../src/lib/socket", () => ({
  socket: { emit: mocks.emit, on: vi.fn(), off: vi.fn() },
}));

import { Halloween } from "../../src/routes/Halloween";
import { getNavVisible } from "../../src/lib/navVisibility";

const greeting = () => screen.getByRole("heading", { name: "Happy Halloween" });

describe("the Halloween page", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    mocks.navigate.mockReset();
  });

  it("is the greeting, full-bleed: the nav hides while it's up and comes back after", () => {
    vi.setSystemTime(new Date(2026, 9, 31, 20, 0));
    expect(getNavVisible()).toBe(true);
    const { unmount } = renderWithProviders(<Halloween />);
    expect(greeting()).toBeInTheDocument();
    expect(getNavVisible()).toBe(false);
    // A frame's eye offers the nav back.
    expect(screen.getByRole("button", { name: "Show navigation" })).toBeInTheDocument();
    unmount();
    expect(getNavVisible()).toBe(true);
  });

  it("goes Home when Nov 1 arrives, and not before", () => {
    vi.setSystemTime(new Date(2026, 9, 31, 23, 59, 30));
    renderWithProviders(<Halloween />);
    // 23:59:50 — no tick yet.
    act(() => vi.advanceTimersByTime(20_000));
    expect(mocks.navigate).not.toHaveBeenCalled();
    // 00:00:50 on Nov 1 — the minute's tick has run.
    act(() => vi.advanceTimersByTime(60_000));
    expect(mocks.navigate).toHaveBeenCalledWith("/home", { replace: true });
  });

  it("stays put on another day: a bookmark in November", () => {
    vi.setSystemTime(new Date(2026, 10, 3, 12, 0));
    renderWithProviders(<Halloween />);
    act(() => vi.advanceTimersByTime(120_000));
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(greeting()).toBeInTheDocument();
  });
});
