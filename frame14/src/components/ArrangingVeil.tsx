import { Box } from "@chakra-ui/react";

/** How far the veil blurs the surface under it. */
const VEIL_BLUR = "6px";
const VEIL_FILTER = `blur(${VEIL_BLUR})`;

/**
 * The sheet laid over the header and the navs while /home is being arranged
 * (useHomeArranging): their entries blur and dim under it, and since it takes
 * the presses they take none — Done ends arranging, nothing else leaves it.
 * It fills whatever it sits in (an `inset: 0` child, with that surface's
 * corners); the surface itself goes `inert` as well, so the keyboard can't
 * reach its entries either. Not rendered while not shown: a second
 * backdrop-filter on an already frosted bar isn't free.
 */
export function ArrangingVeil({ shown }: { shown: boolean }) {
  if (!shown) return null;
  return (
    <Box
      aria-hidden
      data-arranging-veil
      position="absolute"
      inset="0"
      rounded="inherit"
      zIndex="1"
      bg="bg/60"
      backdropFilter={VEIL_FILTER}
      css={{ WebkitBackdropFilter: VEIL_FILTER }}
      animation="fade-in 0.3s ease-out"
    />
  );
}
