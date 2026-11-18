import { act, fireEvent, screen as dom } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "./helpers/render";

// 0.176.0, the user: "Add a bright mode/dark mode toggle icon button to the
// header". A tap puts the worn theme in the mode it isn't in: this device's
// own on a remote, the frames' — sent to the add-on for every frame — on a
// frame. lib/themeMode reads the device's mode and its storage as it loads,
// so each case gets a fresh module, as a page load.

const sock = vi.hoisted(() => ({ emit: vi.fn() }));
vi.mock("../../src/lib/socket", () => ({ socket: { on: vi.fn(), emit: sock.emit } }));

async function load(mode: "frame" | "controller", stored: Record<string, string> = {}) {
  localStorage.setItem("device-mode", mode);
  for (const [key, value] of Object.entries(stored)) localStorage.setItem(key, value);
  vi.resetModules();
  const { ThemeToggleButton } = await import("../../src/components/ThemeToggleButton");
  const { getTheme } = await import("../../src/lib/themeMode");
  renderWithProviders(<ThemeToggleButton />);
  return { getTheme };
}

const button = () => dom.getByRole("button", { name: /^Switch to (bright|dark) mode$/ });
const tap = () => act(() => void fireEvent.click(button()));

afterEach(() => {
  sock.emit.mockClear();
});

describe("the header's bright and dark switch", () => {
  it("puts a remote's own theme in the other mode, and sends nothing", async () => {
    const { getTheme } = await load("controller", { "local-theme-mode": "dark", "theme-mode-preference": "dark" });
    expect(button()).toHaveAccessibleName("Switch to bright mode");
    expect(button()).toHaveAttribute("data-header-theme", "dark");
    tap();
    expect(getTheme().local.preference).toBe("bright");
    expect(getTheme().effectiveMode).toBe("bright");
    expect(localStorage.getItem("local-theme-mode")).toBe("bright");
    // The frames' theme is another's to change, and isn't touched.
    expect(getTheme().frames.preference).toBe("dark");
    expect(sock.emit).not.toHaveBeenCalled();
    // And it now offers the way back.
    expect(button()).toHaveAccessibleName("Switch to dark mode");
    expect(button()).toHaveAttribute("data-header-theme", "bright");
    tap();
    expect(getTheme().local.preference).toBe("dark");
    expect(document.documentElement.dataset.themeMode).toBe("dark");
  });

  it("puts the frames' theme in the other mode from a frame, through the add-on", async () => {
    const { getTheme } = await load("frame", { "theme-mode-preference": "bright", "local-theme-mode": "dark" });
    expect(button()).toHaveAccessibleName("Switch to dark mode");
    tap();
    expect(getTheme().frames.preference).toBe("dark");
    expect(sock.emit.mock.calls).toEqual([["theme_mode", "dark"]]);
    // A frame's own theme, worn only as a remote, stays as it was.
    expect(getTheme().local.preference).toBe("dark");
    expect(localStorage.getItem("local-theme-mode")).toBe("dark");
    expect(button()).toHaveAccessibleName("Switch to bright mode");
  });

  it("goes by the mode worn now, whatever is being followed, and stops the following", async () => {
    // Device, on a system set to light (jsdom's matchMedia matches nothing): bright now.
    const { getTheme } = await load("controller", { "local-theme-mode": "device" });
    expect(getTheme().effectiveMode).toBe("bright");
    expect(button()).toHaveAccessibleName("Switch to dark mode");
    tap();
    // Dark outright: no longer the system's to say.
    expect(getTheme().local.preference).toBe("dark");
    expect(getTheme().effectiveMode).toBe("dark");
  });

  it("leaves the colours as they are", async () => {
    const { getTheme } = await load("controller", { "local-theme-mode": "dark", "local-theme-palette": "slate" });
    tap();
    expect(getTheme().local).toEqual({ preference: "bright", palette: "slate" });
    expect(document.documentElement.dataset.palette).toBe("slate");
  });
});
