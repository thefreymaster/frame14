import { Box } from "@chakra-ui/react";
import { IoMic } from "react-icons/io5";
import { GRID_GAP } from "../lib/surfaces";
import type { VoiceState } from "../lib/voiceAssist";

/**
 * The mic button.
 *
 * Fixed rather than a nav item: you walk up to the panel and talk, so it has to
 * exist on every view, and a 24px glyph in the nav rail is not a wall-panel
 * touch target. Idle fill is --theme-surface-1, the same luminance as any card
 * on /home, so it adds no burn-in risk the design doesn't already carry.
 *
 * Bottom-left, not bottom-right: DoorbellCard owns the right corner and sits at
 * a higher z-index, so a mic button there would disappear under the camera feed
 * exactly when the card slides up. In landscape it clears the 68px nav rail.
 */
export function VoiceAssistButton({
  onTap,
  state,
  navVisible,
}: {
  onTap: () => void;
  state: VoiceState;
  navVisible: boolean;
}) {
  const active = state !== "idle";

  return (
    <Box
      as="button"
      aria-label="Ask the house"
      onClick={onTap}
      position="fixed"
      zIndex={90}
      width="clamp(56px, 9vmin, 88px)"
      height="clamp(56px, 9vmin, 88px)"
      borderRadius="full"
      bg={active ? "var(--theme-surface-2-on)" : "var(--theme-surface-1)"}
      color={active ? "var(--theme-fg)" : "var(--theme-fg-faint)"}
      display="flex"
      alignItems="center"
      justifyContent="center"
      cursor="pointer"
      _active={{ transform: "scale(0.94)", opacity: 0.85 }}
      transition="background-color 160ms ease, color 160ms ease, transform 80ms cubic-bezier(0.2, 0, 0.2, 1)"
      style={{ WebkitTapHighlightColor: "transparent" }}
      css={{
        "@media (orientation: landscape)": {
          bottom: `calc(env(safe-area-inset-bottom, 0px) + ${GRID_GAP})`,
          left: navVisible
            ? `calc(68px + env(safe-area-inset-left, 0px) + ${GRID_GAP})`
            : `calc(env(safe-area-inset-left, 0px) + ${GRID_GAP})`,
        },
        "@media (orientation: portrait)": {
          bottom: navVisible
            ? `calc(64px + env(safe-area-inset-bottom, 0px) + ${GRID_GAP})`
            : `calc(env(safe-area-inset-bottom, 0px) + ${GRID_GAP})`,
          left: `calc(env(safe-area-inset-left, 0px) + ${GRID_GAP})`,
        },
      }}
    >
      <Box fontSize="clamp(24px, 4vmin, 38px)" display="flex">
        <IoMic />
      </Box>
    </Box>
  );
}
