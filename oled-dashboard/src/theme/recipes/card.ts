import { defineSlotRecipe } from "@chakra-ui/react";
import { cardAnatomy } from "@chakra-ui/react/anatomy";

/**
 * The raised tile every section sits on.
 *
 * Elevation by fill, not outline (see the palette in ../tokens.ts). The card
 * owns its padding; header and body add none, so a header row and its content
 * line up on the same edge whether or not the card collapses.
 */
export const cardSlotRecipe = defineSlotRecipe({
  slots: cardAnatomy.keys(),
  variants: {
    variant: {
      raised: {
        root: {
          bg: "surface.card",
          color: "fg",
          borderRadius: "card",
          px: "cardX",
          py: "cardY",
          width: "100%",
        },
        header: {
          p: "0",
          // Touch-friendly: the header is the collapse target.
          minH: "48px",
          flexDirection: "row",
          alignItems: "center",
          gap: "0",
          pb: "headerGap",
        },
        body: {
          p: "0",
          display: "block",
          minW: "0",
        },
        footer: { p: "0" },
        // Chakra's title textStyle carries a fixed rem line height; vmin type
        // needs a relative one or `truncate` clips the descenders.
        title: {
          fontWeight: "400",
          fontSize: "2.2vmin",
          lineHeight: "1.3",
          letterSpacing: "0.1em",
        },
        description: { lineHeight: "1.4" },
      },
    },
  },
  defaultVariants: {
    variant: "raised",
  },
});
