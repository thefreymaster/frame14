import { Grid } from "@chakra-ui/react";
import { ROWS_MAX, UPRIGHT_WIDE, type StockQuote } from "../lib/stocks";
import { StockCard } from "./StockCard";

/**
 * The tickers' cards (0.179.0), in `stock_tickers`' order: as many across as
 * fit at 17rem, sharing the width — one on a phone, three on a desktop — or,
 * a handful of them on an upright frame or tablet, a card a row sharing the
 * page's height, so the frame's 2400px is filled by the cards rather than a
 * short row of them at the top (each card's figures grow with it: StockCard).
 */
export function StocksList({
  quotes,
  onOpen,
}: {
  quotes: readonly StockQuote[];
  /** A card tapped: its ticker's drawer. */
  onOpen?: (symbol: string) => void;
}) {
  const rows = quotes.length <= ROWS_MAX;
  return (
    <Grid
      gap="gutter"
      flex="1"
      data-stocks=""
      css={{
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 17rem), 1fr))",
        alignContent: "start",
        ...(rows && {
          [UPRIGHT_WIDE]: {
            gridTemplateColumns: "minmax(0, 1fr)",
            gridAutoRows: "minmax(12rem, 1fr)",
            alignContent: "stretch",
          },
        }),
      }}
    >
      {quotes.map((quote) => (
        <StockCard
          key={quote.symbol}
          quote={quote}
          fill={rows}
          onOpen={onOpen && (() => onOpen(quote.symbol))}
        />
      ))}
    </Grid>
  );
}
