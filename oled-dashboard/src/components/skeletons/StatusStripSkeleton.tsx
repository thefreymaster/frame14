import { Flex } from "@chakra-ui/react";
import { CHIP_GAP, CHIP_RADIUS } from "../../lib/surfaces";
import { SkeletonBlock } from "./SkeletonBlock";

/** Placeholder for <StatusStrip> — the idle printer / vacuum chips. */
export function StatusStripSkeleton({
  count = 2,
  span,
}: {
  count?: number;
  span?: 1 | 2;
}) {
  return (
    <Flex
      gridColumn={span === 2 ? "1 / -1" : undefined}
      width="100%"
      minW="0"
      gap={CHIP_GAP}
      wrap="wrap"
      align="center"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock
          key={i}
          height="5.2vmin"
          width="26vmin"
          borderRadius={CHIP_RADIUS}
        />
      ))}
    </Flex>
  );
}
