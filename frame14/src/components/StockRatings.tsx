import { Box, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import {
  RATING_COLOR,
  RATING_LABEL,
  ratingsMonth,
  ratingsShares,
  type StockRatings as Ratings,
} from "../lib/stocks";

/**
 * What the analysts say of a ticker, in its drawer (0.180.0): one thin bar
 * split by how many rate it a strong buy, a buy, a hold, a sell and a strong
 * sell — in that order, each part as wide as its share — over a legend that
 * names every rating with its count, then the month and how many analysts.
 *
 * A diverging scale (lib/stocks' RATING_COLOR: blue to buy, red to sell, gray
 * between), a hairline of the well between the parts. The counts are in the
 * legend, in the text's own colours, so nothing is read from colour alone; a
 * rating nobody gave draws no part and still has its row.
 */
export function StockRatings({ ratings }: { ratings: Ratings }) {
  const { total, parts } = ratingsShares(ratings);
  const month = ratingsMonth(ratings.period);
  return (
    <Stack gap="3" data-stock-ratings="">
      <Flex
        height="2"
        gap="2px"
        role="img"
        aria-label={parts.map((p) => `${p.count} ${RATING_LABEL[p.key].toLowerCase()}`).join(", ")}
        data-rating-bar=""
      >
        {parts
          .filter((p) => p.count > 0)
          .map((p) => (
            <Box
              key={p.key}
              flexGrow={p.count}
              flexBasis="0"
              minW="1"
              rounded="full"
              bg={RATING_COLOR[p.key]}
              title={`${RATING_LABEL[p.key]}: ${p.count} (${Math.round(p.share * 100)}%)`}
              data-rating={p.key}
            />
          ))}
      </Flex>
      <Flex wrap="wrap" columnGap="4" rowGap="1.5" textStyle="sm">
        {parts.map((p) => (
          <HStack key={p.key} gap="1.5">
            <Box boxSize="2.5" rounded="full" flexShrink="0" bg={RATING_COLOR[p.key]} aria-hidden="true" />
            <Text color="fg.muted">{RATING_LABEL[p.key]}</Text>
            <Text fontVariantNumeric="tabular-nums" data-rating-count={p.key}>
              {p.count}
            </Text>
          </HStack>
        ))}
      </Flex>
      <Text textStyle="xs" color="fg.muted" data-rating-month="">
        {[month, `${total} ${total === 1 ? "analyst" : "analysts"}`].filter(Boolean).join(" · ")}
      </Text>
    </Stack>
  );
}
