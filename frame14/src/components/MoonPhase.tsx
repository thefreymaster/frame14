import { Box, Card, HStack, Stat } from "@chakra-ui/react";
import { useNow } from "../hooks/useNow";
import { MOON_LABEL, moonAt, nextMoonPhase } from "../lib/moon";
import { MoonIcon } from "./MoonIcon";
import { Well } from "./Well";

/** The moon moves a percent of its disc in a couple of hours: looked at again this often. */
const MOON_EVERY_MS = 10 * 60_000;

const dayOf = (date: Date) =>
  date.toLocaleDateString([], { month: "short", day: "numeric" });

/**
 * The moon tonight, a well in the weather's Now card (0.174.0, the user: "Add
 * another concave area that has the current moon phase with an icon"): the
 * moon drawn as it stands (MoonIcon), the phase's name, how much of it is
 * lit, and the day of the full moon it is growing towards — or, once it is
 * waning, of the new one. From the date alone (lib/moon): Apple Weather, as
 * Home Assistant passes it on, says nothing of the moon.
 */
export function MoonPhase() {
  const ms = useNow(MOON_EVERY_MS);
  const now = new Date(ms);
  const moon = moonAt(now);
  // What it is on its way to: a full moon, then a new one — and on the day
  // of either, the other.
  const toFull = moon.phase === "new" || (moon.phase !== "full" && moon.waxing);
  const next = nextMoonPhase(now, toFull ? 2 : 0);

  return (
    <Well data-weather-well="moon" data-moon={moon.phase}>
      <Card.Body>
        <HStack gap="4">
          <Box fontSize="3rem" lineHeight="1" flexShrink={0}>
            <MoonIcon lit={moon.lit} waxing={moon.waxing} />
          </Box>
          <Stat.Root size="sm" minW="0">
            <Stat.Label>Moon</Stat.Label>
            <Stat.ValueText textStyle="lg">
              {MOON_LABEL[moon.phase]}
            </Stat.ValueText>
            <Stat.HelpText>
              {`${Math.round(moon.lit * 100)}% lit · ${toFull ? "Full" : "New"} moon ${dayOf(next)}`}
            </Stat.HelpText>
          </Stat.Root>
        </HStack>
      </Card.Body>
    </Well>
  );
}
