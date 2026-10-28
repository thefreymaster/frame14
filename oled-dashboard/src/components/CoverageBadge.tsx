import { Badge, Icon } from "@chakra-ui/react";
import { PiSolarRoof } from "react-icons/pi";
import type { HomeEnergy } from "../hooks/useHomeData";
import { coverage } from "../lib/energy";

/**
 * How much of today's use the solar has covered, as a Badge: the panels and
 * the percentage in the solar line's yellow, green once it is the whole day's
 * use — the body's big figure, for the energy card's header, so it reads with
 * the card collapsed. Render it only once today's totals are in (the figure
 * is 0 until then).
 */
export function CoverageBadge({ energy }: { energy: HomeEnergy }) {
  const pct = Math.round(coverage(energy));
  return (
    <Badge
      colorPalette={pct >= 100 ? "green" : "yellow"}
      aria-label={`Solar covered ${pct}% of today's use`}
    >
      <Icon aria-hidden>
        <PiSolarRoof />
      </Icon>
      {pct}%
    </Badge>
  );
}
