import { Box, Card, Grid, HStack, Skeleton, Stack } from "@chakra-ui/react";
import { useEntitiesConfig } from "../../hooks/useEntitiesConfig";
import { climateGridCss } from "../../lib/hvac";

// Until /api/entities answers (it usually has — staleTime: Infinity).
const DEFAULT_COUNT = 2;

/** Placeholder for <ClimateSection>'s tiles: one per configured thermostat. */
export function ClimateSkeleton() {
  const { data: config } = useEntitiesConfig();
  const count = config?.climate?.length || DEFAULT_COUNT;

  return (
    <Box css={{ containerType: "inline-size" }} width="100%" minW="0">
      <Grid css={climateGridCss(count)} width="100%">
        {Array.from({ length: count }).map((_, i) => (
          <Card.Root key={i} size="sm" variant="outline" borderRadius="sm">
            <Card.Body p="3">
              <Stack gap="1">
                <Skeleton height="5" width="60%" />
                <HStack justify="space-between" gap="2">
                  <Skeleton height="8" width="30%" />
                  <Skeleton height="5" width="40%" />
                </HStack>
              </Stack>
            </Card.Body>
          </Card.Root>
        ))}
      </Grid>
    </Box>
  );
}
