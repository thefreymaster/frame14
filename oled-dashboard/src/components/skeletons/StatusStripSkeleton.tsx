import { Flex, Skeleton } from "@chakra-ui/react";

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
      gap="chipGap"
      wrap="wrap"
      align="center"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height="5.2vmin" width="26vmin" borderRadius="chip" />
      ))}
    </Flex>
  );
}
