import {
  Card,
  Grid,
  HStack,
  Skeleton,
  SkeletonCircle,
  Stack,
} from "@chakra-ui/react";
import { LIGHT_TILE_COLUMNS } from "../../lib/lightsConfig";

/**
 * Placeholder for a LightsSection while its lights' states are on their way:
 * `count` tiles in the tiles' grid, each the shape of a LightControl — the
 * round badge and the status across the top, the name under them.
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
            <Stack gap="3">
              <HStack justify="space-between" align="center" gap="2">
                <SkeletonCircle size="10" />
                <Skeleton height="4" width="8" />
              </HStack>
              <Skeleton height="5" width="70%" />
            </Stack>
          </Card.Body>
        </Card.Root>
      ))}
    </Grid>
  );
}
