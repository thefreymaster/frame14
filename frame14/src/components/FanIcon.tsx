import { Box } from "@chakra-ui/react";
import { PiFanFill } from "react-icons/pi";
import { FanWind } from "./FanWind";

/** Seconds a turn: 100% → 3.0, 25% → 7.5. */
function spinSeconds(percentage: number | null): number {
  const pct = Math.max(25, Math.min(100, percentage ?? 100));
  return 9.0 - (pct / 100) * 6.0;
}

/** A gust of the fan's wind leaves the blades in the time of this much of a turn. */
const GUST_OF_A_TURN = 0.6;

/**
 * The fan glyph, spinning at the fan's pace while it runs: the Fans card's
 * title, each tile's and the dial's status line, and a thermostat's in Fan
 * mode (its tile and its dialog's readout). Chakra's own `spin` keyframes
 * (0.157.0: the `fan-spin` this named went with the custom theme in 0.50.0,
 * and nothing spun since); still under reduced motion.
 *
 * While it spins it blows (0.173.0, FanWind): feathered trails of air swept
 * round the blades and thrown outwards, faster for a faster fan. The wind
 * is no child of the spinning box — it turns at its own pace — and lies
 * over the glyph's box, so the icon is the size it was.
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
  const seconds = spinSeconds(percentage);
  return (
    <Box
      position="relative"
      display="inline-flex"
      fontSize={size}
      color={color}
      lineHeight="1"
    >
      {on && <FanWind seconds={seconds * GUST_OF_A_TURN} />}
      <Box
        position="relative"
        display="inline-flex"
        animation={
          on ? `spin ${seconds.toFixed(2)}s linear infinite` : undefined
        }
        _motionReduce={{ animation: "none" }}
        data-fan-icon=""
        data-spinning={on ? "" : undefined}
      >
        <PiFanFill />
      </Box>
    </Box>
  );
}
