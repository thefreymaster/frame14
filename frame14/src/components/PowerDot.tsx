import { Box } from "@chakra-ui/react";
import { ENERGY_COLORS } from "../lib/energy";

/**
 * The marker on a power line: a dot in the line's colour with a ring of the
 * surface behind it, so it stands off the other line where they cross.
 * Placed in HTML over the stretched SVG, so it never stretches with it.
 */
export function PowerDot({
  left,
  top,
  color,
  ring = "bg.panel",
}: {
  /** CSS positions within the plot, e.g. "37.5%". */
  left: string;
  top: string;
  color: "solar" | "home";
  /** The surface the dot sits on, for its ring. */
  ring?: string;
}) {
  return (
    <Box
      position="absolute"
      left={left}
      top={top}
      transform="translate(-50%, -50%)"
      boxSize="3"
      rounded="full"
      bg={ENERGY_COLORS[color]}
      borderWidth="2px"
      borderColor={ring}
      pointerEvents="none"
    />
  );
}
