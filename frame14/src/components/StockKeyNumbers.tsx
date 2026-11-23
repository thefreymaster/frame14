import { Grid, Stack } from "@chakra-ui/react";
import { fmtEarnings, fmtRatio, fmtVolume, fmtYield, type StockMetrics } from "../lib/stocks";
import { StockDayRange } from "./StockDayRange";
import { StockStat } from "./StockStat";

/**
 * A ticker's key numbers, in its drawer (0.180.0): where today's price lies
 * in the year's range — the card's own range bar, a year long — then the
 * P/E, the earnings a share, the dividend's yield, the beta and the average
 * day's volume. Each only where Finnhub gives it: a company with no earnings
 * has no P/E, an ETF little but the range.
 */
export function StockKeyNumbers({ metrics, price }: { metrics: StockMetrics; price: number | null }) {
  const stats = [
    { name: "pe", label: "P/E", value: metrics.pe, text: fmtRatio },
    { name: "eps", label: "Earnings per share", value: metrics.eps, text: fmtEarnings },
    { name: "dividend-yield", label: "Dividend yield", value: metrics.dividendYield, text: fmtYield },
    { name: "beta", label: "Beta", value: metrics.beta, text: fmtRatio },
    { name: "average-volume", label: "Average volume", value: metrics.averageVolume, text: fmtVolume },
  ].filter((stat) => stat.value != null);
  const ranged = metrics.week52Low != null && metrics.week52High != null;
  return (
    <Stack gap="4" data-stock-key-numbers="">
      {ranged && (
        <StockDayRange
          low={metrics.week52Low}
          high={metrics.week52High}
          price={price}
          caption="52-week range"
          name="year"
        />
      )}
      {stats.length > 0 && (
        <Grid gap="4" css={{ gridTemplateColumns: "repeat(auto-fill, minmax(7.5rem, 1fr))" }}>
          {stats.map((stat) => (
            <StockStat key={stat.name} label={stat.label} value={stat.text(stat.value)} name={stat.name} />
          ))}
        </Grid>
      )}
    </Stack>
  );
}
