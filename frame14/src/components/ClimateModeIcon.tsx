import { keyframes } from "@emotion/react";
import { Box, Icon } from "@chakra-ui/react";
import { MODE_ICON, type ClimateVisualMode } from "../lib/hvac";

// Heat rises: the flame once more, feathered, lifting off the icon and
// thinning out as it goes. Opacity and transform alone, the blur never
// changing — a compositor's work, as the lit icons' halo is (SectionTitle).
const rise = keyframes`
  from { opacity: 0; transform: translateY(10%) scale(0.85); }
  30% { opacity: 0.9; }
  to { opacity: 0; transform: translateY(-50%) scale(1.15, 1.5); }
`;

// Cold sinks: the flake once more, feathered, drifting down off the icon
// and turning a little as a falling flake does.
const sink = keyframes`
  from { opacity: 0; transform: translateY(-8%) scale(0.85) rotate(0deg); }
  30% { opacity: 0.85; }
  to { opacity: 0; transform: translateY(45%) scale(1.3) rotate(45deg); }
`;

/**
 * What comes off a mode's icon while the thermostat is in it: the frames,
 * and how long one wisp takes — idle at its set point, and while the unit
 * is running, when it comes off faster. The cold is the slower of the two.
 */
const WISPS: Partial<
  Record<ClimateVisualMode, { frames: string; idle: number; running: number }>
> = {
  heat: { frames: rise, idle: 2.8, running: 1.6 },
  cool: { frames: sink, idle: 3.6, running: 2.2 },
};

/** How far a wisp is feathered past the icon's own outline. */
const WISP_BLUR = "0.14rem";

/** How many wisps are on their way at once, evenly apart. */
const WISP_COUNT = [0, 1];

/**
 * A thermostat's mode icon — the flame, the flake, the power glyph of one
 * that is off (lib/hvac's MODE_ICON; Fan mode's is FanIcon) — pulsing while
 * the unit is running, as it did.
 *
 * In Heat and in Cool it gives something off (0.173.0, the user, of the
 * fan's wind: "add some little animations in the same style for the heat
 * and cool icons on the thermostat cards. Use their respective colors"):
 * the icon once more behind itself, feathered as a lit bulb's halo is, in
 * its own colour — and moving as what it stands for moves. Heat rises off
 * the flame; cold sinks from the flake, slower, turning as it falls. One
 * wisp follows another, faster while the unit is running than while it
 * waits at its set point. They lie over the icon's box and take no room;
 * none under reduced motion.
 */
export function ClimateModeIcon({
  mode,
  on,
  running,
  color,
  boxSize,
}: {
  mode: ClimateVisualMode;
  /** The thermostat is in a mode, not off: its icon is in the mode's colour. */
  on: boolean;
  /** The unit is heating or cooling now. */
  running: boolean;
  color: string;
  boxSize: string;
}) {
  const ModeIcon = MODE_ICON[mode];
  const wisps = on ? WISPS[mode] : undefined;
  const icon = (
    <Icon
      color={color}
      boxSize={boxSize}
      position="relative"
      animation={running ? "pulse 2s ease-in-out infinite" : undefined}
    >
      <ModeIcon />
    </Icon>
  );
  if (!wisps) return icon;
  const seconds = running ? wisps.running : wisps.idle;
  return (
    <Box
      position="relative"
      display="inline-flex"
      flexShrink={0}
      data-mode-icon={mode}
    >
      {WISP_COUNT.map((i) => (
        <Icon
          key={i}
          color={color}
          boxSize={boxSize}
          position="absolute"
          inset="0"
          filter={`blur(${WISP_BLUR})`}
          pointerEvents="none"
          // Each starts where the last is half way gone.
          animation={`${wisps.frames} ${seconds}s ease-out ${(-i * seconds) / WISP_COUNT.length}s infinite`}
          _motionReduce={{ display: "none" }}
          aria-hidden
          data-mode-wisp=""
        >
          <ModeIcon />
        </Icon>
      ))}
      {icon}
    </Box>
  );
}
