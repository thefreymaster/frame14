import { Badge } from "@chakra-ui/react";
import type { HomeEnergy } from "../hooks/useHomeData";
import { grid } from "../lib/energy";

/**
 * Which way the power is going through the meter, in a word (0.176.0, the
 * user, of the Now card's header: "add a tag to the header of the card says
 * Importing or Exporting depending on what is happenjng"): Exporting in
 * green, Importing in orange — the colours of the figure beside it
 * (GridBadge), whose arrow says the same to someone who knows it. Render it
 * only while `grid(energy)` is active, as that one is.
 */
export function GridDirectionBadge({ energy }: { energy: HomeEnergy }) {
  const { exporting } = grid(energy);
  return (
    <Badge
      colorPalette={exporting ? "green" : "orange"}
      data-grid-direction={exporting ? "exporting" : "importing"}
    >
      {exporting ? "Exporting" : "Importing"}
    </Badge>
  );
}
