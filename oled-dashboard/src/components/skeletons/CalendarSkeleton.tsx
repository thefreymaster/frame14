import { Box, VStack } from "@chakra-ui/react";
import { Board } from "../Board";
import { CHIP_GAP, CHIP_RADIUS } from "../../lib/surfaces";
import { SkeletonBlock } from "./SkeletonBlock";
import { SkeletonSectionTitle } from "./SkeletonSectionTitle";

const EVENT_WIDTHS = ["100%", "100%", "100%"];

/** Placeholder for <CalendarSection>: the TODAY heading and a few event chips. */
export function CalendarSkeleton({ span }: { span?: 1 | 2 }) {
  return (
    <Board
      span={span}
      title={<SkeletonSectionTitle width="16vmin" meta="14vmin" />}
    >
      <Box mb="1.2vmin">
        <SkeletonSectionTitle width="9vmin" />
      </Box>
      <VStack gap={CHIP_GAP} align="stretch" width="100%">
        {EVENT_WIDTHS.map((width, i) => (
          <SkeletonBlock
            key={i}
            width={width}
            height="6.6vmin"
            borderRadius={CHIP_RADIUS}
          />
        ))}
      </VStack>
    </Board>
  );
}
