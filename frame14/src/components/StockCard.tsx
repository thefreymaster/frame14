import { Box, Grid, HStack, Stack, Text } from "@chakra-ui/react";
import { IoRemove, IoTrendingDown, IoTrendingUp } from "react-icons/io5";
import {
  DIRECTION_COLOR,
  UPRIGHT_WIDE,
  direction,
  fmtChange,
  fmtPercent,
  fmtPrice,
  type StockQuote,
} from "../lib/stocks";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { StockDayRange } from "./StockDayRange";
import { StockPrice } from "./StockPrice";

/** Wide enough for the price at the left and the range at the right. */
const WIDE = "@container (min-width: 34rem)";
/**
 * A row's card as tall as an upright frame gives three or two of them: the
 * figures a step larger, then another, so the card is filled with what it
 * says rather than stretched behind it. Chakra's own type scale, picked by
 * the card's height (a size container, in a row only).
 */
const TALL = "@container (min-width: 34rem) and (min-height: 13rem)";
const TALLER = "@container (min-width: 34rem) and (min-height: 22rem)";

const ICON = { up: IoTrendingUp, down: IoTrendingDown, flat: IoRemove } as const;

/**
 * One ticker's card (0.179.0): its symbol under the day's direction, the
 * price, the change against the previous close and its share, the day's
 * range, and the open and previous close. Stacked in a narrow card; a row —
 * the price at the left, the range at the right — in a wide one. `fill`: one
 * of a handful of rows sharing an upright screen's height (StocksList), its
 * figures as large as the card's height allows.
 */
export function StockCard({ quote, fill = false }: { quote: StockQuote; fill?: boolean }) {
  const way = direction(quote.change);
  const color = DIRECTION_COLOR[way];
  const Icon = ICON[way];
  return (
    <Board
      fill={fill}
      title={
        <SectionTitle icon={<Icon />} iconColor={color}>
          {quote.symbol}
        </SectionTitle>
      }
    >
      <Box
        flex="1"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        minH="0"
        data-stock={quote.symbol}
        data-direction={way}
        css={{
          containerType: "inline-size",
          ...(fill && { [UPRIGHT_WIDE]: { containerType: "size" } }),
        }}
      >
        <Grid
          gap="4"
          css={{
            gridTemplateColumns: "minmax(0, 1fr)",
            // The price as wide as it is — a four-figure one at a row's size
            // is wider than half the card — and the range the rest.
            [WIDE]: {
              gridTemplateColumns: "auto minmax(min(16rem, 100%), 1fr)",
              alignItems: "center",
              columnGap: "8",
            },
            [TALL]: {
              columnGap: "12",
              // Past 7xl the type scale has sizes but no text styles.
              "& [data-stock-price] > p": { fontSize: "8xl", lineHeight: "1" },
              "& [data-stock-change]": { textStyle: "3xl" },
              "& [data-stock-range-track]": { height: "3" },
              "& [data-stock-range-labels]": { textStyle: "lg" },
              "& [data-stock-stats]": { textStyle: "2xl", gap: "10" },
              "& [data-stock-stat-label]": { textStyle: "md" },
            },
            [TALLER]: {
              "& [data-stock-price] > p": { fontSize: "9xl", lineHeight: "1" },
              "& [data-stock-change]": { textStyle: "4xl" },
              "& [data-stock-range-track]": { height: "4" },
              "& [data-stock-range-labels]": { textStyle: "xl" },
              "& [data-stock-stats]": { textStyle: "3xl", gap: "12" },
              "& [data-stock-stat-label]": { textStyle: "lg" },
            },
          }}
        >
          <Stack gap="1" minW="0">
            <StockPrice price={quote.price} textStyle={{ base: "4xl", md: "5xl" }} />
            <Text
              textStyle={{ base: "md", md: "lg" }}
              fontWeight="medium"
              color={color}
              fontVariantNumeric="tabular-nums"
              data-stock-change=""
            >
              {quote.price == null
                ? "No quote from Finnhub"
                : `${fmtChange(quote.change)} (${fmtPercent(quote.changePercent)})`}
            </Text>
          </Stack>
          <Stack gap="3" minW="0">
            <StockDayRange low={quote.low} high={quote.high} price={quote.price} />
            <HStack gap="6" textStyle="sm" fontVariantNumeric="tabular-nums" data-stock-stats="">
              <Stack gap="0">
                <Text textStyle="xs" color="fg.muted" data-stock-stat-label="">
                  Open
                </Text>
                <Text data-stock-open="">{fmtPrice(quote.open)}</Text>
              </Stack>
              <Stack gap="0">
                <Text textStyle="xs" color="fg.muted" data-stock-stat-label="">
                  Prev close
                </Text>
                <Text data-stock-previous-close="">{fmtPrice(quote.previousClose)}</Text>
              </Stack>
            </HStack>
          </Stack>
        </Grid>
      </Box>
    </Board>
  );
}
