import { useEffect, useRef } from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { MdAir } from "react-icons/md";

/** Slug-ish HA fan mode name ("wind_free") → display label ("WIND FREE"). */
function fanModeLabel(mode: string) {
  return mode.replace(/[_-]+/g, " ").toUpperCase();
}

/**
 * Discrete slider over a climate entity's fan_modes. Drag or tap snaps to the
 * nearest mode; the service call fires on release so a drag sends one command.
 */
export function FanSpeedSlider({
  modes,
  value,
  accent,
  trackCss,
  hairline,
  disabled = false,
  onChange,
  onCommit,
  onDragStart,
  onDragEnd,
}: {
  modes: string[];
  value: string | null;
  accent: string;
  trackCss: string;
  hairline: string;
  disabled?: boolean;
  onChange: (mode: string) => void;
  onCommit: (mode: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const barsRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const activeIndex = Math.max(0, modes.indexOf(value ?? ""));
  const currentIndexRef = useRef(activeIndex);
  useEffect(() => {
    currentIndexRef.current = activeIndex;
  }, [activeIndex]);

  function updateFromEvent(e: React.PointerEvent<HTMLDivElement>) {
    const el = barsRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    const index = Math.max(
      0,
      Math.min(modes.length - 1, Math.round(ratio * (modes.length - 1))),
    );
    if (index !== currentIndexRef.current) {
      currentIndexRef.current = index;
      onChange(modes[index]);
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (modes.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    draggingRef.current = true;
    onDragStart();
    updateFromEvent(e);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    updateFromEvent(e);
  }

  function handlePointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    onDragEnd();
    onCommit(modes[currentIndexRef.current]);
  }

  if (modes.length === 0) return null;

  return (
    <Box
      position="relative"
      bg={trackCss}
      borderRadius="full"
      border={`1px solid ${hairline}`}
      px={{ base: "4vw", md: "2vmin" }}
      py={{ base: "2vw", md: "1.2vmin" }}
      width="100%"
      opacity={disabled ? 0.5 : 1}
      style={{ transition: "opacity 260ms ease" }}
    >
      <HStack gap={{ base: "3vw", md: "1.6vmin" }} align="center">
        <Box
          color={accent}
          fontSize={{ base: "4.4vw", md: "2.4vmin" }}
          lineHeight="1"
          display="inline-flex"
          flexShrink={0}
        >
          <MdAir />
        </Box>
        <Box
          ref={barsRef}
          flex="1"
          height={{ base: "8vw", md: "4.4vmin" }}
          display="flex"
          alignItems="flex-end"
          gap={{ base: "1.6vw", md: "0.9vmin" }}
          role="slider"
          aria-label="Fan speed"
          aria-valuemin={0}
          aria-valuemax={modes.length - 1}
          aria-valuenow={activeIndex}
          aria-valuetext={fanModeLabel(modes[activeIndex])}
          tabIndex={0}
          style={{ touchAction: "none", cursor: "pointer" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          {modes.map((mode, index) => {
            const active = index <= activeIndex;
            const ramp =
              modes.length === 1 ? 1 : 0.4 + (index / (modes.length - 1)) * 0.6;
            return (
              <Box
                key={mode}
                flex="1"
                height={`${ramp * 100}%`}
                borderRadius="full"
                bg={active ? accent : hairline}
                opacity={active ? (index === activeIndex ? 1 : 0.65) : 0.5}
                pointerEvents="none"
                style={{
                  transition: "background-color 220ms ease, opacity 220ms ease",
                }}
              />
            );
          })}
        </Box>
        <Text
          flexShrink={0}
          minWidth={{ base: "14vw", md: "8vmin" }}
          textAlign="right"
          fontSize={{ base: "2.4vw", md: "1.3vmin" }}
          fontWeight="600"
          letterSpacing="0.12em"
          color={accent}
          whiteSpace="nowrap"
        >
          {fanModeLabel(modes[activeIndex])}
        </Text>
      </HStack>
    </Box>
  );
}
