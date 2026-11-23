import { useQuery } from "@tanstack/react-query";
import type { StockDetail } from "../lib/stocks";

async function fetchStockDetail(symbol: string): Promise<StockDetail> {
  const res = await fetch(`/api/stocks/${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`Stock detail fetch failed: ${res.status}`);
  return res.json() as Promise<StockDetail>;
}

/** While a part is on its way; and while the drawer stays open, for what the server has asked for again. */
const PENDING_MS = 1000;
const OPEN_MS = 60_000;

/**
 * One ticker's detail (0.180.0) — its company, key numbers, the analysts'
 * ratings and the news — for the drawer its card opens: mounted with the
 * drawer's contents and gone with them. The server keeps the answers (and
 * asks Finnhub only while a page is on Stocks), so every opening asks it
 * afresh: again each second while it says a part is still `pending`, each
 * minute after. Never kept between launches.
 */
export function useStockDetail(symbol: string) {
  return useQuery({
    queryKey: ["stock-detail", symbol],
    queryFn: () => fetchStockDetail(symbol),
    staleTime: 0,
    refetchInterval: (query) =>
      (query.state.data?.pending.length ?? 0) > 0 ? PENDING_MS : OPEN_MS,
  });
}
