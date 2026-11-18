import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// The theme's file goes in a temp dir, named before the module reads the env.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frame14-theme-"));
process.env.FRAME14_DATA_DIR = dir;
const file = path.join(dir, "theme.json");

// A fresh module, as after a restart.
async function load() {
  vi.resetModules();
  return import("../../theme.js");
}

beforeEach(() => fs.rmSync(file, { force: true }));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("the panels' theme (0.146.0)", () => {
  // 0.176.0, the user: "Make embossed theme the default theme going
  // forward" (Gray until then).
  it("is Dark and Embossed until one is picked", async () => {
    const { startTheme, DEFAULT_THEME } = await load();
    expect(DEFAULT_THEME).toEqual({ mode: "dark", palette: "embossed" });
    expect(startTheme().state()).toEqual({ mode: "dark", palette: "embossed" });
    // Nothing is written by starting: an install that picks nothing follows
    // the default, whatever it comes to be.
    expect(fs.existsSync(file)).toBe(false);
  });

  it("keeps a theme that was picked before, Gray among them", async () => {
    fs.writeFileSync(file, JSON.stringify({ mode: "auto", palette: "gray" }));
    expect((await load()).startTheme().state()).toEqual({ mode: "auto", palette: "gray" });
    fs.writeFileSync(file, JSON.stringify({ mode: "dark", palette: "slate" }));
    expect((await load()).startTheme().state()).toEqual({ mode: "dark", palette: "slate" });
  });

  it("takes a mode and a palette it knows, and refuses others", async () => {
    const { startTheme } = await load();
    const theme = startTheme();
    for (const mode of ["auto", "device", "bright", "dark"]) {
      expect(theme.setMode(mode)).toBe(true);
      expect(theme.state().mode).toBe(mode);
    }
    for (const palette of ["slate", "outlines", "embossed", "gray"]) {
      expect(theme.setPalette(palette)).toBe(true);
      expect(theme.state().palette).toBe(palette);
    }
    // Sand was a palette until 0.169.0.
    for (const bad of ["sepia", "sand", "", null, 3, { mode: "dark" }]) {
      expect(theme.setMode(bad)).toBe(false);
      expect(theme.setPalette(bad)).toBe(false);
    }
    expect(theme.state()).toEqual({ mode: "dark", palette: "gray" });
  });

  it("is kept across a restart", async () => {
    const first = (await load()).startTheme();
    first.setMode("device");
    first.setPalette("slate");
    expect(JSON.parse(fs.readFileSync(file, "utf-8"))).toEqual({ mode: "device", palette: "slate" });
    const second = (await load()).startTheme();
    expect(second.state()).toEqual({ mode: "device", palette: "slate" });
  });

  it("falls back on what a damaged file doesn't say", async () => {
    fs.writeFileSync(file, JSON.stringify({ mode: "sepia", palette: "slate" }));
    expect((await load()).startTheme().state()).toEqual({ mode: "dark", palette: "slate" });
    // The frames that wore Sand, a palette until 0.169.0: Gray, their mode
    // kept — as they have been since, not the default of an install that
    // saved nothing.
    fs.writeFileSync(file, JSON.stringify({ mode: "bright", palette: "sand" }));
    expect((await load()).startTheme().state()).toEqual({ mode: "bright", palette: "gray" });
    // A file with a mode alone says nothing of the colours: the default.
    fs.writeFileSync(file, JSON.stringify({ mode: "bright" }));
    expect((await load()).startTheme().state()).toEqual({ mode: "bright", palette: "embossed" });
    fs.writeFileSync(file, "{not json");
    expect((await load()).startTheme().state()).toEqual({ mode: "dark", palette: "embossed" });
  });
});
