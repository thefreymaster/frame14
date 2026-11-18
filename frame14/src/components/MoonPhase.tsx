import { Box, Card, HStack, Stat } from "@chakra-ui/react";
import { moonDetail, useMoon } from "../hooks/useMoon";
import { MOON_LABEL } from "../lib/moon";
import { MoonIcon } from "./MoonIcon";
import { Well } from "./Well";

/**
 * The moon tonight, a well in the weather's Now card (0.174.0, the user: "Add
 * another concave area that has the current moon phase with an icon"): the
 * moon drawn as it stands (MoonIcon), the phase's name, how much of it is
 * lit, and the day of the full moon it is growing towards — or, once it is
 * waning, of the new one. From the date alone (lib/moon, through useMoon):
 * Apple Weather, as Home Assistant passes it on, says nothing of the moon.
 * Home's weather card has the same in a line (MoonLine).
 */
export function MoonPhase() {
  const now = useMoon();
  const { moon } = now;

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
            <Stat.HelpText>{moonDetail(now)}</Stat.HelpText>
          </Stat.Root>
        </HStack>
      </Card.Body>
    </Well>
  );
}
