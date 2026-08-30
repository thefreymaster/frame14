import { Box, HStack } from "@chakra-ui/react";
import { SkeletonBlock } from "./SkeletonBlock";

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
      <SkeletonBlock boxSize="2.4vmin" borderRadius="full" flexShrink={0} />
      <SkeletonBlock height="2.2vmin" width={width} borderRadius="0.4vmin" />
      <Box flex="1" minW="0" />
      {meta && (
        <SkeletonBlock height="1.8vmin" width={meta} borderRadius="0.4vmin" />
      )}
    </HStack>
  );
}
