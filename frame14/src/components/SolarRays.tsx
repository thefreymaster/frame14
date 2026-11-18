import { keyframes } from "@emotion/react";
import { Box } from "@chakra-ui/react";

/** The way the light falls: from the upper right, this far off the vertical. */
const SLANT = 28;

/**
 * A ray on its way down to the panels: it comes in out of nothing, brightens
 * as it falls and is gone as it lands. Opacity and transform alone, as every
 * icon's effect here (SectionTitle's halo, ClimateModeIcon's wisps): a
 * compositor's work. In em, the icon's size, so the fall is the same part of
 * the icon at the card's size and the page's.
 */
const fall = keyframes`
  from { opacity: 0; transform: translate(0.11em, -0.2em) rotate(${SLANT}deg); }
  35% { opacity: 1; }
  70% { opacity: 1; }
  to { opacity: 0; transform: translate(-0.03em, 0.07em) rotate(${SLANT}deg); }
`;

/** How long one ray takes to fall, in seconds. */
const FALL_SECONDS = 2.4;

/** Where each ray comes down, across the roof (of the icon's width). */
const RAYS = [0.3, 0.52, 0.74];

/**
 * Sunlight on the panels (0.176.0, the user: "Add small rays of light
 * hitting the solar panels on the solar icon"): three short rays over the
 * roof of the flow's solar icon, in its yellow, slanting down from the upper
 * right and landing on the panels one after another — while the panels are
 * making power, which is when PowerFlow draws them. Lines as thick as the
 * icon's own (a sixteenth of its box) with round ends, so they read as part
 * of it.
 *
 * It lies over the icon's box — PowerFlow sets `--flow-icon`, the icon's
 * size — and takes no room; the rays reach up out of that box into the
 * node's circle, which has the room above the roof. Under reduced motion
 * they stand where they are brightest, still.
 */
export function SolarRays({ color }: { color: string }) {
  return (
    <Box
      position="absolute"
      inset="0"
      fontSize="var(--flow-icon)"
      pointerEvents="none"
      aria-hidden
      data-flow-rays=""
    >
      {RAYS.map((at, i) => (
        <Box
          key={at}
          position="absolute"
          left={`${at}em`}
          // Over the roof's top edge, which is a sixth of the way down the icon.
          top="-0.16em"
          width="0.0625em"
          minW="1.5px"
          height="0.2em"
          rounded="full"
          bg={color}
          // Where it stands with no motion: part-way down, at its brightest.
          transform={`translate(0.04em, -0.065em) rotate(${SLANT}deg)`}
          animation={`${fall} ${FALL_SECONDS}s ease-in ${(-i * FALL_SECONDS) / RAYS.length}s infinite`}
          _motionReduce={{ animation: "none" }}
          data-flow-ray=""
        />
      ))}
    </Box>
  );
}
