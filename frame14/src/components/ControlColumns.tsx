import type { ReactNode } from "react";
import { SimpleGrid, Stack } from "@chakra-ui/react";
import { useDesktop } from "../hooks/useDesktop";

/**
 * A /control tab's cards: on a desktop two columns side by side (0.148.0,
 * the user: "desktop should be two columns"), `start` on the left and `end`
 * on the right, each a stack of its own so a tall card (Navigation, Screen)
 * leaves no hole beside it; elsewhere one stack, `start` then `end` — the
 * order a phone reads them in.
 */
export function ControlColumns({
  start,
  end,
}: {
  start: ReactNode;
  end: ReactNode;
}) {
  const desktop = useDesktop();
  if (!desktop) {
    return (
      <Stack gap="gutter">
        {start}
        {end}
      </Stack>
    );
  }
  return (
    <SimpleGrid columns={2} gap="gutter" alignItems="start">
      <Stack gap="gutter" minW="0">
        {start}
      </Stack>
      <Stack gap="gutter" minW="0">
        {end}
      </Stack>
    </SimpleGrid>
  );
}
