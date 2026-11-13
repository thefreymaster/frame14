import { describe, expect, it } from "vitest";
import { PaletteSwatch } from "../../src/components/PaletteSwatch";
import { PALETTES, THEME_PALETTES } from "../../src/lib/themePalettes";
import { renderWithProviders } from "./helpers/render";

// jsdom gives a hex back as rgb().
const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;

// The border width an element's own rules give it. jsdom's computed width is
// 0 for any border, since the test render has no preflight `border-style:
// solid`, so it is read from the stylesheet emotion wrote.
const ruleBorderWidth = (el: Element) => {
  for (const sheet of Array.from(document.styleSheets)) {
    for (const rule of Array.from(sheet.cssRules)) {
      if (rule instanceof CSSStyleRule && rule.style.borderWidth && el.matches(rule.selectorText)) {
        return rule.style.borderWidth;
      }
    }
  }
  return undefined;
};

describe("PaletteSwatch", () => {
  it("shows each palette's own tint: a light and a dark mid step, a different chip per palette (0.164.0)", () => {
    const { container } = renderWithProviders(
      <>
        {THEME_PALETTES.map((palette) => (
          <PaletteSwatch key={palette} palette={palette} />
        ))}
      </>,
    );
    const chips = THEME_PALETTES.map((palette) => {
      const chip = container.querySelector(`[data-palette-swatch="${palette}"]`);
      expect(chip, palette).not.toBeNull();
      const image = getComputedStyle(chip as Element).backgroundImage;
      if (PALETTES[palette].outlined) return image;
      expect(image, palette).toContain(rgb(PALETTES[palette].scale["300"]));
      expect(image, palette).toContain(rgb(PALETTES[palette].scale["600"]));
      return image;
    });
    expect(new Set(chips).size).toBe(THEME_PALETTES.length);
  });

  it("shows Outlines as what it draws: an empty ring, not gray's chip again (0.166.0)", () => {
    const { container } = renderWithProviders(
      <>
        <PaletteSwatch palette="gray" />
        <PaletteSwatch palette="outlines" />
      </>,
    );
    const ring = container.querySelector('[data-palette-swatch="outlines"]') as Element;
    const gray = container.querySelector('[data-palette-swatch="gray"]') as Element;
    expect(ring).toHaveAttribute("data-outlined");
    expect(gray).not.toHaveAttribute("data-outlined");
    // Nothing filled in, and a heavier edge than a filled chip's hairline.
    expect(getComputedStyle(ring).backgroundImage).not.toContain("gradient");
    expect(getComputedStyle(gray).backgroundImage).toContain("gradient");
    expect(ruleBorderWidth(ring)).toBe("2px");
    expect(ruleBorderWidth(gray)).toBe("1px");
    expect(getComputedStyle(ring).borderColor).toBe(rgb(PALETTES.outlines.scale["400"]));
  });
});
