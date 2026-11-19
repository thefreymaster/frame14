import { keyframes } from "@emotion/react";
import { Box, Icon } from "@chakra-ui/react";
import { usePlaybackRate } from "../hooks/usePlaybackRate";
import { flowPace } from "../lib/energy";

// The icon's own glow, crackling: it flares twice in quick succession and
// settles, then again, never evenly — a steady pulse reads as a lamp, not a
// current. Opacity alone; the blur it is drawn with never changes.
const crackle = keyframes`
  0%, 100% { opacity: 0.3; }
  4% { opacity: 0.95; }
  7% { opacity: 0.4; }
  11% { opacity: 1; }
  17% { opacity: 0.3; }
  54% { opacity: 0.3; }
  57% { opacity: 0.9; }
  61% { opacity: 0.3; }
`;

// A spark: nothing for most of its turn, then it jumps out from the icon,
// flickers twice and is gone. Opacity and transform alone.
const spark = keyframes`
  0% { opacity: 0; transform: translateY(0.1em) scale(0.6); }
  3% { opacity: 1; }
  7% { opacity: 0.3; }
  11% { opacity: 1; transform: translateY(0) scale(1); }
  16% { opacity: 0.85; }
  22% { opacity: 0; transform: translateY(-0.08em) scale(1.05); }
  100% { opacity: 0; transform: translateY(-0.08em) scale(1.05); }
`;

/** How far the icon's glow is feathered past its outline. */
const GLOW_BLUR = "0.16rem";

/** How long the glow takes to go through its flares at 1 kW, in seconds. */
const CRACKLE_SECONDS = 2.6;

/**
 * A spark's drawing: a little jagged arc, as a line with round joins in a
 * box of its own proportions. A mask, as a wire's wave is (PowerFlow): the
 * spark's colour is a token, which a picture can't read.
 */
const SPARK_PICTURE = (() => {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 14'><path d='M3 1.5L7.5 5.5L2.5 8L7 12.5' fill='none' stroke='black' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/></svg>";
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

/**
 * The sparks round the icon: which way each lies from its middle (in
 * degrees, clockwise from straight up), how long its turn is and where in it
 * it starts. Turns of different lengths, so the six never fall into step —
 * and enough of them that one is usually about.
 */
const SPARKS = [
  { at: -52, seconds: 1.9, from: 0 },
  { at: 48, seconds: 2.6, from: 1.2 },
  { at: 128, seconds: 2.2, from: 0.5 },
  { at: 222, seconds: 3.1, from: 2.1 },
  { at: 86, seconds: 2.9, from: 1.9 },
  { at: -98, seconds: 2.4, from: 1.4 },
];

/**
 * Electricity round the grid's icon (0.176.0, the user: "add electric
 * animation around the far right lightning bolt" — a bolt then, a pylon
 * since they asked for "high voltage power lines"): the icon once more
 * behind itself, feathered, its glow crackling, and six small sparks that
 * jump out from it in turn — each a jagged arc that flickers and is gone —
 * in the node's blue, the sparks a step of it that stands out, while power is
 * moving through the meter either way, which is when PowerFlow draws it.
 *
 * Over the icon's box (PowerFlow's `--flow-icon`), taking no room; the
 * sparks land in the node's circle round the icon. Under reduced motion the
 * glow is steady and there are no sparks.
 *
 * **It crackles as hard as the power through the meter** (the user: "Make
 * the solar and sparks animations also scale up and down with
 * production/consuption"): the glow and every spark at `flowPace` of the
 * grid's flow, in or out — their turns as written at 1 kW, the root of the
 * kilowatts either side, a spark now and then on a trickle and three times
 * as often at 9 kW. Gentler than the wire's pace: at eight times, the six
 * would be a strobe.
 */
export function GridSparks({
  icon,
  color,
  spark: sparkColor = color,
  watts,
}: {
  /** The node's icon, drawn again for its glow. */
  icon: React.ReactNode;
  /** The icon's colour, for its glow. */
  color: string;
  /** The sparks' colour, where it isn't the icon's: a step that stands out from the node's disc. */
  spark?: string | { base: string; _dark: string };
  /** The power through the meter, either way, which sets the pace. */
  watts: number;
}) {
  const paced = usePlaybackRate(flowPace(watts));
  return (
    <Box
      ref={paced}
      position="absolute"
      inset="0"
      fontSize="var(--flow-icon)"
      pointerEvents="none"
      aria-hidden
      data-flow-sparks=""
    >
      <Icon
        position="absolute"
        inset="0"
        boxSize="1em"
        color={color}
        filter={`blur(${GLOW_BLUR})`}
        animation={`${crackle} ${CRACKLE_SECONDS}s linear infinite`}
        _motionReduce={{ animation: "none", opacity: 0.5 }}
        data-flow-glow=""
      >
        {icon}
      </Icon>
      {SPARKS.map(({ at, seconds, from }) => (
        // Turned to where the spark lies; the spark jumps along its own axis.
        <Box
          key={at}
          position="absolute"
          inset="0"
          transform={`rotate(${at}deg)`}
        >
          <Box
            position="absolute"
            left="calc(50% - 0.15em)"
            top="-0.5em"
            width="0.3em"
            height="0.42em"
            bg={sparkColor}
            maskImage={SPARK_PICTURE}
            maskSize="100% 100%"
            maskRepeat="no-repeat"
            opacity="0"
            animation={`${spark} ${seconds}s linear ${-from}s infinite`}
            _motionReduce={{ display: "none" }}
            data-flow-spark=""
          />
        </Box>
      ))}
    </Box>
  );
}
