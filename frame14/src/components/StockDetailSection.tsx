import { Box, Skeleton, Stack, Text } from "@chakra-ui/react";
import type { DetailPart, PartState } from "../lib/stocks";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";

/**
 * One part of a ticker's drawer (0.180.0) as a section — a Board, so in the
 * drawer's panel a title over a well — by what the part is:
 *
 *   - there: its contents;
 *   - on its way (a first opening asks Finnhub, a call every 1.2 s): bars in
 *     their place, so the sheet is its height before the answer;
 *   - not answered for: a line saying so, and when it is asked again;
 *   - nothing — Finnhub has none of it, an ETF's company: no section at all.
 */
export function StockDetailSection({
  part,
  title,
  icon,
  state,
  children,
}: {
  part: DetailPart;
  title: string;
  icon: React.ReactNode;
  state: PartState;
  children: React.ReactNode;
}) {
  if (state === "none") return null;
  return (
    <Board title={<SectionTitle icon={icon}>{title}</SectionTitle>}>
      <Box data-stock-part={part} data-part-state={state} aria-busy={state === "pending" || undefined}>
        {state === "ready" ? (
          children
        ) : state === "pending" ? (
          <Stack gap="2.5" aria-hidden="true">
            <Skeleton height="4" width="60%" />
            <Skeleton height="4" width="85%" />
            <Skeleton height="4" width="45%" />
          </Stack>
        ) : (
          <Text textStyle="sm" color="fg.muted">
            Finnhub didn&rsquo;t answer for this. It&rsquo;s asked again in a minute.
          </Text>
        )}
      </Box>
    </Board>
  );
}
