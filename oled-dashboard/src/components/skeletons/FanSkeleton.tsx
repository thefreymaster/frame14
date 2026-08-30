import { Box } from "@chakra-ui/react";
import { Board } from "../Board";
import { CHIP_GAP, CHIP_RADIUS } from "../../lib/surfaces";
import { SkeletonBlock } from "./SkeletonBlock";
import { SkeletonSectionTitle } from "./SkeletonSectionTitle";

/** Placeholder for <FanSection>: one chip per configured fan. */
export function FanSkeleton({ count, span }: { count: number; span?: 1 | 2 }) {
  return (
    <Board span={span} title={<SkeletonSectionTitle width="10vmin" />}>
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fill, minmax(34vmin, 1fr))"
        gap={CHIP_GAP}
        width="100%"
      >
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonBlock key={i} height="6.6vmin" borderRadius={CHIP_RADIUS} />
        ))}
      </Box>
    </Board>
  );
}
