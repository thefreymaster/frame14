import { Badge, HStack } from "@chakra-ui/react";
import { sessionLabel, type Stocks } from "../lib/stocks";

/**
 * The Stocks page's header (0.179.0): the US market's session — Market open,
 * Pre-market, After hours, Closed — once Finnhub has said it, and "Delayed"
 * beside it while the prices come from polling rather than its trades socket.
 */
export function MarketSessionBadge({ stocks }: { stocks: Stocks }) {
  const known = stocks.market.isOpen != null || stocks.market.session != null;
  const session = sessionLabel(stocks.market);
  return (
    <HStack gap="2">
      {stocks.status === "delayed" && (
        <Badge colorPalette="orange" data-stocks-delayed="">
          Delayed
        </Badge>
      )}
      {known && (
        <Badge colorPalette={session.palette} data-market-session={session.session}>
          {session.label}
        </Badge>
      )}
    </HStack>
  );
}
