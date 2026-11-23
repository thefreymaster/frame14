import { BoardFrame } from "../lib/boardFrame";
import type { StockQuote } from "../lib/stocks";
import { PanelDialog } from "./PanelDialog";
import { StockDetailPanels } from "./StockDetailPanels";

/**
 * A ticker's detail (0.180.0, the user: "when you click one of the cards, a
 * drawer comes out from the right on desktop or bottom for mobile and
 * frame14, and it will have more detailed info on the stock"): PanelDialog —
 * the Weather and Energy drawers' shell — titled with the ticker, holding
 * StockDetailPanels, each Board there a section of the panel (lib/boardFrame's
 * `"panel"`).
 *
 * The caller keeps the last ticker's quote while it closes, so the closing
 * drawer still has something to draw; its contents unmount once it has
 * (PanelDialog), and the asking with them.
 *
 * No chart of the day: Finnhub's price history is a paid plan's, and the
 * user passed on drawing one from anything else.
 */
export function StockDialog({
  quote,
  open,
  onClose,
}: {
  quote: StockQuote | null;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <PanelDialog open={open && quote != null} onClose={onClose} title={quote?.symbol ?? ""}>
      {quote && (
        <BoardFrame.Provider value="panel">
          <StockDetailPanels quote={quote} />
        </BoardFrame.Provider>
      )}
    </PanelDialog>
  );
}
