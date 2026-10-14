import { Box, HStack, Skeleton, SkeletonCircle } from "@chakra-ui/react";

/**
 * Stand-in for a card's <SectionTitle>: the icon as a dot, the label as a
 * bar, and an optional trailing bar for the summary on the right. The bars
 * may shrink (a loading Skeleton doesn't by default), so a narrow card keeps
 * them inside its edge.
 */
export function SkeletonSectionTitle({
  width = "8rem",
  meta,
}: {
  width?: string;
  meta?: string;
}) {
  return (
    <HStack width="100%" gap="2">
      <SkeletonCircle size="5" />
      <Skeleton height="5" width={width} flexShrink="1" minW="0" />
      <Box flex="1" />
      {meta && <Skeleton height="4" width={meta} flexShrink="1" minW="0" />}
    </HStack>
  );
}
