import { IconButton } from "@chakra-ui/react";
import { IoMic } from "react-icons/io5";
import type { VoiceState } from "../lib/voiceAssist";

/**
 * The mic button, on every view: you walk up to the panel and talk. A plain
 * square-cornered button at the right of StatusBanner, after the status icons
 * (before the clock on a desktop), on every device — Chakra's stock button
 * radius (`l2`), not the theme's pill.
 */
export function VoiceAssistButton({
  onTap,
  state,
}: {
  onTap: () => void;
  state: VoiceState;
}) {
  const active = state !== "idle";

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
