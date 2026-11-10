import { describe, expect, it } from "vitest";
import { PaletteSwatch } from "../../src/components/PaletteSwatch";
import { PALETTES, THEME_PALETTES } from "../../src/lib/themePalettes";
import { renderWithProviders } from "./helpers/render";

// jsdom gives a hex back as rgb().
const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;

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
      expect(image, palette).toContain(rgb(PALETTES[palette].scale["300"]));
      expect(image, palette).toContain(rgb(PALETTES[palette].scale["600"]));
      return image;
    });
    expect(new Set(chips).size).toBe(THEME_PALETTES.length);
  });
});
