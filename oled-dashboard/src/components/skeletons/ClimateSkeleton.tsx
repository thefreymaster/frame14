import { Box, Grid, Skeleton, SkeletonCircle, VStack } from "@chakra-ui/react";
import { Board } from "../Board";
import { SkeletonSectionTitle } from "./SkeletonSectionTitle";
import { SINGLE_ROW_MIN_PX } from "../../lib/hvac";

/** Placeholder for <ClimateSection>: one dial per configured thermostat. */
export function ClimateSkeleton({
  count,
  span,
}: {
  count: number;
  span?: 1 | 2;
}) {
  return (
    <Board span={span} title={<SkeletonSectionTitle />}>
      <Box css={{ containerType: "inline-size" }} width="100%" minW="0">
        <Grid
          templateColumns="repeat(auto-fill, minmax(9rem, 1fr))"
          css={{
            [`@container (min-width: ${SINGLE_ROW_MIN_PX}px)`]: {
              gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
            },
          }}
          gap="4"
          width="100%"
        >
          {Array.from({ length: count }).map((_, i) => (
            <VStack key={i} gap="2">
              <SkeletonCircle size="auto" width="100%" aspectRatio="1" />
              <Skeleton height="4" width="70%" />
            </VStack>
          ))}
        </Grid>
      </Box>
    </Board>
  );
}
