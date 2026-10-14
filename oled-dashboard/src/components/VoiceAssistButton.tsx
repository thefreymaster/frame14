import { IconButton } from "@chakra-ui/react";
import { IoMic } from "react-icons/io5";
import type { VoiceState } from "../lib/voiceAssist";

/**
 * The mic button.
 *
 * Fixed rather than a nav item: you walk up to the panel and talk, so it has to
 * exist on every view, and a 24px glyph in the nav rail is not a wall-panel
 * touch target. Idle fill is the card surface, the same luminance as any card
 * on /home, so it adds no burn-in risk the design doesn't already carry.
 *
 * Bottom-left, not bottom-right: DoorbellCard owns the right corner and sits at
 * a higher z-index, so a mic button there would disappear under the camera feed
 * exactly when the card slides up. In landscape it clears the nav rail.
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
  const gap = "{spacing.gutter}";

  return (
    <IconButton
      aria-label="Ask the house"
      aria-pressed={active}
      onClick={onTap}
      variant="raised"
      size="fab"
      position="fixed"
      zIndex={90}
      bottom={{
        _landscape: `calc(env(safe-area-inset-bottom, 0px) + ${gap})`,
        _portrait: navVisible
          ? `calc({sizes.navBar} + env(safe-area-inset-bottom, 0px) + ${gap})`
          : `calc(env(safe-area-inset-bottom, 0px) + ${gap})`,
      }}
      left={{
        _landscape: navVisible
          ? `calc({sizes.navRail} + env(safe-area-inset-left, 0px) + ${gap})`
          : `calc(env(safe-area-inset-left, 0px) + ${gap})`,
        _portrait: `calc(env(safe-area-inset-left, 0px) + ${gap})`,
      }}
    >
      <IoMic />
    </IconButton>
  );
}
