import { Grid, HStack, Skeleton, SkeletonCircle, Stack } from "@chakra-ui/react";
import { SPARKLINE_HEIGHT } from "../../lib/energy";

/**
 * Placeholder for <EnergySection>'s body: the three nodes of the flow with
 * their figures, then the coverage figure beside the keyed strip.
 */
export function EnergySkeleton() {
  return (
    <Stack gap="3">
      <Grid
        templateColumns="auto 1fr auto 1fr auto"
        columnGap="1.5"
        rowGap="2"
        alignItems="center"
        justifyItems="center"
      >
        <SkeletonCircle size="10" />
        <Skeleton height="1px" width="100%" />
        <SkeletonCircle size="10" />
        <Skeleton height="1px" width="100%" />
        <SkeletonCircle size="10" />
        <Skeleton height="4" width="3rem" />
        <span />
        <Skeleton height="4" width="3rem" />
        <span />
        <Skeleton height="4" width="3rem" />
      </Grid>
      <HStack gap="4" align="stretch">
        <Stack gap="1" justify="center" flexShrink={0}>
          <Skeleton height="9" width="4.5rem" />
          <Skeleton height="3" width="6rem" />
        </Stack>
        <Stack gap="2" flex="1" justify="end">
          <Skeleton height="4" width="60%" />
          <Skeleton height={SPARKLINE_HEIGHT} />
        </Stack>
      </HStack>
    </Stack>
  );
}
