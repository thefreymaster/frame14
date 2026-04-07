import { useState, useEffect, type ReactNode } from "react";
import { Box } from "@chakra-ui/react";

const OFFSETS = [-3, -2, -1, 0, 1, 2, 3];
const INTERVAL_MS = 5000;

function randomOffset(exclude: number): number {
  const choices = OFFSETS.filter((v) => v !== exclude);
  return choices[Math.floor(Math.random() * choices.length)];
}

interface Props {
  children: ReactNode;
  /** Shift interval in ms (default 30 000) */
  intervalMs?: number;
}

export function PixelShift({ children, intervalMs = INTERVAL_MS }: Props) {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const id = setInterval(() => {
      setPos((prev) => ({
        x: randomOffset(prev.x),
        y: randomOffset(prev.y),
      }));
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return (
    <Box
      transform={`translate(${pos.x}px, ${pos.y}px)`}
      transition="transform 2s ease"
      width="100%"
      height="100%"
      data-testid="pixel-shift"
    >
      {children}
    </Box>
  );
}
