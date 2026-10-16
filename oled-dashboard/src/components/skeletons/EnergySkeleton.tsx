import { HStack, Skeleton, Spacer, Stack } from "@chakra-ui/react";

/** Placeholder for <EnergySection>'s body: coverage figure, bar, two day totals. */
export function EnergySkeleton() {
  return (
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
  );
}
