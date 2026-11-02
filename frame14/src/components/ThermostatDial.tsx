import { useEffect, useRef } from "react";
import { Box, type BoxProps } from "@chakra-ui/react";
import {
  arcPath,
  buildTicks,
  tFromPoint,
  tToValue,
  THERMOSTAT_SCALE,
  type ArcScale,
} from "../lib/thermostatArc";

type ArcControl = {
  /** The slider's accessible name: "Target temperature", "Fan speed". */
  label: string;
  onChange: (value: number) => void;
  /** Fires once, on release — a drag sends one service call. */
  onCommit: (value: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
};

/**
 * The thermostat face: a black disc with a ring in the mode's colour, a
 * 120° tick arc marking the value, and whatever readout is passed as
 * children. The ring breathes while the system is actively running.
 *
 * This is the one control left hand-drawn: no library slider is an arc. The
 * arc is the thermostat's 60–85° unless a `scale` says otherwise (FanControls
 * puts a fan's 0–100% on it). Pass `control` and the arc becomes draggable —
 * tap or drag anywhere along it, committing on pointerup. `footer` sits along
 * the bottom of the face, under the readout, where the arc leaves the disc
 * empty (the −/+ buttons).
 */
export function ThermostatDial({
  ring,
  accent,
  live = false,
  value,
  scale = THERMOSTAT_SCALE,
  control,
  footer,
  children,
  ...rest
}: {
  /** CSS colour of the ring. */
  ring: string;
  /** CSS colour of the marked tick and the live pulse. */
  accent: string;
  live?: boolean;
  /** The value to mark on the arc — a target temperature, a fan's speed; no arc when null. */
  value: number | null;
  /** The arc's range and steps; the thermostat's by default. */
  scale?: ArcScale;
  control?: ArcControl;
  footer?: React.ReactNode;
  children: React.ReactNode;
} & Omit<BoxProps, "children">) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);
  const currentValueRef = useRef(value);
  useEffect(() => {
    currentValueRef.current = value;
  }, [value]);

  function updateFromEvent(e: React.PointerEvent<SVGElement>) {
    const svg = svgRef.current;
    if (!svg || !control) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const px = ((e.clientX - rect.left) * 100) / rect.width;
    const py = ((e.clientY - rect.top) * 100) / rect.height;
    const next = tToValue(tFromPoint(px, py), scale);
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

  const ticks = value != null ? buildTicks(value, scale) : null;

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
        boxShadow={`inset 0 0 0 0.25rem ${ring}`}
        transition="box-shadow 400ms ease"
      >
        {live && (
          <Box
            position="absolute"
            inset="0"
            borderRadius="full"
            pointerEvents="none"
            boxShadow={`inset 0 0 0 0.25rem ${accent}`}
            animation="pulse 2.6s ease-in-out infinite"
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
        {footer && (
          <Box
            position="absolute"
            insetX="0"
            bottom="8%"
            zIndex={1}
            display="flex"
            justifyContent="center"
          >
            {footer}
          </Box>
        )}
      </Box>

      {ticks && (
        <Box position="absolute" inset="0" zIndex={2} pointerEvents="none">
          <svg
            ref={svgRef}
            // Its drag is its own, not the sheet's (Modal's swipe to close).
            data-swipe-ignore
            viewBox="0 0 100 100"
            width="100%"
            height="100%"
            style={{ touchAction: "none", overflow: "visible" }}
          >
            {ticks.map((tick) => (
              <line
                key={tick.value}
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
                aria-label={control.label}
                aria-valuemin={scale.min}
                aria-valuemax={scale.max}
                aria-valuenow={value ?? undefined}
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
