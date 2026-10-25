import { keyframes } from "@emotion/react";
import { Box, Center, Grid, Icon, Text, chakra } from "@chakra-ui/react";
import { IoFlash, IoHome } from "react-icons/io5";
import { PiSolarRoof } from "react-icons/pi";
import type { HomeEnergy } from "../hooks/useHomeData";
import {
  ENERGY_COLORS,
  ENERGY_VARS,
  GRID_ACTIVE_THRESHOLD,
  coverage,
  fmtW,
  grid,
} from "../lib/energy";

/** One dot spacing, so a loop of the animation looks continuous. */
const DOT_PITCH = 12;

const flowRight = keyframes`
  from { background-position-x: 0; }
  to { background-position-x: ${DOT_PITCH}px; }
`;
const flowLeft = keyframes`
  from { background-position-x: ${DOT_PITCH}px; }
  to { background-position-x: 0; }
`;

type FlowSize = "sm" | "md";

/** The nodes' edge: a 2px border, and the home ring's stroke, the same. */
const EDGE = 2;

/**
 * The diagram at the dialog's size (`md`) and the energy card's (`sm`), the
 * same drawing with smaller nodes, figures and words. `px` is the node's
 * size in pixels (at the 16px root), the ring's drawing space.
 */
const SIZES = {
  md: {
    node: "14",
    px: 56,
    icon: "6",
    gap: { base: "1.5", md: "3" },
    value: { base: "lg", md: "xl" },
    valueTop: "2",
    label: "sm",
  },
  sm: {
    node: "10",
    px: 40,
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
 * Solar → Home ← Grid when importing. A line with power on it carries dots
 * moving the way it flows, in the flow's colour; an idle line is a hairline.
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
      <Wire color={producing ? "solar" : null} direction="right" />
      <Node
        icon={<IoHome />}
        color="home"
        size={size}
        ring={coverage(energy)}
      />
      <Wire color={gridColor} direction={exporting ? "right" : "left"} />
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
    >
      {ring != null && (
        <Ring pct={ring} track={color ?? "home"} size={size} />
      )}
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
 * Each lap moves as the figure does. Drawn in the node's pixel space, so
 * the stroke is the border's 2px.
 */
function Ring({
  pct,
  track,
  size,
}: {
  pct: number;
  track: Flow;
  size: FlowSize;
}) {
  const px = SIZES[size].px;
  const mid = px / 2;
  const r = mid - EDGE / 2;
  const whole = Math.round(Math.max(0, pct));
  const lap = (n: number) => Math.min(100, Math.max(0, whole - n * 100));
  return (
    // Plain SVG children: Chakra would read `transform` and the strokes as
    // CSS. The arcs' offsets are inline, so their transition lives up here.
    <chakra.svg
      position="absolute"
      inset="0"
      width="100%"
      height="100%"
      viewBox={`0 0 ${px} ${px}`}
      role="img"
      aria-label={`Solar covered ${whole}% of today's use`}
      css={{ "& circle": { transition: "stroke-dashoffset 0.6s ease" } }}
      _motionReduce={{ "& circle": { transition: "none" } }}
    >
      <circle
        cx={mid}
        cy={mid}
        r={r}
        fill="none"
        stroke={ENERGY_VARS[track]}
        strokeWidth={EDGE}
      />
      <g transform={`rotate(-90 ${mid} ${mid})`}>
        {(["solar", "export"] as const).map((color, i) => {
          const length = lap(i);
          return (
            <circle
              key={color}
              cx={mid}
              cy={mid}
              r={r}
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
      </g>
    </chakra.svg>
  );
}

function Wire({
  color,
  direction,
}: {
  color: Flow | null;
  direction: "left" | "right";
}) {
  if (!color) {
    return (
      <Box
        alignSelf="center"
        width="100%"
        height="1px"
        bg="border"
        aria-hidden
      />
    );
  }
  return (
    <Box
      width="100%"
      height="1.5"
      aria-hidden
      backgroundImage={`radial-gradient(circle, ${ENERGY_VARS[color]} 0 2.5px, transparent 3px)`}
      backgroundSize={`${DOT_PITCH}px 100%`}
      backgroundRepeat="repeat-x"
      animation={`${direction === "right" ? flowRight : flowLeft} 0.6s linear infinite`}
      _motionReduce={{ animation: "none" }}
    />
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
