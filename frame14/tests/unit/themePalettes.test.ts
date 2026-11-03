import { describe, expect, it } from "vitest";
import {
  PALETTE_STEPS,
  PALETTES,
  THEME_PALETTES,
  isThemePalette,
  type PaletteColors,
} from "../../src/lib/themePalettes";

// WCAG's relative luminance of a #rrggbb colour.
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Every colour a palette has, by name.
function colours(p: PaletteColors): Record<string, string> {
  return { ...p.scale, paper: p.paper, ink: p.ink, card: p.card };
}

describe("the palettes", () => {
  it("are gray, slate and sand, each a whole scale of colours", () => {
    expect(THEME_PALETTES).toEqual(["gray", "slate", "sand"]);
    for (const name of THEME_PALETTES) {
      expect(Object.keys(PALETTES[name].scale)).toEqual([...PALETTE_STEPS]);
      for (const value of Object.values(colours(PALETTES[name]))) {
        expect(value, name).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
    expect(isThemePalette("slate")).toBe(true);
    expect(isThemePalette("neon")).toBe(false);
  });

  it("keep Chakra gray's lightness at every step, so its contrast holds", () => {
    const gray = colours(PALETTES.gray);
    for (const name of THEME_PALETTES) {
      const { paper, ...steps } = colours(PALETTES[name]);
      // The light page is the one tint by design: under the white cards,
      // over the wells (100) inside them.
      expect(luminance(paper), `${name} paper`).toBeLessThanOrEqual(1);
      expect(luminance(paper), `${name} paper`).toBeGreaterThan(luminance(PALETTES[name].scale["100"]));
      for (const [step, value] of Object.entries(steps)) {
        // As a contrast ratio against gray's own step: within 6%.
        const ratio = (luminance(value) + 0.05) / (luminance(gray[step]) + 0.05);
        expect(ratio, `${name} ${step}`).toBeGreaterThan(0.94);
        expect(ratio, `${name} ${step}`).toBeLessThan(1.06);
      }
    }
  });

  it("are Chakra's own values in gray", () => {
    expect(PALETTES.gray.paper).toBe("#FFFFFF");
    expect(PALETTES.gray.ink).toBe("#09090B");
    expect(PALETTES.gray.card).toBe("#1C1C1E");
    expect(PALETTES.gray.scale["800"]).toBe("#27272a");
  });
});
