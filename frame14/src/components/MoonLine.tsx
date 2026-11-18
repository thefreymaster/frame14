import { Box, HStack, Text, type StackProps } from "@chakra-ui/react";
import { moonDetail, useMoon } from "../hooks/useMoon";
import { MOON_LABEL } from "../lib/moon";
import { MoonIcon } from "./MoonIcon";

/**
 * The moon tonight in one line, for Home's weather card (0.176.0, the user:
 * "Add the moon phase to the weather card on the home page"): the moon drawn
 * as it stands, the phase's name, and after it — quieter, and the first to
 * give way on a narrow card — how much of it is lit and the day of the full
 * or new moon it is on its way to. What the Weather page's Now card and the
 * Weather sheet say in a well (MoonPhase), from the same reading (useMoon:
 * the date's, no entity). The type's size is the caller's (`textStyle`).
 */
export function MoonLine(props: StackProps) {
  const now = useMoon();
  const { moon } = now;
  const name = MOON_LABEL[moon.phase];
  const detail = moonDetail(now);

  return (
    <HStack
      gap="2"
      minW="0"
      aria-label={`Moon: ${name}, ${detail}`}
      data-moon-line={moon.phase}
      {...props}
    >
      <Box fontSize="1.25em" lineHeight="1" flexShrink={0} aria-hidden>
        <MoonIcon lit={moon.lit} waxing={moon.waxing} />
      </Box>
      <Text flexShrink={0} whiteSpace="nowrap" aria-hidden>
        {name}
      </Text>
      <Text color="fg.muted" truncate minW="0" aria-hidden>
        {detail}
      </Text>
    </HStack>
  );
}
