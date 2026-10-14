import { Box, Card, Grid, HStack, Skeleton, Stack } from "@chakra-ui/react";
import { Board } from "../Board";
import { SkeletonSectionTitle } from "./SkeletonSectionTitle";
import { climateGridCss } from "../../lib/hvac";

/** Placeholder for <ClimateSection>: one tile per configured thermostat. */
export function ClimateSkeleton({
  count,
  span,
}: {
  count: number;
  span?: 1 | 2;
}) {
  return (
    <Board span={span} title={<SkeletonSectionTitle />}>
      <Box css={{ containerType: "inline-size" }} width="100%" minW="0">
        <Grid css={climateGridCss(count)} width="100%">
          {Array.from({ length: count }).map((_, i) => (
            <Card.Root key={i} size="sm" variant="outline">
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
    </Board>
  );
}
