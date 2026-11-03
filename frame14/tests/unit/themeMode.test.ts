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

// A fresh module each time: it reads localStorage and the system as it loads.
async function load() {
  vi.resetModules();
  sock.handlers.clear();
  return import("../../src/lib/themeMode");
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
  });

  it("device follows the system's setting, and its changes live", async () => {
    stubSystem(true);
    localStorage.setItem("theme-mode-preference", "device");
    const { getTheme, subscribeTheme } = await load();
    expect(getTheme()).toMatchObject({ preference: "device", effectiveMode: "dark" });
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

  it("is saved and sent to the other panels; one from the server isn't sent back", async () => {
    stubSystem(false);
    const { getTheme, setThemePreference } = await load();
    expect(getTheme().preference).toBe("dark");
    setThemePreference("device");
    expect(localStorage.getItem("theme-mode-preference")).toBe("device");
    expect(sock.emit).toHaveBeenCalledWith("theme_mode", "device");
    expect(getTheme().effectiveMode).toBe("bright");
    sock.emit.mockClear();
    sock.handlers.get("current_theme_mode")?.("auto");
    expect(getTheme().preference).toBe("auto");
    expect(sock.emit).not.toHaveBeenCalled();
  });

  it("ignores what isn't a mode, stored or sent", async () => {
    stubSystem(false);
    localStorage.setItem("theme-mode-preference", "sepia");
    const { getTheme } = await load();
    expect(getTheme().preference).toBe("dark");
    sock.handlers.get("theme_mode")?.("sepia");
    expect(getTheme().preference).toBe("dark");
  });
});

describe("the palette", () => {
  it("is gray until one is picked, marked on <html>, saved and sent", async () => {
    stubSystem(false);
    const { getTheme, setThemePalette } = await load();
    expect(getTheme().palette).toBe("gray");
    expect(html.dataset.palette).toBe("gray");
    const effectiveMode = getTheme().effectiveMode;
    setThemePalette("slate");
    expect(html.dataset.palette).toBe("slate");
    expect(localStorage.getItem("theme-palette")).toBe("slate");
    expect(sock.emit).toHaveBeenCalledWith("theme_palette", "slate");
    // The palette doesn't touch the mode.
    expect(getTheme().effectiveMode).toBe(effectiveMode);
  });

  it("takes the server's on connect and another panel's without sending it back", async () => {
    stubSystem(false);
    const { getTheme } = await load();
    sock.handlers.get("current_theme_palette")?.("sand");
    expect(getTheme().palette).toBe("sand");
    expect(html.dataset.palette).toBe("sand");
    sock.handlers.get("theme_palette")?.("slate");
    expect(getTheme().palette).toBe("slate");
    expect(sock.emit).not.toHaveBeenCalled();
  });

  it("comes back from storage, and ignores one it hasn't got", async () => {
    stubSystem(false);
    localStorage.setItem("theme-palette", "sand");
    const { getTheme, setThemePalette } = await load();
    expect(getTheme().palette).toBe("sand");
    setThemePalette("neon" as never);
    expect(getTheme().palette).toBe("sand");
    localStorage.setItem("theme-palette", "neon");
    const again = await load();
    expect(again.getTheme().palette).toBe("gray");
  });
});
