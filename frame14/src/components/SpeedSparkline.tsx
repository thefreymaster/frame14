import { Box } from "@chakra-ui/react";
import { TRACE_POINTS } from "../lib/speedTest";

/** The plot's own units: a transfer across, its fastest tick up. */
const VIEW_W = 1000;
const VIEW_H = 100;

/** Room above the fastest tick, so the line and its dot aren't cut by the top. */
const HEADROOM = 1.15;

/** The line and its wash: the logo's blue, at the step that reads on a card. */
const INK = "var(--chakra-colors-brand-fg)";

/**
 * One transfer of a speed test as a strip under its figure (SpeedReadout):
 * the speed at each tick, from nothing at the start, left to right across
 * the transfer's whole time — so while it runs the line grows toward the
 * right edge, a dot on its end, and a finished one spans the strip. No scale
 * or readout: the figure above is the result, and this is how steady the
 * link was on the way to it. An empty strip, just its baseline, before a
 * test. The SVG is stretched to the strip (non-scaling strokes); the dot is
 * HTML over it.
 */
export function SpeedSparkline({
  values,
  live = false,
  height,
}: {
  /** The speed at each tick so far, Mbps. */
  values: number[];
  /** The transfer is running: its end wears a dot. */
  live?: boolean;
  height: string | Record<string, string>;
}) {
  // Every transfer starts from nothing moved.
  const points = values.length > 0 ? [0, ...values] : [];
  const top = Math.max(...points, 0) * HEADROOM || 1;
  // A whole transfer's points across (lib/speedTest keeps a trace to them).
  const span = Math.max(TRACE_POINTS, points.length - 1);
  const xOf = (i: number) => (i / span) * VIEW_W;
  const yOf = (v: number) => VIEW_H - (v / top) * VIEW_H;

  const line = points
    .map((v, i) => `${i ? "L" : "M"}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`)
    .join("");
  const end = points.length - 1;

  return (
    <Box
      position="relative"
      height={height}
      borderBottomWidth="1px"
      borderColor="border"
      aria-hidden
      data-speed-trace={values.length}
    >
      {line && (
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
        >
          <path
            d={`${line}L${xOf(end).toFixed(1)},${VIEW_H}L0,${VIEW_H}Z`}
            fill={INK}
            fillOpacity={0.1}
          />
          <path
            d={line}
            fill="none"
            stroke={INK}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      {live && end > 0 && (
        <Box
          position="absolute"
          left={`${(xOf(end) / VIEW_W) * 100}%`}
          top={`${(yOf(points[end]) / VIEW_H) * 100}%`}
          boxSize="3"
          transform="translate(-50%, -50%)"
          borderRadius="full"
          bg="brand.fg"
          // A ring in the card's colour, so the dot stands off the line.
          borderWidth="2px"
          borderColor="bg.surface"
          data-speed-dot=""
        />
      )}
    </Box>
  );
}
