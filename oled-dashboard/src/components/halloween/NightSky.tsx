import { Box } from "@chakra-ui/react";
import { seeded } from "../../lib/halloween";

// The stars' places and timings are fixed (lib/halloween's seeded
// generator), so the sky is the same on every visit and in every screenshot.

const STAR_TINTS = ["#ffffff", "#ffffff", "#fff1c4", "#e4c6ff"];

const STARS = (() => {
  const rand = seeded(31);
  return Array.from({ length: 90 }, () => ({
    x: rand() * 100,
    y: rand() * 100,
    r: 0.1 + rand() * 0.26,
    tint: STAR_TINTS[Math.floor(rand() * STAR_TINTS.length)],
    delay: rand() * 4,
    duration: 2.5 + rand() * 3,
  }));
})();

// Three bats about the moon, each flapping at its own pace and drifting.
const BATS = [
  { left: "56%", top: "10%", size: "4.2vmin", drift: "0s", flap: "0.9s" },
  { left: "83%", top: "31%", size: "3.4vmin", drift: "1.3s", flap: "1.15s" },
  { left: "66%", top: "35%", size: "2.8vmin", drift: "0.6s", flap: "0.8s" },
];

/**
 * The sky's furniture: the stars twinkling (hw-twinkle), a full moon with
 * its glow and craters at the top right, and the bats (hw-flap, hw-drift).
 */
export function NightSky() {
  return (
    <>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      >
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={s.tint}
            style={{
              animation: `hw-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </svg>

      <Box
        aria-hidden="true"
        position="absolute"
        top="7%"
        right="9%"
        width="min(30vmin, 26vw)"
        aspectRatio="1"
        borderRadius="full"
        bgImage="radial-gradient(circle at 38% 34%, #fff8dc 0%, #ffe39a 38%, #ffbe4d 72%, #ef8d2c 100%)"
        boxShadow="0 0 3vmin 1vmin rgba(255, 205, 120, 0.45), 0 0 14vmin 5vmin rgba(255, 140, 60, 0.22)"
      >
        {[
          { top: "22%", left: "58%", size: "17%" },
          { top: "52%", left: "30%", size: "12%" },
          { top: "63%", left: "62%", size: "9%" },
        ].map((c, i) => (
          <Box
            key={i}
            position="absolute"
            top={c.top}
            left={c.left}
            width={c.size}
            aspectRatio="1"
            borderRadius="full"
            bg="rgba(205, 110, 35, 0.22)"
          />
        ))}
      </Box>

      {BATS.map((b, i) => (
        <Box
          key={i}
          aria-hidden="true"
          position="absolute"
          left={b.left}
          top={b.top}
          width={b.size}
          style={{
            animation: `hw-drift 6s ease-in-out ${b.drift} infinite alternate`,
          }}
        >
          <svg
            viewBox="0 0 24 12"
            style={{
              display: "block",
              width: "100%",
              transformOrigin: "50% 60%",
              animation: `hw-flap ${b.flap} ease-in-out infinite alternate`,
            }}
          >
            <path
              d="M12,7 C10,3 6,1 0,4 C3,5 4,7 3,9 C6,8 9,8 12,11 C15,8 18,8 21,9 C20,7 21,5 24,4 C18,1 14,3 12,7 Z"
              fill="#05030a"
            />
          </svg>
        </Box>
      ))}
    </>
  );
}
