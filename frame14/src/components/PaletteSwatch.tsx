import { Box } from "@chakra-ui/react";
import { PALETTES, type ThemePalette } from "../lib/themePalettes";

/**
 * A palette as a round chip for the Display card's Colors control: a light
 * and a dark step of it, split on the diagonal. Mid steps (300 and 600), where
 * a palette's hue shows most — its page and its card are so near white and
 * black that the three chips looked alike. Its values are the palette's own
 * (lib/themePalettes), not tokens, since the tokens are the palette on screen.
 *
 * An outlined palette (Outlines, whose scale is gray's) is what it draws: an
 * empty ring, `data-outlined`.
 */
export function PaletteSwatch({ palette }: { palette: ThemePalette }) {
  const { scale, outlined } = PALETTES[palette];
  return (
    <Box
      aria-hidden
      data-palette-swatch={palette}
      data-outlined={outlined ? "" : undefined}
      boxSize="3.5"
      flexShrink={0}
      rounded="full"
      borderWidth={outlined ? "2px" : "1px"}
      borderColor={outlined ? scale["400"] : "border.emphasized"}
      bgImage={
        outlined
          ? undefined
          : `linear-gradient(135deg, ${scale["300"]} 50%, ${scale["600"]} 50%)`
      }
    />
  );
}
