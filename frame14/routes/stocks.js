import { Router } from "express";

/**
 * The Stocks page's prices (0.179.0, stocks.js):
 *
 *   GET /api/stocks — { status, error, market, quotes }: the configured
 *                     tickers' prices from Finnhub, asked for first when
 *                     they're more than a minute old (waiting five seconds
 *                     at most). After that a page hears each change over the
 *                     socket (`stocks:watch`). 404 without a `finnhub_api_key`
 *                     and a ticker.
 *
 *   GET /api/stocks/:symbol — { symbol, pending, failed, company, metrics,
 *                     ratings, news }: one ticker's detail (0.180.0), for
 *                     the drawer its card opens — Finnhub's company profile,
 *                     key numbers, analysts' ratings and the week's news,
 *                     each null where it has none. The parts not yet held
 *                     are asked for first (five seconds at most): `pending`
 *                     names those still on their way, `failed` those Finnhub
 *                     didn't answer for. Asked of Finnhub only while a page
 *                     watches. 404 for a symbol that isn't one of the tickers.
 *
 * The tickers are the add-on's: a caller names none but one of them.
 */
const router = Router();

router.get("/", async (req, res) => {
  const { stocks } = req.app.locals;
  // Prices: never kept by anything in between.
  res.set("Cache-Control", "no-store");
  if (!stocks) {
    res.status(404).json({ error: "Stocks aren't set up: finnhub_api_key and stock_tickers" });
    return;
  }
  res.json(await stocks.ready());
});

router.get("/:symbol", async (req, res) => {
  const { stocks } = req.app.locals;
  res.set("Cache-Control", "no-store");
  if (!stocks) {
    res.status(404).json({ error: "Stocks aren't set up: finnhub_api_key and stock_tickers" });
    return;
  }
  const detail = await stocks.detail(req.params.symbol);
  if (!detail) {
    res.status(404).json({ error: "Not one of stock_tickers" });
    return;
  }
  res.json(detail);
});

export default router;
