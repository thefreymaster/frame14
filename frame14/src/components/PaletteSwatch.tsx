import { Box } from "@chakra-ui/react";
import { PALETTES, type ThemePalette } from "../lib/themePalettes";

/**
 * A palette as a round chip for the Display card's Colors control: its light
 * page and its dark card, split on the diagonal — the palette's two faces.
 * Its values are the palette's own (lib/themePalettes), not tokens, since the
 * tokens are the palette on screen.
 */
export function PaletteSwatch({ palette }: { palette: ThemePalette }) {
  const { paper, card } = PALETTES[palette];
  return (
    <Box
      aria-hidden
      data-palette-swatch={palette}
      boxSize="3.5"
      flexShrink={0}
      rounded="full"
      borderWidth="1px"
      borderColor="border.emphasized"
      bgImage={`linear-gradient(135deg, ${paper} 50%, ${card} 50%)`}
    />
  );
}
