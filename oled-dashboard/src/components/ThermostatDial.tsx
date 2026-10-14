import { useEffect, useRef } from "react";
import { Box, type BoxProps } from "@chakra-ui/react";
import { arcPath, buildTicks, tFromPoint, tToTemp } from "../lib/thermostatArc";

type ArcControl = {
  min: number;
  max: number;
  onChange: (temp: number) => void;
  /** Fires once, on release — a drag sends one set_temperature. */
  onCommit: (temp: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
};

/**
 * The thermostat face: a black disc with a ring in the mode's colour, a
 * 120° tick arc marking the target, and whatever readout is passed as
 * children. The ring breathes while the system is actively running.
 *
 * This is the one control left hand-drawn: no library slider is an arc. Pass
 * `control` and the arc becomes draggable — tap or drag anywhere along it,
 * committing on pointerup.
 */
export function ThermostatDial({
  ring,
  accent,
  live = false,
  target,
  control,
  children,
  ...rest
}: {
  /** CSS colour of the ring. */
  ring: string;
  /** CSS colour of the target tick and the live pulse. */
  accent: string;
  live?: boolean;
  /** Target temperature to mark on the arc; no arc when null. */
  target: number | null;
  control?: ArcControl;
  children: React.ReactNode;
} & Omit<BoxProps, "children">) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);
  const currentValueRef = useRef(target);
  useEffect(() => {
    currentValueRef.current = target;
  }, [target]);

  function updateFromEvent(e: React.PointerEvent<SVGElement>) {
    const svg = svgRef.current;
    if (!svg || !control) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const px = ((e.clientX - rect.left) * 100) / rect.width;
    const py = ((e.clientY - rect.top) * 100) / rect.height;
    const next = Math.max(
      control.min,
      Math.min(control.max, tToTemp(tFromPoint(px, py))),
    );
    if (next !== currentValueRef.current) {
      currentValueRef.current = next;
      control.onChange(next);
    }
  }

  function handlePointerDown(e: React.PointerEvent<SVGElement>) {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    draggingRef.current = true;
    control?.onDragStart();
    updateFromEvent(e);
  }

  function handlePointerMove(e: React.PointerEvent<SVGElement>) {
    if (draggingRef.current) updateFromEvent(e);
  }

  function handlePointerEnd(e: React.PointerEvent<SVGElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    control?.onDragEnd();
    if (currentValueRef.current != null)
      control?.onCommit(currentValueRef.current);
  }

  const ticks = target != null ? buildTicks(target) : null;

  return (
    <Box position="relative" aspectRatio="1" {...rest}>
      <Box
        position="relative"
        width="100%"
        height="100%"
        borderRadius="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        overflow="hidden"
        bg="bg"
        boxShadow={`inset 0 0 0 0.4vmin ${ring}`}
        transition="box-shadow 400ms ease"
      >
        {live && (
          <Box
            position="absolute"
            inset="0"
            borderRadius="full"
            pointerEvents="none"
            boxShadow={`inset 0 0 0 0.4vmin ${accent}`}
            animation="ring-pulse 2.6s ease-in-out infinite"
          />
        )}
        <Box
          position="relative"
          zIndex={1}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
        >
          {children}
        </Box>
      </Box>

      {ticks && (
        <Box position="absolute" inset="0" zIndex={2} pointerEvents="none">
          <svg
            ref={svgRef}
            viewBox="0 0 100 100"
            width="100%"
            height="100%"
            style={{ touchAction: "none", overflow: "visible" }}
          >
            {ticks.map((tick) => (
              <line
                key={tick.temp}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke={tick.active ? accent : ring}
                strokeWidth={tick.active ? 1.4 : 0.7}
                strokeLinecap="round"
                opacity={tick.active ? 1 : 0.55}
                pointerEvents="none"
                style={
                  tick.active
                    ? { filter: `drop-shadow(0 0 1.5px ${accent})` }
                    : undefined
                }
              />
            ))}
            {control && (
              <path
                d={arcPath(0, 1)}
                stroke="rgba(0,0,0,0.001)"
                strokeWidth="14"
                strokeLinecap="round"
                fill="none"
                role="slider"
                aria-label="Target temperature"
                aria-valuemin={control.min}
                aria-valuemax={control.max}
                aria-valuenow={target ?? undefined}
                tabIndex={0}
                style={{ pointerEvents: "stroke", cursor: "pointer" }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
              />
            )}
          </svg>
        </Box>
      )}
    </Box>
  );
}
