import { Skeleton, Stack } from "@chakra-ui/react";

/** Placeholder for <CalendarSection>'s body: the Today heading and a few events. */
export function CalendarSkeleton() {
  return (
    <>
      <Skeleton height="5" width="5rem" />
      <Stack gap="2" mt="3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height="3.5rem" />
        ))}
      </Stack>
    </>
  );
}
