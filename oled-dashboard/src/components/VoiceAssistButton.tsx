import { IconButton } from "@chakra-ui/react";
import { IoMic } from "react-icons/io5";
import type { VoiceState } from "../lib/voiceAssist";
import {
  NAV_BAR_CLEARANCE,
  NAV_BAR_INSET,
  NAV_RAIL_CLEARANCE,
} from "../lib/navMetrics";

/**
 * The mic button.
 *
 * Fixed rather than a nav item: you walk up to the panel and talk, so it has to
 * exist on every view. Bottom-left, not bottom-right: DoorbellCard owns the
 * right corner and sits above it. In landscape it clears the nav rail; in portrait it sits
 * above the floating bar.
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
    <IconButton
      aria-label="Ask the house"
      aria-pressed={active}
      onClick={onTap}
      variant={active ? "solid" : "subtle"}
      size="2xl"
      rounded="full"
      shadow="md"
      position="fixed"
      zIndex="docked"
      bottom={{
        _landscape: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
        _portrait: navVisible
          ? `calc(${NAV_BAR_CLEARANCE} + 1rem)`
          : "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
      }}
      left={{
        _landscape: navVisible
          ? `calc(${NAV_RAIL_CLEARANCE} + 1rem)`
          : "calc(env(safe-area-inset-left, 0px) + 1rem)",
        // Lined up with the floating bar's left end.
        _portrait: `calc(env(safe-area-inset-left, 0px) + ${NAV_BAR_INSET})`,
      }}
    >
      <IoMic />
    </IconButton>
  );
}
