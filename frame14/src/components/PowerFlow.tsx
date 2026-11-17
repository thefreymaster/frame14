import { useEffect, useRef } from "react";
import { keyframes } from "@emotion/react";
import { Box, Center, Grid, Icon, Text, chakra } from "@chakra-ui/react";
import { IoFlash } from "react-icons/io5";
import { PiSolarRoof } from "react-icons/pi";
import type { HomeEnergy } from "../hooks/useHomeData";
import {
  ENERGY_COLORS,
  ENERGY_VARS,
  FLOW_BASE_SECONDS,
  GRID_ACTIVE_THRESHOLD,
  coverage,
  fmtW,
  grid,
  wirePace,
} from "../lib/energy";
import { HomeIcon } from "../lib/navItems";

/** The nodes' edge: a 2px border, the home ring's stroke (Ring) and a wire's line. */
const EDGE = 2;

/**
 * A wire's waves: one swing up and one down in WAVE_LENGTH, WAVE_HEIGHT from
 * crest to trough with the line's own width. In rem, so the wave keeps its
 * size beside the nodes on the frame's larger type; the line is EDGE wide at
 * any size, as the nodes' borders are. **Tall and long enough to read as
 * waves** (0.173.1, the user, of a wave half as high and three fifths as
 * long: "Maybe make the waves taller. It feels like DNA double helix at the
 * current height"): well over half a node's height, and long for it, so two
 * mirrored lines swing apart as waves do instead of winding round each other.
 */
const WAVE = { length: 2.5, height: 1.5 };
const WAVE_LENGTH = `${WAVE.length}rem`;
const WAVE_HEIGHT = `${WAVE.height}rem`;

/**
 * One wave's length of the wire as a picture, to be repeated along it: a
 * sine drawn in a box of the wave's own proportions (its size at a 16px
 * root), stretched to WAVE_LENGTH by WAVE_HEIGHT with its line left EDGE
 * wide (`non-scaling-stroke`), a crest's line just inside the box's edge.
 * **Two waves, one the other turned over** (the user, of the first
 * drawing's one: "Doesn't AC have two waves?"): a North American house is
 * fed by two legs half a turn apart, each the other's mirror, and so is
 * drawn — the second at LEG_FAINT of the first's strength, so the pair
 * reads as a wave and its mirror rather than a chain of loops. They run on
 * a little past both ends of their box, so one copy meets the next with no
 * seam. A mask, not a background: the wire's colour is a token, which a
 * picture can't read.
 */
const LEG_FAINT = 0.35;
const WAVE_PICTURE = (() => {
  const [length, height] = [WAVE.length * 16, WAVE.height * 16];
  // Half the line's width, and half a pixel for its soft edge.
  const swing = height / 2 - EDGE / 2 - 0.5;
  const leg = (turn: 1 | -1) => {
    const points: string[] = [];
    for (let x = -4; x <= length + 4; x += 0.5) {
      const y = height / 2 - turn * swing * Math.sin((2 * Math.PI * x) / length);
      points.push(`${x} ${Math.round(y * 100) / 100}`);
    }
    return `M${points.join("L")}`;
  };
  const line = `fill='none' stroke='black' stroke-width='${EDGE}' stroke-linejoin='round' vector-effect='non-scaling-stroke'`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${length} ${height}' preserveAspectRatio='none'><path d='${leg(-1)}' ${line} stroke-opacity='${LEG_FAINT}'/><path d='${leg(1)}' ${line}/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

// The wave travels by its own length and starts again where it began, so
// the loop shows no join. A transform alone: the compositor moves a strip
// drawn once, where the dots it replaced were repainted every frame.
const waveRight = keyframes`
  from { transform: translateX(-${WAVE_LENGTH}); }
  to { transform: translateX(0); }
`;
const waveLeft = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-${WAVE_LENGTH}); }
`;

type FlowSize = "sm" | "md";


/**
 * The diagram at the dialog's size (`md`) and the energy card's (`sm`), the
 * same drawing with smaller nodes, figures and words.
 */
const SIZES = {
  md: {
    node: "14",
    icon: "6",
    gap: { base: "1.5", md: "3" },
    value: { base: "lg", md: "xl" },
    valueTop: "2",
    label: "sm",
  },
  sm: {
    node: "10",
    icon: "5",
    gap: "1.5",
    value: "sm",
    valueTop: "0.5",
    label: "xs",
  },
} as const;

/**
 * Where the power is going now, as the house wires it: the panels feed the
 * house, and what it doesn't use goes out through the meter, or the grid
 * makes up what the panels can't. Solar → Home → Grid when exporting,
 * Solar → Home ← Grid when importing. A line with power on it is a pair of
 * waves — alternating current, drawn as the sines it is, the house's two
 * legs (0.173.0, the user: "Make the dotted lines between production house
 * and usage be AC waves. Maintain flow direction and speed of consumption",
 * then "Doesn't AC have two waves?"; dots until then) — travelling the way
 * the power flows, in the flow's colour, at a pace set by the power
 * on it (`wirePace`: the solar wire by what the panels make, the grid wire by
 * the net flow); an idle line is a hairline.
 * The house's edge is a ring of today's coverage (`coverage`, the card's big
 * figure): how much of the day's use the solar has made, in solar yellow from
 * the top clockwise over the edge's grey. Past 100% it goes round again in
 * green over the yellow, as the figure turns green — 150% is a full yellow
 * ring with a green half over it, 200% all green.
 */
export function PowerFlow({
  energy,
  size = "md",
}: {
  energy: HomeEnergy;
  size?: FlowSize;
}) {
  const { abs, exporting, active } = grid(energy);
  const producing = energy.currentProduction > GRID_ACTIVE_THRESHOLD;
  const gridColor = !active ? null : exporting ? "export" : "import";
  const s = SIZES[size];

  return (
    <Grid
      templateColumns="auto minmax(1rem, 1fr) auto minmax(1rem, 1fr) auto"
      columnGap={s.gap}
      rowGap="1"
      alignItems="center"
      justifyItems="center"
    >
      <Node icon={<PiSolarRoof />} color={producing ? "solar" : null} size={size} />
      <Wire
        color={producing ? "solar" : null}
        direction="right"
        watts={energy.currentProduction}
      />
      <Node
        // The nav's own house (lib/navItems).
        icon={<HomeIcon />}
        color="home"
        size={size}
        ring={coverage(energy)}
      />
      <Wire
        color={gridColor}
        direction={exporting ? "right" : "left"}
        watts={abs}
      />
      <Node icon={<IoFlash />} color={gridColor} size={size} />

      <Value size={size}>{fmtW(energy.currentProduction)}</Value>
      <span />
      <Value size={size}>{fmtW(energy.currentConsumption)}</Value>
      <span />
      <Value size={size}>{active ? fmtW(abs) : "—"}</Value>

      <Label size={size}>Solar</Label>
      <span />
      <Label size={size}>Home</Label>
      <span />
      <Label size={size}>
        {active ? (exporting ? "To grid" : "From grid") : "Grid idle"}
      </Label>
    </Grid>
  );
}

type Flow = keyof typeof ENERGY_COLORS;

function Node({
  icon,
  color,
  size,
  ring,
}: {
  icon: React.ReactNode;
  color: Flow | null;
  size: FlowSize;
  /** A percentage drawn round the edge in place of the border (Ring). */
  ring?: number;
}) {
  const c = color ? ENERGY_COLORS[color] : "border";
  return (
    <Center
      position="relative"
      boxSize={SIZES[size].node}
      rounded="full"
      borderWidth={ring == null ? `${EDGE}px` : "0"}
      borderColor={c}
      bg={color ? `${c}/12` : undefined}
      data-flow-node={ring == null ? "" : "ring"}
    >
      {ring != null && <Ring pct={ring} track={color ?? "home"} />}
      <Icon boxSize={SIZES[size].icon} color={color ? c : "fg.subtle"}>
        {icon}
      </Icon>
    </Center>
  );
}

/**
 * A node's edge as a ring of a percentage: the track in the node's colour,
 * over it the first hundred in solar yellow from twelve o'clock clockwise,
 * and over that the second hundred in green (past 200 it stays all green).
 * Each lap moves as the figure does.
 *
 * **As thick as the other nodes' borders, and where a border would be**
 * (0.173.0, the user, of the home node: "The center circle border is too
 * thick. Make it match the other two for generation and grid" — it was a
 * stroke of 3 or 4 in a drawing that grew with the type, 5px on the frame
 * beside their 2). So the drawing has no scale of its own: no viewBox, the
 * circles sized in percentages of the box, and the stroke is EDGE in real
 * pixels at any type size. A stroke lies half either side of its circle,
 * so the box is the node's less half an edge all round and the circle
 * fills it: the ring's outside is the node's own edge, as a border's is.
 * The whole drawing is turned a quarter back, so the arcs start at the top.
 */
function Ring({ pct, track }: { pct: number; track: Flow }) {
  const whole = Math.round(Math.max(0, pct));
  const lap = (n: number) => Math.min(100, Math.max(0, whole - n * 100));
  return (
    // Plain SVG children: Chakra would read the strokes as CSS. The arcs'
    // offsets are inline, so their transition lives up here.
    <chakra.svg
      position="absolute"
      inset={`${EDGE / 2}px`}
      width={`calc(100% - ${EDGE}px)`}
      height={`calc(100% - ${EDGE}px)`}
      overflow="visible"
      transform="rotate(-90deg)"
      role="img"
      aria-label={`Solar covered ${whole}% of today's use`}
      css={{ "& circle": { transition: "stroke-dashoffset 0.6s ease" } }}
      _motionReduce={{ "& circle": { transition: "none" } }}
      data-flow-ring=""
    >
      <circle
        cx="50%"
        cy="50%"
        r="50%"
        fill="none"
        stroke={ENERGY_VARS[track]}
        strokeWidth={EDGE}
      />
      {(["solar", "export"] as const).map((color, i) => {
        const length = lap(i);
        return (
          <circle
            key={color}
            cx="50%"
            cy="50%"
            r="50%"
            fill="none"
            stroke={ENERGY_VARS[color]}
            strokeWidth={EDGE}
            // Round ends, except that a zero-length dash with them is a dot.
            strokeLinecap={length > 0 ? "round" : "butt"}
            pathLength={100}
            strokeDasharray="100 100"
            style={{ strokeDashoffset: 100 - length }}
          />
        );
      })}
    </chakra.svg>
  );
}

/**
 * A line between two nodes: a hairline with no power on it, else a wave
 * travelling in `direction` at the pace of `watts` (wirePace). The wave is
 * a strip a wave's length longer than the wire, in the flow's colour and
 * masked to the sines (WAVE_PICTURE), slid along by that length inside a box that
 * clips it. The pace is the running CSS animation's playback rate, set
 * through getAnimations: a change of animation-duration keeps the start time
 * and so jumps the wave to another phase at every reading, where a rate
 * change carries on from where it is. Under reduced motion there is no
 * animation to pace: the wave stands.
 */
function Wire({
  color,
  direction,
  watts,
}: {
  color: Flow | null;
  direction: "left" | "right";
  watts: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pace = wirePace(watts);
  // A new direction is another keyframe name, and a colour after none the
  // wave in place of the hairline: both start a fresh animation at the base
  // rate, so each is a dependency.
  useEffect(() => {
    ref.current?.getAnimations().forEach((animation) => {
      animation.playbackRate = pace;
    });
  }, [pace, direction, color]);

  if (!color) {
    return (
      <Box
        alignSelf="center"
        width="100%"
        height="1px"
        bg="border"
        aria-hidden
        data-flow-wire="idle"
      />
    );
  }
  return (
    <Box
      width="100%"
      height={WAVE_HEIGHT}
      overflow="hidden"
      aria-hidden
      data-flow-wire={direction}
    >
      <Box
        ref={ref}
        width={`calc(100% + ${WAVE_LENGTH})`}
        height="100%"
        bg={ENERGY_COLORS[color]}
        maskImage={WAVE_PICTURE}
        maskSize={`${WAVE_LENGTH} 100%`}
        maskRepeat="repeat-x"
        animation={`${direction === "right" ? waveRight : waveLeft} ${FLOW_BASE_SECONDS}s linear infinite`}
        _motionReduce={{ animation: "none" }}
        data-flow-wave=""
      />
    </Box>
  );
}

function Value({
  children,
  size,
}: {
  children: React.ReactNode;
  size: FlowSize;
}) {
  return (
    <Text
      textStyle={SIZES[size].value}
      fontWeight="semibold"
      whiteSpace="nowrap"
      mt={SIZES[size].valueTop}
    >
      {children}
    </Text>
  );
}

function Label({
  children,
  size,
}: {
  children: React.ReactNode;
  size: FlowSize;
}) {
  return (
    <Text textStyle={SIZES[size].label} color="fg.muted" whiteSpace="nowrap">
      {children}
    </Text>
  );
}
