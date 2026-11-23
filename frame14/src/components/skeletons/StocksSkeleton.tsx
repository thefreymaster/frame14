import { Card, Grid, HStack, Skeleton, Stack } from "@chakra-ui/react";

/** The Stocks page before its first answer: a card a ticker, its figures to come. */
export function StocksSkeleton({ count }: { count: number }) {
  return (
    <Grid
      gap="gutter"
      css={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 17rem), 1fr))" }}
      data-stocks-skeleton=""
    >
      {Array.from({ length: Math.max(1, count) }).map((_, i) => (
        <Card.Root key={i} size={{ base: "sm", md: "md" }} bg="bg.surface" borderColor="border.surface">
          <Card.Header>
            <HStack gap="2">
              <Skeleton boxSize="5" rounded="sm" />
              <Skeleton height="5" width="4rem" />
            </HStack>
          </Card.Header>
          <Card.Body>
            <Stack gap="3">
              <Skeleton height="10" width="9rem" />
              <Skeleton height="5" width="7rem" />
              <Skeleton height="1.5" rounded="full" />
            </Stack>
          </Card.Body>
        </Card.Root>
      ))}
    </Grid>
  );
}
