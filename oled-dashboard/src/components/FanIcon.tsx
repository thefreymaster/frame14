import { Box } from "@chakra-ui/react";
import { PiFanFill } from "react-icons/pi";

function spinDuration(percentage: number | null): string {
  const pct = Math.max(25, Math.min(100, percentage ?? 100));
  // 100% → 3.0s/rev, 25% → 8.25s/rev
  const seconds = 9.0 - (pct / 100) * 6.0;
  return `${seconds.toFixed(2)}s`;
}

/**
 * The fan glyph, spinning at the fan's pace while it runs: the Fans card's
 * title, each tile's and the dial's status line.
 */
export function FanIcon({
  on,
  percentage,
  size,
  color,
}: {
  on: boolean;
  percentage: number | null;
  size: string;
  color: string;
}) {
  return (
    <Box
      fontSize={size}
      color={color}
      lineHeight="1"
      display="inline-flex"
      animation={
        on ? `fan-spin ${spinDuration(percentage)} linear infinite` : undefined
      }
    >
      <PiFanFill />
    </Box>
  );
}
