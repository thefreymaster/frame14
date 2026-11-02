import { Box } from "@chakra-ui/react";
import { seeded } from "../../lib/halloween";

// Mostly white, now and then warm or pink, like light catching glass.
const TINTS = ["#ffffff", "#ffffff", "#ffffff", "#fff3cc", "#ffd6f5"];

function sparkles(seed: number, count: number) {
  const rand = seeded(seed);
  return Array.from({ length: count }, () => ({
    // Over the word's box, and a little past its edges.
    x: rand() * 100,
    y: -8 + rand() * 112,
    size: 1.1 + rand() * 1.1,
    tint: TINTS[Math.floor(rand() * TINTS.length)],
    duration: 4 + rand() * 3,
    delay: rand() * 7,
  }));
}

/**
 * The glints that make a neon word sparkle (0.128.1): small four-point
 * stars over the letters, each winking in and out on its own slow cycle
 * (hw-glint, lit for about a quarter of it), so a few show at any moment
 * and none stays. Fixed places from a seeded generator; decorative, so
 * hidden from a screen reader.
 */
export function NeonSparkles({ seed, count }: { seed: number; count: number }) {
  return (
    <Box position="absolute" inset="0" pointerEvents="none" aria-hidden="true">
      {sparkles(seed, count).map((s, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}vmin`,
            height: `${s.size}vmin`,
            marginLeft: `${-s.size / 2}vmin`,
            marginTop: `${-s.size / 2}vmin`,
            opacity: 0,
            filter: "drop-shadow(0 0 0.4vmin rgba(255, 255, 255, 0.9))",
            animation: `hw-glint ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        >
          <path
            d="M12 0 C12.6 7 17 11.4 24 12 C17 12.6 12.6 17 12 24 C11.4 17 7 12.6 0 12 C7 11.4 11.4 7 12 0 Z"
            fill={s.tint}
          />
        </svg>
      ))}
    </Box>
  );
}
