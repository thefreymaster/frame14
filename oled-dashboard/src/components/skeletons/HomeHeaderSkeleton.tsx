import { HStack, Skeleton, Spacer } from "@chakra-ui/react";
import { Board } from "../Board";

/** Placeholder for <HomeHeader>: date line, then the clock and temperature. */
export function HomeHeaderSkeleton({ span }: { span?: 1 | 2 }) {
  return (
    <Board span={span}>
      <HStack width="100%">
        <Skeleton height="8" width="45%" />
        <Spacer />
        <Skeleton height="8" width="20%" />
      </HStack>
      <HStack width="100%" mt="4">
        <Skeleton height="7rem" width="50%" />
        <Spacer />
        <Skeleton height="7rem" width="25%" />
      </HStack>
    </Board>
  );
}
