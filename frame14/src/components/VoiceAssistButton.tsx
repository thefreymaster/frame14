import { IconButton } from "@chakra-ui/react";
import { IoMic } from "react-icons/io5";
import type { VoiceState } from "../lib/voiceAssist";
import { Tooltip } from "./ui/tooltip";

/**
 * The mic button, on every view: you walk up to the panel and talk. A plain
 * square-cornered button at the right of StatusBanner, after the status icons
 * (before the clock on a desktop), on every device — Chakra's stock button
 * radius (`l2`), not the theme's pill. A tooltip says what a tap does: ask,
 * or, while a question is under way, stop it (on a pointer's hover or a
 * keyboard's focus; a touch only taps).
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
    <Tooltip content={active ? "Stop" : "Ask the house"} showArrow>
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
    </Tooltip>
  );
}
