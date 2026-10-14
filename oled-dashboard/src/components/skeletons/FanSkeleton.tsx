import { Grid, Skeleton } from "@chakra-ui/react";
import { Board } from "../Board";
import { SkeletonSectionTitle } from "./SkeletonSectionTitle";

/** Placeholder for <FanSection>: one button per configured fan. */
export function FanSkeleton({ count, span }: { count: number; span?: 1 | 2 }) {
  return (
    <Board span={span} title={<SkeletonSectionTitle width="5rem" />}>
      <Grid templateColumns="repeat(auto-fill, minmax(14rem, 1fr))" gap="3">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} height="11" />
        ))}
      </Grid>
    </Board>
  );
}
