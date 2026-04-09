import { useEffect, useRef } from "react";
import { Box } from "@chakra-ui/react";

// ── Analog Clock ──────────────────────────────────────────────────────────────

const CX = 100;
const CY = 100;

function buildMarkers() {
  const markers: React.ReactElement[] = [];
  for (let i = 0; i < 60; i++) {
    const angle = ((i * 6 - 90) * Math.PI) / 180;
    const isHour = i % 5 === 0;
    const isCardinal = i % 15 === 0;
    const outerR = 92;
    const innerR = isCardinal ? 78 : isHour ? 82 : 88;
    const color = isCardinal ? "#666" : isHour ? "#444" : "#222";
    const width = isCardinal ? 2.2 : isHour ? 1.4 : 0.6;
    markers.push(
      <line
        key={i}
        x1={CX + Math.cos(angle) * innerR}
        y1={CY + Math.sin(angle) * innerR}
        x2={CX + Math.cos(angle) * outerR}
        y2={CY + Math.sin(angle) * outerR}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />,
    );
  }
  return markers;
}

const MARKERS = buildMarkers();

function AnalogClock() {
  const hourRef = useRef<SVGLineElement>(null);
  const minuteRef = useRef<SVGLineElement>(null);
  const secondRef = useRef<SVGLineElement>(null);
  const secondTailRef = useRef<SVGLineElement>(null);

  useEffect(() => {
    let rafId: number;

    const tick = () => {
      const now = new Date();
      const s = now.getSeconds() + now.getMilliseconds() / 1000;
      const m = now.getMinutes() + s / 60;
      const h = (now.getHours() % 12) + m / 60;

      const sRad = ((s * 6 - 90) * Math.PI) / 180;
      const mRad = ((m * 6 - 90) * Math.PI) / 180;
      const hRad = ((h * 30 - 90) * Math.PI) / 180;

      if (hourRef.current) {
        hourRef.current.setAttribute("x2", String(CX + Math.cos(hRad) * 52));
        hourRef.current.setAttribute("y2", String(CY + Math.sin(hRad) * 52));
      }
      if (minuteRef.current) {
        minuteRef.current.setAttribute("x2", String(CX + Math.cos(mRad) * 72));
        minuteRef.current.setAttribute("y2", String(CY + Math.sin(mRad) * 72));
      }
      if (secondRef.current) {
        secondRef.current.setAttribute("x2", String(CX + Math.cos(sRad) * 80));
        secondRef.current.setAttribute("y2", String(CY + Math.sin(sRad) * 80));
      }
      if (secondTailRef.current) {
        secondTailRef.current.setAttribute(
          "x2",
          String(CX - Math.cos(sRad) * 18),
        );
        secondTailRef.current.setAttribute(
          "y2",
          String(CY - Math.sin(sRad) * 18),
        );
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <Box
      width="100%"
      height="100%"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <Box width="80vw" maxWidth="80vh">
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          {MARKERS}

          {/* Hour hand */}
          <line
            ref={hourRef}
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY - 52}
            stroke="white"
            strokeWidth={3.5}
            strokeLinecap="round"
          />

          {/* Minute hand */}
          <line
            ref={minuteRef}
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY - 72}
            stroke="white"
            strokeWidth={2}
            strokeLinecap="round"
          />

          {/* Second hand tail */}
          <line
            ref={secondTailRef}
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY + 18}
            stroke="#c53030"
            strokeWidth={1.2}
            strokeLinecap="round"
          />

          {/* Second hand */}
          <line
            ref={secondRef}
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY - 80}
            stroke="#c53030"
            strokeWidth={1.2}
            strokeLinecap="round"
          />

          {/* Center dot */}
          <circle cx={CX} cy={CY} r={3.5} fill="white" />
          <circle cx={CX} cy={CY} r={1.8} fill="#c53030" />
        </svg>
      </Box>
    </Box>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Clock() {
  return (
    <Box
      width="100vw"
      height="100vh"
      bg="#000"
      overflow="hidden"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <AnalogClock />
    </Box>
  );
}
