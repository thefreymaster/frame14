import { Box, HStack, Skeleton, SkeletonCircle } from "@chakra-ui/react";

/**
 * Stand-in for a card's <SectionTitle>: the icon glyph as a dot, the label as
 * a bar, and an optional trailing bar for the summary stat the real headers
 * show on the right (event count, "3 ON", grid draw).
 */
export function SkeletonSectionTitle({
  width = "12vmin",
  meta,
}: {
  width?: string;
  meta?: string;
}) {
  return (
    <HStack width="100%" align="center" gap="1vmin">
      <SkeletonCircle size="2.4vmin" flexShrink={0} />
      <Skeleton height="2.2vmin" width={width} borderRadius="0.4vmin" />
      <Box flex="1" minW="0" />
      {meta && (
        <Skeleton height="1.8vmin" width={meta} borderRadius="0.4vmin" />
      )}
    </HStack>
  );
}
