import { useEffect, useRef } from "react";
import { Box } from "@chakra-ui/react";
import { subscribeLevel } from "../lib/voiceRecorder";

/**
 * Live microphone level around the mic glyph.
 *
 * The level arrives ~16 times a second. Routing that through React state would
 * re-render the overlay on every frame for no benefit, so this writes the
 * transform directly and smooths it in a rAF loop.
 */
export function VoiceLevelRing({ size = "24vmin" }: { size?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let level = 0;
    let target = 0;
    let frame = 0;

    const unsubscribe = subscribeLevel((rms) => {
      // Speech RMS sits well below 1; scale it into a visible range and cap it.
      target = Math.min(1, rms * 4);
    });

    const tick = () => {
      level += (target - level) * 0.25;
      const el = ref.current;
      if (el) {
        el.style.transform = `scale(${1 + level * 0.55})`;
        el.style.opacity = `${0.25 + level * 0.45}`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      unsubscribe();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <Box
      ref={ref}
      position="absolute"
      width={size}
      height={size}
      borderRadius="full"
      bg="var(--theme-surface-2)"
      style={{ transform: "scale(1)", opacity: 0.25, willChange: "transform" }}
      pointerEvents="none"
    />
  );
}
