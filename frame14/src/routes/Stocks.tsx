import { useState } from "react";
import { Flex } from "@chakra-ui/react";
import { IoTrendingUpOutline } from "react-icons/io5";
import { Board } from "../components/Board";
import { MarketSessionBadge } from "../components/MarketSessionBadge";
import { PageHeader } from "../components/PageHeader";
import { PageShell } from "../components/PageShell";
import { StockDialog } from "../components/StockDialog";
import { StocksList } from "../components/StocksList";
import { StocksSkeleton } from "../components/skeletons/StocksSkeleton";
import { EmptyState } from "../components/ui/empty-state";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useStocks } from "../hooks/useStocks";
import { PAGE_GUTTER } from "../lib/navMetrics";

const NO_TICKERS: readonly string[] = [];

/**
 * /stocks (0.179.0): the add-on's `stock_tickers`, priced by Finnhub — live
 * from its trades socket in the regular session, its quotes otherwise — a
 * card a ticker under the market's session. Only with a `finnhub_api_key`
 * (lib/features' `stocks`).
 *
 * A tap on a card opens that ticker's drawer (0.180.0, StockDialog). Which
 * ticker is the page's own state, not the address — as the Weather and
 * Energy drawers are — and it is kept while the drawer closes, so the
 * closing drawer still has its ticker to draw.
 */
export function Stocks() {
  const { data: stocks, isError } = useStocks();
  const tickers = useEntitiesConfig().data?.stocks ?? NO_TICKERS;
  const [symbol, setSymbol] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const failed = stocks?.status === "error";
  const quote = stocks?.quotes.find((q) => q.symbol === symbol) ?? null;

  return (
    <PageShell>
      {/* At least the page's height, so a handful of rows on an upright
          frame share it (StocksList). */}
      <Flex
        direction="column"
        gap="gutter"
        minH={`calc(var(--page-height, 100dvh) - 2 * ${PAGE_GUTTER})`}
        data-stocks-status={stocks?.status}
      >
        <PageHeader
          icon={<IoTrendingUpOutline />}
          title="Stocks"
          actions={stocks && <MarketSessionBadge stocks={stocks} />}
        />
        {stocks?.status === "error" ? (
          <Board>
            <EmptyState
              icon={<IoTrendingUpOutline />}
              title="Finnhub refused the key"
              description={`${stocks.error ?? ""} Check finnhub_api_key in the add-on's Configuration tab.`.trim()}
              data-stocks-error=""
            />
          </Board>
        ) : stocks ? (
          <StocksList
            quotes={stocks.quotes}
            onOpen={(ticker) => {
              setSymbol(ticker);
              setOpen(true);
            }}
          />
        ) : isError ? (
          <Board>
            <EmptyState
              icon={<IoTrendingUpOutline />}
              title="Stocks didn't load"
              description="The add-on didn't answer. Try again in a moment."
            />
          </Board>
        ) : (
          <StocksSkeleton count={tickers.length} />
        )}
      </Flex>
      {/* Shut with the page's error: the cards it came from are gone. */}
      <StockDialog quote={quote} open={open && !failed} onClose={() => setOpen(false)} />
    </PageShell>
  );
}
