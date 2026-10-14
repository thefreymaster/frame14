import { Skeleton, Stack } from "@chakra-ui/react";
import { Board } from "../Board";
import { SkeletonSectionTitle } from "./SkeletonSectionTitle";

/** Placeholder for <CalendarSection>: the Today heading and a few events. */
export function CalendarSkeleton({ span }: { span?: 1 | 2 }) {
  return (
    <Board span={span} title={<SkeletonSectionTitle meta="6rem" />}>
      <Skeleton height="5" width="5rem" />
      <Stack gap="2" mt="3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height="3.5rem" />
        ))}
      </Stack>
    </Board>
  );
}
