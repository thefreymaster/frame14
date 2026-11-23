import { IoBusinessOutline, IoNewspaperOutline, IoPeopleOutline, IoStatsChartOutline } from "react-icons/io5";
import { useStockDetail } from "../hooks/useStockDetail";
import { partState, type StockQuote } from "../lib/stocks";
import { StockCard } from "./StockCard";
import { StockCompany } from "./StockCompany";
import { StockDetailSection } from "./StockDetailSection";
import { StockKeyNumbers } from "./StockKeyNumbers";
import { StockNews } from "./StockNews";
import { StockRatings } from "./StockRatings";

/**
 * What a ticker's drawer holds (0.180.0, StockDialog), each a section of the
 * panel: Today — the card itself, still live —, then the company, the key
 * numbers, the analysts' ratings and the news, as Finnhub has them
 * (useStockDetail). Mounted with the open drawer and gone with it, so the
 * asking stops when it closes.
 */
export function StockDetailPanels({ quote }: { quote: StockQuote }) {
  const { data: detail, isError } = useStockDetail(quote.symbol);
  // Before the first answer the parts are on their way — or, the asking
  // having failed, not answered for.
  const asking = isError ? "failed" : "pending";
  return (
    <>
      <StockCard quote={quote} heading="Today" />
      <StockDetailSection
        part="company"
        title="Company"
        icon={<IoBusinessOutline />}
        state={partState(detail, "company", asking)}
      >
        {detail?.company && <StockCompany company={detail.company} />}
      </StockDetailSection>
      <StockDetailSection
        part="metrics"
        title="Key numbers"
        icon={<IoStatsChartOutline />}
        state={partState(detail, "metrics", asking)}
      >
        {detail?.metrics && <StockKeyNumbers metrics={detail.metrics} price={quote.price} />}
      </StockDetailSection>
      <StockDetailSection
        part="ratings"
        title="Analyst ratings"
        icon={<IoPeopleOutline />}
        state={partState(detail, "ratings", asking)}
      >
        {detail?.ratings && <StockRatings ratings={detail.ratings} />}
      </StockDetailSection>
      <StockDetailSection
        part="news"
        title="News"
        icon={<IoNewspaperOutline />}
        state={partState(detail, "news", asking)}
      >
        {detail?.news && <StockNews news={detail.news} />}
      </StockDetailSection>
    </>
  );
}
