import { Box, Flex, HStack, VStack } from "@chakra-ui/react";
import { Board } from "../Board";
import { SkeletonBlock } from "./SkeletonBlock";
import { SkeletonSectionTitle } from "./SkeletonSectionTitle";

/** Placeholder for <EnergySection>: coverage figure, bar, two day totals. */
export function EnergySkeleton({ span }: { span?: 1 | 2 }) {
  return (
    <Board
      span={span}
      title={<SkeletonSectionTitle width="12vmin" meta="10vmin" />}
    >
      <VStack align="stretch" gap="1.4vmin" width="100%" minW="0">
        <HStack align="center" gap="1.4vmin" minW="0">
          <SkeletonBlock height="7vmin" width="14vmin" borderRadius="0.8vmin" />
          <SkeletonBlock height="2vmin" width="24vmin" borderRadius="0.4vmin" />
        </HStack>

        {/* Same 1.2vmin rail the coverage bar fills. */}
        <SkeletonBlock height="1.2vmin" width="100%" borderRadius="999px" />

        <Flex gap="1.5vmin" rowGap="0.8vmin" wrap="wrap" width="100%">
          <HStack gap="1vmin" align="center" minW="0">
            <SkeletonBlock
              boxSize="2.4vmin"
              borderRadius="full"
              flexShrink={0}
            />
            <SkeletonBlock
              height="3vmin"
              width="16vmin"
              borderRadius="0.4vmin"
            />
          </HStack>
          <Box flex="1" minW="0" />
          <HStack gap="1vmin" align="center" minW="0">
            <SkeletonBlock
              boxSize="2.4vmin"
              borderRadius="full"
              flexShrink={0}
            />
            <SkeletonBlock
              height="3vmin"
              width="16vmin"
              borderRadius="0.4vmin"
            />
          </HStack>
        </Flex>
      </VStack>
    </Board>
  );
}
