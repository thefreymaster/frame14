import { Card } from "@chakra-ui/react";
import { WELL_SHADOW } from "../lib/floatingSurface";

/**
 * A well in a card: what holds something to read rather than press — a
 * forecast's hours and days, the weather's conditions, the hours' chart, the
 * moon. A subtle `sm` card, so its floor is a step off its card's in every
 * theme, and pressed into the card where the theme presses the cards in
 * (Embossed: WELL_SHADOW, nothing anywhere else). It takes a `Card.Body`.
 */
export function Well(props: Card.RootProps) {
  return (
    <Card.Root
      size="sm"
      variant="subtle"
      borderRadius="sm"
      boxShadow={WELL_SHADOW}
      {...props}
    />
  );
}
