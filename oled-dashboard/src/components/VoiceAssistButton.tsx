import { IconButton } from "@chakra-ui/react";
import { IoMic } from "react-icons/io5";
import type { VoiceState } from "../lib/voiceAssist";
import {
  NAV_BAR_CLEARANCE,
  NAV_BAR_INSET,
  NAV_RAIL_CLEARANCE,
} from "../lib/navMetrics";

/**
 * The mic button, on every view: you walk up to the panel and talk.
 *
 * `header` (desktop and the frame): a plain square-cornered button beside the
 * name in StatusBanner — Chakra's stock button radius (`l2`), not the theme's
 * pill.
 *
 * `floating` (phones): a fixed round button at the bottom left, above the
 * floating bar in portrait (clear of the rail in landscape). Left, not right:
 * DoorbellCard owns the right corner and sits above it.
 */
export function VoiceAssistButton({
  onTap,
  state,
  navVisible,
  placement = "floating",
}: {
  onTap: () => void;
  state: VoiceState;
  navVisible: boolean;
  placement?: "floating" | "header";
}) {
  const active = state !== "idle";

  if (placement === "header") {
    return (
      <IconButton
        aria-label="Ask the house"
        aria-pressed={active}
        onClick={onTap}
        variant={active ? "solid" : "subtle"}
        size="xs"
        rounded="l2"
      >
        <IoMic />
      </IconButton>
    );
  }

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
