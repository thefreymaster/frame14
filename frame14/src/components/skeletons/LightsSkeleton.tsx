import { Card, Grid, HStack, Skeleton, Stack } from "@chakra-ui/react";
import { LIGHT_TILE_COLUMNS } from "../../lib/lightsConfig";

/**
 * Placeholder for a LightsSection while its lights' states are on their way:
 * `count` tiles in the tiles' grid, each the shape of a LightControl — the
 * bulb at the left, the name over the status beside it (0.139).
 */
export function LightsSkeleton({
  count,
  columns = LIGHT_TILE_COLUMNS,
}: {
  count: number;
  /** As LightsSection's. */
  columns?: typeof LIGHT_TILE_COLUMNS | string;
}) {
  return (
    <Grid gap="3" width="100%" templateColumns={columns}>
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
              <Stack gap="1.5" flex="1">
                <Skeleton height="4" width="70%" />
                <Skeleton height="4" width="8" />
              </Stack>
            </HStack>
          </Card.Body>
        </Card.Root>
      ))}
    </Grid>
  );
}
