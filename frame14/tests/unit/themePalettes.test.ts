import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PALETTE_STEPS,
  PALETTES,
  THEME_PALETTES,
  isThemePalette,
  type PaletteColors,
} from "../../src/lib/themePalettes";

const channels = (hex: string) =>
  [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

// WCAG's relative luminance of a #rrggbb colour.
function luminance(hex: string) {
  const [r, g, b] = channels(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG's contrast ratio of two colours.
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// A colour's OKLCH chroma (how far from gray) and hue in degrees.
function tint(hex: string) {
  const [r, g, b] = channels(hex);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { chroma: Math.hypot(A, B), hue: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

// Every colour a palette has, by name.
function colours(p: PaletteColors): Record<string, string> {
  return { ...p.scale, paper: p.paper, ink: p.ink, card: p.card };
}

// The steps that keep gray's lightness in every palette, and the dark half,
// which is each palette's own (with 500, the dark cards' faintest text).
const LIGHT_HALF = ["50", "100", "200", "300", "400", "600"] as const;
const DARK_HALF = ["500", "700", "800", "900", "950", "ink", "card"] as const;
// Dark surfaces from the page up: the page, the wells in a card, the muted
// wells, the card, its borders, the raised steps.
const DARK_ORDER = ["ink", "950", "900", "card", "800", "700"] as const;

// The most colour a neutral may carry, and a light page under white cards.
const TINT_CHROMA_MAX = 0.03;
const PAPER_CHROMA_MAX = 0.008;

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

  it("keep Chakra gray's lightness through the light half, so its contrast holds", () => {
    const gray = colours(PALETTES.gray);
    for (const name of THEME_PALETTES) {
      const own = colours(PALETTES[name]);
      for (const step of LIGHT_HALF) {
        // As a contrast ratio against gray's own step: within 6%.
        const ratio = contrast(own[step], gray[step]);
        expect(ratio, `${name} ${step}`).toBeLessThan(1.06);
      }
    }
  });

  it("are quiet neutrals: no step carries more colour than a gray does (0.164.0)", () => {
    for (const name of THEME_PALETTES) {
      const { paper, ...steps } = colours(PALETTES[name]);
      for (const [step, value] of Object.entries(steps)) {
        expect(tint(value).chroma, `${name} ${step}`).toBeLessThan(TINT_CHROMA_MAX);
      }
      expect(tint(paper).chroma, `${name} paper`).toBeLessThan(PAPER_CHROMA_MAX);
    }
  });

  it("keep one hue each: Slate a blue gray, Sand a warm gray that isn't brown (0.164.0)", () => {
    for (const [step, value] of Object.entries(colours(PALETTES.slate))) {
      expect(tint(value).hue, `slate ${step}`).toBeGreaterThan(240);
      expect(tint(value).hue, `slate ${step}`).toBeLessThan(265);
    }
    for (const [step, value] of Object.entries(colours(PALETTES.sand))) {
      expect(tint(value).hue, `sand ${step}`).toBeGreaterThan(80);
      expect(tint(value).hue, `sand ${step}`).toBeLessThan(100);
    }
  });

  it("put the white cards on a tinted page in light mode, lighter than their wells (0.164.0)", () => {
    for (const name of THEME_PALETTES) {
      const { paper, scale } = PALETTES[name];
      // Not white — gray's too: white cards on a white page had no edge.
      expect(contrast(paper, "#ffffff"), `${name} paper`).toBeGreaterThan(1.05);
      expect(luminance(paper), `${name} paper`).toBeGreaterThan(luminance(scale["100"]));
      // And still a page to read on.
      expect(contrast(PALETTES[name].ink, paper), `${name} text`).toBeGreaterThan(15);
      expect(contrast(scale["600"], paper), `${name} muted text`).toBeGreaterThan(7);
    }
  });

  it("give Slate and Sand one dark ramp, softer than gray's (0.164.0)", () => {
    const gray = colours(PALETTES.gray);
    const slate = colours(PALETTES.slate);
    const sand = colours(PALETTES.sand);
    for (const step of DARK_HALF) {
      expect(contrast(slate[step], sand[step]), `slate and sand ${step}`).toBeLessThan(1.06);
      expect(luminance(slate[step]), `slate ${step}`).toBeGreaterThan(luminance(gray[step]));
      expect(luminance(sand[step]), `sand ${step}`).toBeGreaterThan(luminance(gray[step]));
    }
  });

  it("keep the dark surfaces in gray's order and the text on them readable", () => {
    for (const name of THEME_PALETTES) {
      const own = colours(PALETTES[name]);
      const levels = DARK_ORDER.map((step) => luminance(own[step]));
      expect([...levels].sort((a, b) => a - b), name).toEqual(levels);
      // The card off the page, its wells and its border off the card.
      expect(contrast(own.card, own.ink), `${name} card on the page`).toBeGreaterThan(1.15);
      expect(contrast(own.card, own["950"]), `${name} well in a card`).toBeGreaterThan(1.1);
      expect(contrast(own["700"], own.card), `${name} card border`).toBeGreaterThan(1.5);
      // fg, fg.muted and fg.subtle on a card, and fg.muted in a well.
      expect(contrast(own["50"], own.card), `${name} text`).toBeGreaterThan(12);
      expect(contrast(own["400"], own.card), `${name} muted text`).toBeGreaterThan(5.5);
      expect(contrast(own["500"], own.card), `${name} subtle text`).toBeGreaterThan(3.4);
      expect(contrast(own["400"], own["950"]), `${name} muted text in a well`).toBeGreaterThan(6.5);
    }
  });

  it("are Chakra's own values in gray, but the light page", () => {
    expect(PALETTES.gray.ink).toBe("#09090B");
    expect(PALETTES.gray.card).toBe("#1C1C1E");
    expect(PALETTES.gray.scale["50"]).toBe("#fafafa");
    expect(PALETTES.gray.scale["800"]).toBe("#27272a");
    expect(PALETTES.gray.scale["950"]).toBe("#111111");
  });

  it("are what the launch splash paints before the bundle (index.html's copies)", () => {
    const html = readFileSync("index.html", "utf-8");
    const splash = (selector: string) => {
      const at = html.indexOf(`      ${selector} {\n        --splash-bg:`);
      expect(at, selector).toBeGreaterThan(-1);
      return /--splash-bg:\s*(#[0-9a-f]+);/i.exec(html.slice(at))?.[1].toLowerCase();
    };
    expect(splash("html")).toBe(PALETTES.gray.ink.toLowerCase());
    expect(splash('html[data-theme-mode="bright"]')).toBe(PALETTES.gray.paper.toLowerCase());
    for (const name of ["slate", "sand"] as const) {
      expect(splash(`html[data-palette="${name}"]`)).toBe(PALETTES[name].ink.toLowerCase());
      expect(splash(`html[data-palette="${name}"][data-theme-mode="bright"]`)).toBe(
        PALETTES[name].paper.toLowerCase(),
      );
    }
  });
});
