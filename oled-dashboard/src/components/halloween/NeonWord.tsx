import { Box } from "@chakra-ui/react";
import { NEON } from "../../lib/halloween";
import { NeonSparkles } from "./NeonSparkles";

// Creepster (index.css's @font-face, src/assets/fonts/creepster) with the
// heaviest faces a device is likely to have behind it.
const FONT = "'Creepster', Impact, 'Arial Black', 'Trebuchet MS', sans-serif";

/** The tube's glow: a white-hot core, then its colour, wider and fainter. */
const glow = (colour: string) =>
  `0 0 0.02em rgba(255, 255, 255, 0.9), 0 0 0.07em ${colour}, 0 0 0.16em ${colour}, 0 0 0.32em ${colour}, 0 0 0.6em ${colour}`;

// Each letter leans and sits a little differently from its neighbours, as
// tubes hung by hand do.
const TILT = [-5, 3, -2, 4, -4, 2, -3, 5, -1];
const LIFT = [0.02, -0.03, 0.01, -0.02, 0.03, -0.01, 0.02, -0.03, 0];

/**
 * One word in neon: a letter per tube, the NEON colours in turn from
 * `from`, each glowing in its own; the word rises and falls (hw-bob) or
 * rocks (hw-sway), and one letter's tube can be on its way out (hw-flicker).
 * It sparkles (0.128.1): glints wink over the letters (NeonSparkles) and a
 * faint brightening ripples along the word, a letter at a time (hw-shimmer).
 */
export function NeonWord({
  word,
  size,
  from,
  flicker,
  sway = false,
  delay = "0s",
  sparkles = 10,
}: {
  word: string;
  /** The font size, a CSS length. */
  size: string;
  /** The NEON colour the first letter takes; the rest follow in turn. */
  from: number;
  /** The index of a letter whose tube flickers. */
  flicker?: number;
  /** Rock a little instead of rising and falling. */
  sway?: boolean;
  /** The movement's phase, as an animation-delay. */
  delay?: string;
  /** How many glints sparkle over the word. */
  sparkles?: number;
}) {
  return (
    <Box
      as="span"
      position="relative"
      display="block"
      whiteSpace="nowrap"
      lineHeight="1"
      fontFamily={FONT}
      fontSize={size}
      letterSpacing="0.03em"
      style={{
        animation: `${sway ? "hw-sway" : "hw-bob"} 5s ease-in-out ${delay} infinite alternate`,
      }}
    >
      {[...word].map((letter, i) => {
        const colour = NEON[(from + i) % NEON.length];
        return (
          <Box
            as="span"
            key={i}
            aria-hidden="true"
            display="inline-block"
            color={colour}
            textShadow={glow(colour)}
            style={{
              transform: `rotate(${TILT[i % TILT.length]}deg) translateY(${LIFT[i % LIFT.length]}em)`,
              animation: [
                i === flicker ? "hw-flicker 7s linear infinite" : "",
                `hw-shimmer 2.8s ease-in-out ${-i * 0.35}s infinite alternate`,
              ]
                .filter(Boolean)
                .join(", "),
            }}
          >
            {letter}
          </Box>
        );
      })}
      <NeonSparkles seed={from + word.length} count={sparkles} />
    </Box>
  );
}
