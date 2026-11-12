import { Card, Grid, HStack, Skeleton } from "@chakra-ui/react";
import { LIGHT_TILE_COLUMNS_CARD } from "../../lib/lightsConfig";

/**
 * Placeholder for the Scenes card's tiles while their states are on their
 * way: `count` tiles each the shape of a SceneTile — the icon at the left,
 * the name beside it.
 */
export function ScenesSkeleton({ count }: { count: number }) {
  return (
    <Grid gap="3" width="100%" templateColumns={LIGHT_TILE_COLUMNS_CARD}>
      {Array.from({ length: count }).map((_, i) => (
        <Card.Root
          key={i}
          size="sm"
          variant="outline"
          borderRadius="sm"
          minW="0"
        >
          <Card.Body p="3">
            <HStack align="center" gap="3">
              <Skeleton boxSize="7" rounded="sm" flexShrink={0} />
              <Skeleton height="4" width="70%" />
            </HStack>
          </Card.Body>
        </Card.Root>
      ))}
    </Grid>
  );
}
