import { afterEach, describe, expect, it, vi } from "vitest";

// The socket as lib/themeMode sees it: its handlers kept to be fired by hand,
// its emits recorded.
const sock = vi.hoisted(() => ({
  handlers: new Map<string, (value: unknown) => void>(),
  emit: vi.fn(),
}));
vi.mock("../../src/lib/socket", () => ({
  socket: {
    on: (event: string, fn: (value: unknown) => void) => sock.handlers.set(event, fn),
    emit: sock.emit,
  },
}));

// The system's light / dark setting, and the change listener the module adds.
const system = { dark: false, onChange: null as null | (() => void) };
const originalMatchMedia = window.matchMedia;
function stubSystem(dark: boolean) {
  system.dark = dark;
  window.matchMedia = vi.fn((query: string) => ({
    matches: query === "(prefers-color-scheme: dark)" && system.dark,
    media: query,
    addEventListener: (_: string, fn: () => void) => {
      system.onChange = fn;
    },
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

// A fresh module each time, as a page load: it reads localStorage, the
// device's mode and the system as it loads. lib/deviceMode comes from the same
// fresh registry, so its switch reaches this module.
async function load(mode: "frame" | "controller" = "frame") {
  localStorage.setItem("device-mode", mode);
  vi.resetModules();
  sock.handlers.clear();
  const theme = await import("../../src/lib/themeMode");
  const device = await import("../../src/lib/deviceMode");
  return { ...theme, setDeviceMode: device.setDeviceMode };
}

const html = document.documentElement;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  system.onChange = null;
  sock.emit.mockClear();
});

describe("the theme mode", () => {
  it("auto follows the daylight window, bright and dark are themselves", async () => {
    stubSystem(true);
    const { computeEffectiveMode } = await load();
    expect(computeEffectiveMode("auto", new Date(2026, 10, 3, 12))).toBe("bright");
    expect(computeEffectiveMode("auto", new Date(2026, 10, 3, 22))).toBe("dark");
    expect(computeEffectiveMode("bright")).toBe("bright");
    expect(computeEffectiveMode("dark")).toBe("dark");
    expect(computeEffectiveMode("device")).toBe("dark");
  });

  it("device follows the system's setting, and its changes live", async () => {
    stubSystem(true);
    localStorage.setItem("theme-mode-preference", "device");
    const { getTheme, subscribeTheme } = await load("frame");
    expect(getTheme()).toMatchObject({ frames: { preference: "device" }, effectiveMode: "dark" });
    expect(html.dataset.themeMode).toBe("dark");
    expect(html.classList.contains("dark")).toBe(true);
    const listener = vi.fn();
    subscribeTheme(listener);
    system.dark = false;
    system.onChange?.();
    expect(getTheme().effectiveMode).toBe("bright");
    expect(html.dataset.themeMode).toBe("bright");
    expect(html.classList.contains("dark")).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("the frames' theme", () => {
  it("is a frame's: saved, worn and sent to the other panels", async () => {
    stubSystem(false);
    const { getTheme, setThemePreference, setThemePalette } = await load("frame");
    expect(getTheme()).toMatchObject({ own: false, frames: { preference: "dark", palette: "gray" } });
    setThemePreference("bright");
    setThemePalette("slate");
    expect(localStorage.getItem("theme-mode-preference")).toBe("bright");
    expect(localStorage.getItem("theme-palette")).toBe("slate");
    expect(sock.emit).toHaveBeenCalledWith("theme_mode", "bright");
    expect(sock.emit).toHaveBeenCalledWith("theme_palette", "slate");
    expect(html.dataset.themeMode).toBe("bright");
    expect(html.dataset.palette).toBe("slate");
  });

  it("comes from the server and the other panels without being sent back", async () => {
    stubSystem(false);
    const { getTheme } = await load("frame");
    sock.handlers.get("current_theme_mode")?.("bright");
    sock.handlers.get("current_theme_palette")?.("sand");
    expect(getTheme()).toMatchObject({ frames: { preference: "bright", palette: "sand" }, palette: "sand" });
    sock.handlers.get("theme_palette")?.("slate");
    expect(html.dataset.palette).toBe("slate");
    expect(sock.emit).not.toHaveBeenCalled();
  });

  it("ignores what isn't a mode or a palette, stored or sent", async () => {
    stubSystem(false);
    localStorage.setItem("theme-mode-preference", "sepia");
    localStorage.setItem("theme-palette", "neon");
    const { getTheme, setThemePalette } = await load("frame");
    expect(getTheme().frames).toEqual({ preference: "dark", palette: "gray" });
    sock.handlers.get("theme_mode")?.("sepia");
    setThemePalette("neon" as never);
    expect(getTheme().frames).toEqual({ preference: "dark", palette: "gray" });
  });
});

describe("a remote's own theme (0.148.0)", () => {
  it("is the one a remote wears; the frames' changes it keeps but doesn't wear", async () => {
    stubSystem(false);
    localStorage.setItem("local-theme-mode", "dark");
    localStorage.setItem("local-theme-palette", "gray");
    const { getTheme, setThemePalette, setLocalThemePalette, setLocalThemePreference } = await load("controller");
    expect(getTheme().own).toBe(true);
    // The frames' theme, from the Display card or the server: kept, sent, not worn.
    setThemePalette("slate");
    sock.handlers.get("current_theme_mode")?.("bright");
    expect(sock.emit).toHaveBeenCalledWith("theme_palette", "slate");
    expect(getTheme().frames).toEqual({ preference: "bright", palette: "slate" });
    expect(html.dataset.palette).toBe("gray");
    expect(html.dataset.themeMode).toBe("dark");
    // Its own: worn, kept here, sent nowhere.
    sock.emit.mockClear();
    setLocalThemePalette("sand");
    setLocalThemePreference("bright");
    expect(html.dataset.palette).toBe("sand");
    expect(html.dataset.themeMode).toBe("bright");
    expect(localStorage.getItem("local-theme-palette")).toBe("sand");
    expect(localStorage.getItem("local-theme-mode")).toBe("bright");
    expect(sock.emit).not.toHaveBeenCalled();
  });

  it("starts as what a device from before showed, and a new one's follows its system", async () => {
    stubSystem(true);
    localStorage.setItem("theme-mode-preference", "auto");
    localStorage.setItem("theme-palette", "slate");
    const before = await load("controller");
    expect(before.getTheme().local).toEqual({ preference: "auto", palette: "slate" });
    expect(localStorage.getItem("local-theme-mode")).toBe("auto");
    expect(localStorage.getItem("local-theme-palette")).toBe("slate");

    localStorage.clear();
    const fresh = await load("controller");
    expect(fresh.getTheme().local).toEqual({ preference: "device", palette: "gray" });
    expect(fresh.getTheme().effectiveMode).toBe("dark");
    // Saved, so the frames' theme arriving later doesn't become it.
    sock.handlers.get("current_theme_palette")?.("sand");
    expect(fresh.getTheme().local.palette).toBe("gray");
  });

  it("is worn from the moment the device becomes a remote, and the frames' when it's a frame again", async () => {
    stubSystem(false);
    localStorage.setItem("local-theme-mode", "bright");
    localStorage.setItem("local-theme-palette", "sand");
    localStorage.setItem("theme-mode-preference", "dark");
    localStorage.setItem("theme-palette", "slate");
    const { getTheme, setDeviceMode } = await load("frame");
    expect(html.dataset.palette).toBe("slate");
    setDeviceMode("controller");
    expect(getTheme().own).toBe(true);
    expect(html.dataset.palette).toBe("sand");
    expect(html.dataset.themeMode).toBe("bright");
    setDeviceMode("frame");
    expect(html.dataset.palette).toBe("slate");
    expect(html.dataset.themeMode).toBe("dark");
  });
});
