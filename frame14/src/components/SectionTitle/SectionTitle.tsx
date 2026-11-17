import { keyframes } from "@emotion/react";
import { Box, HStack, Heading, Icon } from "@chakra-ui/react";

// The halo round a lit icon, breathing: faint and close, then full and a
// little wider. Opacity and transform alone — the blur itself never changes
// — so the browser composites the pulse and repaints nothing (the frame's
// WebView is no place for an animated filter).
const breathe = keyframes`
  from { opacity: 0.25; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1.3); }
`;

/** How long the halo takes to swell, and then again to fade. */
const GLOW_HALF_MS = 2200;

/** How far the halo is feathered past the icon's own outline. */
const GLOW_BLUR = "0.3rem";

/**
 * A card's section heading, with an optional leading icon.
 *
 * `glow` gives the icon a halo in its own colour (0.172.0, the user, of the
 * lit bulbs in /lights' room headers: "When a light is on, add a glowing
 * animation outlining the light icon, like a feathered fading slow pulsing
 * animation"): the icon once more behind itself, blurred, so the glow is the
 * icon's own shape feathered outwards, fading in and out slowly. Still —
 * a steady halo — under reduced motion. It is drawn over nothing and takes
 * no room: the heading sits where it did.
 */
export const SectionTitle = ({
  children,
  icon,
  iconColor,
  glow = false,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconColor?: string;
  /** The icon glows, pulsing slowly: a header's, while one of its lights is on. */
  glow?: boolean;
}) => {
  const label = (
    <Heading as="h2" size="md">
      {children}
    </Heading>
  );
  if (!icon) return label;
  const color = iconColor ?? "fg.muted";
  return (
    <HStack gap="2" align="center">
      {glow ? (
        <Box position="relative" display="inline-flex" flexShrink={0} data-glow="">
          <Icon
            color={color}
            boxSize="5"
            position="absolute"
            inset="0"
            filter={`blur(${GLOW_BLUR})`}
            pointerEvents="none"
            animation={`${breathe} ${GLOW_HALF_MS}ms ease-in-out infinite alternate`}
            _motionReduce={{ animation: "none", opacity: 0.6 }}
            aria-hidden
            data-glow-halo=""
          >
            {icon}
          </Icon>
          <Icon color={color} boxSize="5" position="relative">
            {icon}
          </Icon>
        </Box>
      ) : (
        <Icon color={color} boxSize="5">
          {icon}
        </Icon>
      )}
      {label}
    </HStack>
  );
};
