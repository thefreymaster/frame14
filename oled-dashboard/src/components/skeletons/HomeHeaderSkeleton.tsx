import { Box, HStack, Skeleton, Spacer } from "@chakra-ui/react";
import { Board } from "../Board";

/**
 * Placeholder for <HomeHeader>.
 *
 * Sizes are cqi against this card, exactly like the real header — in landscape
 * the card only gets half the width, so a vmin block would be far too tall for
 * the clock it stands in for.
 */
export function HomeHeaderSkeleton({ span }: { span?: 1 | 2 }) {
  return (
    <Board span={span}>
      <Box css={{ containerType: "inline-size" }} width="100%" minW="0">
        {/* Row 1: date — condition + humidity */}
        <HStack width="100%" align="center" mb="1.2cqi" minW="0">
          <Skeleton height="4.1cqi" width="34cqi" borderRadius="0.4vmin" />
          <Spacer />
          <Skeleton height="4.1cqi" width="14cqi" borderRadius="0.4vmin" />
          <Skeleton
            height="4.1cqi"
            width="7cqi"
            borderRadius="0.4vmin"
            ml="1vmin"
          />
        </HStack>

        {/* Row 2: time — temp */}
        <HStack width="100%" align="center" minW="0">
          <Skeleton height="14.7cqi" width="44cqi" borderRadius="0.8vmin" />
          <Spacer />
          <Skeleton height="13.7cqi" width="18cqi" borderRadius="0.8vmin" />
        </HStack>
      </Box>
    </Board>
  );
}
