import { Box, VStack } from "@chakra-ui/react";
import { Board } from "../Board";
import { SkeletonBlock } from "./SkeletonBlock";
import { SkeletonSectionTitle } from "./SkeletonSectionTitle";
import { SINGLE_ROW_MIN_PX } from "../ClimateSection";

/** Placeholder for <ClimateSection>: one dial per configured thermostat. */
export function ClimateSkeleton({
  count,
  span,
}: {
  count: number;
  span?: 1 | 2;
}) {
  return (
    <Board span={span} title={<SkeletonSectionTitle width="14vmin" />}>
      <Box css={{ containerType: "inline-size" }} width="100%" minW="0">
        <Box
          display="grid"
          gridTemplateColumns="repeat(auto-fill, minmax(20vmin, 1fr))"
          css={{
            [`@container (min-width: ${SINGLE_ROW_MIN_PX}px)`]: {
              gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
            },
          }}
          columnGap="2vmin"
          rowGap="2vmin"
          width="100%"
        >
          {Array.from({ length: count }).map((_, i) => (
            <VStack key={i} gap="1vmin" align="center">
              <SkeletonBlock width="100%" aspectRatio="1" borderRadius="full" />
              <SkeletonBlock
                height="1.8vmin"
                width="70%"
                borderRadius="0.4vmin"
              />
            </VStack>
          ))}
        </Box>
      </Box>
    </Board>
  );
}
