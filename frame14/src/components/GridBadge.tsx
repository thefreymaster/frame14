import { Badge } from "@chakra-ui/react";
import type { HomeEnergy } from "../hooks/useHomeData";
import { fmtW, grid } from "../lib/energy";

/**
 * The net grid flow now as a Badge: arrow and colour carry the direction,
 * green up and out, orange down and in. Render it only while `grid(energy)`
 * is active; the header of the energy card and of /energy's Now card.
 */
export function GridBadge({ energy }: { energy: HomeEnergy }) {
  const { abs, exporting } = grid(energy);
  return (
    <Badge
      colorPalette={exporting ? "green" : "orange"}
      aria-label={`${exporting ? "Exporting" : "Importing"} ${fmtW(abs)}`}
    >
      {exporting ? "↑" : "↓"} {fmtW(abs)}
    </Badge>
  );
}
