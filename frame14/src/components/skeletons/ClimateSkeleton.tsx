import { Box, Card, Grid, HStack, Skeleton, Stack } from "@chakra-ui/react";
import { useEntitiesConfig } from "../../hooks/useEntitiesConfig";
import { climateGridCss, TILE_MIN_LG_REM } from "../../lib/hvac";
import type { ClimateTileSize } from "../ClimateTiles";

// Until /api/entities answers (it usually has — staleTime: Infinity).
const DEFAULT_COUNT = 2;

/**
 * Placeholder for <ClimateSection>'s tiles: one per configured thermostat,
 * in the tiles' `size` and `square` (/climate, 0.120) so nothing moves when
 * they arrive.
 */
export function ClimateSkeleton({
  size = "md",
  square = false,
}: {
  size?: ClimateTileSize;
  square?: boolean;
}) {
  const lg = size !== "md";
  const xl = size === "xl";
  const { data: config } = useEntitiesConfig();
  const count = config?.climate?.length || DEFAULT_COUNT;

  return (
    <Box css={{ containerType: "inline-size" }} width="100%" minW="0">
      <Grid
        css={climateGridCss(count, lg ? TILE_MIN_LG_REM : undefined)}
        width="100%"
      >
        {Array.from({ length: count }).map((_, i) => (
          <Card.Root
            key={i}
            size="sm"
            variant="outline"
            borderRadius="sm"
            aspectRatio={square ? "1" : undefined}
          >
            <Card.Body p={lg ? "5" : "3"}>
              {square ? (
                // The square tile's shape (0.145.2): the name at the top,
                // the reading at the centre, the status centred below.
                <Grid flex="1" gap="1" templateRows="1fr auto 1fr">
                  <Skeleton height="5" width="60%" />
                  {/* The 5xl reading, line height 1 (0.145.3). */}
                  <Skeleton height="3rem" width="45%" justifySelf="center" />
                  <Skeleton height="5" width="45%" justifySelf="center" alignSelf="end" />
                </Grid>
              ) : (
                <Stack gap="1" flex="1">
                  <Skeleton height={lg ? "7" : "5"} width="60%" />
                  <HStack justify="space-between" gap="2">
                    <Skeleton height={xl ? "4.5rem" : lg ? "16" : "8"} width="30%" />
                    <Skeleton height={lg ? "6" : "5"} width="40%" />
                  </HStack>
                </Stack>
              )}
            </Card.Body>
          </Card.Root>
        ))}
      </Grid>
    </Box>
  );
}
