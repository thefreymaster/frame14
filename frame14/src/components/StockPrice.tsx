import { useState } from "react";
import { keyframes } from "@emotion/react";
import { Box, Text } from "@chakra-ui/react";
import { fmtPrice, priceMove } from "../lib/stocks";

// A new price lights up behind itself and fades: opacity alone, so the
// browser composites it and lays nothing out.
const fade = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

/** How long a price's light takes to fade. */
export const FLASH_MS = 900;

/**
 * A ticker's price (0.179.0), large, in plain tabular figures — not a
 * NumberFlow: during the session it changes every second or so and would
 * never be at rest (SpeedReadout's reason). It flashes when the price shown
 * changes — green up, red down, against the last one shown — and not when a
 * push brings the same price again; never under reduced motion.
 */
export function StockPrice({
  price,
  textStyle,
}: {
  price: number | null;
  textStyle: React.ComponentProps<typeof Text>["textStyle"];
}) {
  // The price as last drawn, which way it went and how many times: the
  // flash is keyed by the count, so each move plays it from the start.
  const [shown, setShown] = useState({
    price,
    move: null as "up" | "down" | null,
    count: 0,
  });
  if (price !== shown.price) {
    setShown({
      price,
      move: priceMove(shown.price, price),
      count: shown.count + 1,
    });
  }
  return (
    <Box
      position="relative"
      alignSelf="start"
      data-stock-price=""
      data-flash-count={shown.count}
    >
      {shown.move && (
        <Box
          key={shown.count}
          position="absolute"
          top="0"
          bottom="0"
          left="-2"
          right="-2"
          rounded="sm"
          bg={shown.move === "up" ? "green.subtle" : "red.subtle"}
          animation={`${fade} ${FLASH_MS}ms ease-out forwards`}
          _motionReduce={{ display: "none" }}
          pointerEvents="none"
          aria-hidden
          data-price-flash={shown.move}
        />
      )}
      <Text
        position="relative"
        textStyle={textStyle}
        fontWeight="semibold"
        lineHeight="1.1"
        fontVariantNumeric="tabular-nums"
        color={price == null ? "fg.subtle" : undefined}
      >
        {fmtPrice(price)}
      </Text>
    </Box>
  );
}
