import { keyframes } from "@emotion/react";
import { Box } from "@chakra-ui/react";

// One gust: the trails are swept on round the fan and thrown outwards,
// fading in as they leave the blades and out as they go. Opacity and
// transform alone — a compositor's work, as the lit icons' halo is
// (SectionTitle): nothing is repainted, on the frame's WebView least of all.
const gust = keyframes`
  from { opacity: 0; transform: rotate(0deg) scale(1); }
  25% { opacity: 0.9; }
  to { opacity: 0; transform: rotate(150deg) scale(1.9); }
`;

/**
 * Three trails of air round the fan, each a comet: nothing at its tail,
 * full at its head, which leads the way the blades turn. `from` turns the
 * whole set, so two layers' trails don't lie on each other.
 */
const trails = (from: number) =>
  `conic-gradient(from ${from}deg, transparent 0deg, currentColor 96deg, transparent 106deg, transparent 120deg, currentColor 216deg, transparent 226deg, transparent 240deg, currentColor 336deg, transparent 346deg)`;

/** The trails kept to a thin band round the blades' tips, soft at both edges. */
const BAND =
  "radial-gradient(closest-side, transparent 64%, black 76%, black 82%, transparent 96%)";

/** How far a trail is feathered, in the icon's own size. */
const WIND_BLUR = "0.04em";

/** How many gusts are on their way at once, evenly apart. */
const GUSTS = [0, 1];

/**
 * The wind off a spinning fan (0.173.0, the user: "Add a wind animation to
 * the spinning fan icon that is feathered like the light icon but make it
 * feel like wind not light"): where a lit bulb's halo swells and fades in
 * place, this moves — feathered trails of air swept round with the blades
 * and thrown outwards, one gust after another, at the fan's own pace
 * (`seconds` a gust). In the fan's colour, the app's teal, whatever colour
 * the glyph itself is drawn in.
 *
 * It lies over the icon's own box and takes no room (FanIcon positions it);
 * nothing of it under reduced motion, where the fan stands still too.
 */
export function FanWind({
  seconds,
  color = "teal.solid",
}: {
  /** How long one gust takes from the blades to gone. */
  seconds: number;
  color?: string;
}) {
  return (
    <Box
      position="absolute"
      inset="0"
      color={color}
      pointerEvents="none"
      aria-hidden
      _motionReduce={{ display: "none" }}
      data-fan-wind=""
    >
      {GUSTS.map((i) => (
        <Box
          key={i}
          position="absolute"
          inset="0"
          rounded="full"
          bgImage={trails(i * 60)}
          maskImage={BAND}
          filter={`blur(${WIND_BLUR})`}
          // Each starts where the last is half way out.
          animation={`${gust} ${seconds}s linear ${(-i * seconds) / GUSTS.length}s infinite`}
          data-fan-gust=""
        />
      ))}
    </Box>
  );
}
