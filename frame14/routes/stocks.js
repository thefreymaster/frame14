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
 * The tickers are the add-on's: a caller names none.
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

export default router;
