import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { useBoardSurface } from "../lib/boardFrame";
import { dayRangeShare, fmtPrice } from "../lib/stocks";

/**
 * The day's range (0.179.0): the low to the high on a fully rounded track,
 * a round marker where the price is, the two figures under it. Finnhub's free
 * tier has no intraday prices to draw a day's line from; the range needs
 * none. The marker moves by a transform alone (the frame's WebView lays out
 * nothing for it): a box as wide as the track, slid by the price's share of
 * its own width, with the dot at its start.
 */
export function StockDayRange({
  low,
  high,
  price,
}: {
  low: number | null;
  high: number | null;
  price: number | null;
}) {
  const share = dayRangeShare(low, high, price);
  const ring = useBoardSurface();
  return (
    <Stack gap="1.5" data-stock-range="">
      <Box position="relative" height="1.5" rounded="full" bg="bg.emphasized" data-stock-range-track="">
        {share != null && (
          <Box
            position="absolute"
            inset="0"
            pointerEvents="none"
            transform={`translateX(${(share * 100).toFixed(2)}%)`}
            transition="transform 0.4s ease-out"
            _motionReduce={{ transition: "none" }}
            data-stock-range-share={share.toFixed(4)}
          >
            <Box
              position="absolute"
              top="50%"
              left="0"
              boxSize="3.5"
              rounded="full"
              bg="fg"
              borderWidth="2px"
              borderColor={ring}
              transform="translate(-50%, -50%)"
              data-stock-range-marker=""
            />
          </Box>
        )}
      </Box>
      <Flex
        justify="space-between"
        gap="3"
        textStyle="xs"
        color="fg.muted"
        fontVariantNumeric="tabular-nums"
        data-stock-range-labels=""
      >
        <Text data-stock-low="">{fmtPrice(low)}</Text>
        <Text>Day&rsquo;s range</Text>
        <Text data-stock-high="">{fmtPrice(high)}</Text>
      </Flex>
    </Stack>
  );
}
