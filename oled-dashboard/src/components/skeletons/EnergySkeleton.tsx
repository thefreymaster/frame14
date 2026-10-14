import { HStack, Skeleton, Spacer, Stack } from "@chakra-ui/react";
import { Board } from "../Board";
import { SkeletonSectionTitle } from "./SkeletonSectionTitle";

/** Placeholder for <EnergySection>: coverage figure, bar, two day totals. */
export function EnergySkeleton({ span }: { span?: 1 | 2 }) {
  return (
    <Board span={span} title={<SkeletonSectionTitle meta="5rem" />}>
      <Stack gap="3">
        <Skeleton height="4" width="60%" />
        <Skeleton height="8" width="30%" />
        <Skeleton height="3" width="100%" />
        <HStack mt="1">
          <Skeleton height="6" width="35%" />
          <Spacer />
          <Skeleton height="6" width="35%" />
        </HStack>
      </Stack>
    </Board>
  );
}
