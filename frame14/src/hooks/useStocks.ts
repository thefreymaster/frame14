import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { socket } from "../lib/socket";
import type { Stocks } from "../lib/stocks";
import { useFeatureData } from "./useFeatures";

async function fetchStocks(): Promise<Stocks> {
  const res = await fetch("/api/stocks");
  if (!res.ok) throw new Error(`Stocks fetch failed: ${res.status}`);
  return res.json() as Promise<Stocks>;
}

// The prices as they change (stocks.js, at most one push a second), to the
// pages that watch. The answer replaces the query's: it is the whole of it.
socket.on("stocks", (stocks: Stocks) => {
  queryClient.setQueryData<Stocks>(["stocks"], stocks);
});

// How many of this page's components watch: the server hears of the first
// and the last, as useEntity's subscribes are counted.
let watching = 0;

// A dropped socket's rooms are gone: watched again on every connect. A watch
// sent while down is sent once more as the socket comes back — the server
// counts a socket once.
socket.on("connect", () => {
  if (watching > 0) socket.emit("stocks:watch");
});

function watch() {
  watching += 1;
  if (watching === 1) socket.emit("stocks:watch");
}

function unwatch() {
  watching -= 1;
  if (watching === 0) socket.emit("stocks:unwatch");
}

/**
 * The configured tickers' prices (0.179.0), live while the caller is up:
 * GET /api/stocks first, then each change the server pushes. Asked only once
 * the config says Stocks is set up; never kept between launches — an old
 * session's price is worse than a placeholder.
 */
export function useStocks() {
  const { enabled, waiting } = useFeatureData("stocks");
  useEffect(() => {
    if (!enabled) return;
    watch();
    return unwatch;
  }, [enabled]);
  const query = useQuery({
    queryKey: ["stocks"],
    queryFn: fetchStocks,
    enabled,
  });
  return { ...query, waiting };
}
