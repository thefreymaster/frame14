import { useEffect, useState } from "react";
import { Box, Text, VStack } from "@chakra-ui/react";
import { IoMic } from "react-icons/io5";
import { VoiceLevelRing } from "./VoiceLevelRing";
import type { VoiceSnapshot } from "../lib/voiceAssist";

const EXIT_MS = 220;

const STATUS: Record<string, string> = {
  arming: "",
  listening: "Listening",
  transcribing: "Listening",
  thinking: "Thinking",
  speaking: "",
  error: "",
};

const SLOW_HINT: Record<string, string> = {
  none: "",
  "still-thinking": "still thinking…",
  "waking-model": "the model is waking up — this can take a minute the first time",
};

/**
 * Full-screen session UI, following the same shape as the other modals in the
 * app: fixed inset-0, rendered inline, click-outside and Escape to dismiss,
 * with an isClosing state so the exit animation gets to play.
 *
 * No backdropFilter here, unlike FanSection's modal — blur is expensive on this
 * panel and it lifts the black off true #000.
 */
export function VoiceAssistOverlay({
  snapshot,
  onDismiss,
}: {
  snapshot: VoiceSnapshot;
  onDismiss: () => void;
}) {
  const [isClosing, setIsClosing] = useState(false);

  function close() {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(onDismiss, EXIT_MS);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const { state, transcript, reply, errorMessage, audioBlocked, slowHint } = snapshot;
  const listening = state === "listening" || state === "transcribing";
  const status = STATUS[state] ?? "";
  const hint = SLOW_HINT[slowHint] ?? "";

  return (
    <Box
      className="voice-overlay"
      position="fixed"
      inset="0"
      zIndex={200}
      bg="rgba(0, 0, 0, 0.94)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      onClick={close}
      style={{
        opacity: isClosing ? 0 : 1,
        transition: `opacity ${EXIT_MS}ms ease`,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <VStack
        gap="3vmin"
        px="8vmin"
        maxW="90vw"
        textAlign="center"
        onClick={(e) => e.stopPropagation()}
      >
        <Box
          position="relative"
          display="flex"
          alignItems="center"
          justifyContent="center"
          width="24vmin"
          height="24vmin"
        >
          {listening && <VoiceLevelRing />}
          <Box
            position="relative"
            fontSize="8vmin"
            display="flex"
            color={state === "error" ? "var(--theme-fg-muted)" : "var(--theme-fg-dim)"}
          >
            <IoMic />
          </Box>
        </Box>

        {status && (
          <Text fontSize="2.4vmin" color="var(--theme-fg-faint)" letterSpacing="0.08em">
            {status}
          </Text>
        )}

        {transcript && (
          <Text
            fontSize={reply ? "2.6vmin" : "4vmin"}
            fontWeight="300"
            color={reply ? "var(--theme-fg-muted)" : "var(--theme-fg)"}
          >
            {transcript}
          </Text>
        )}

        {reply && (
          <Text fontSize="4.5vmin" fontWeight="300" color="var(--theme-fg)">
            {reply}
          </Text>
        )}

        {errorMessage && (
          <>
            <Text fontSize="3.4vmin" fontWeight="300" color="var(--theme-fg-dim)">
              {errorMessage}
            </Text>
            <Text fontSize="2.2vmin" color="var(--theme-fg-faint)">
              Tap to try again
            </Text>
          </>
        )}

        {hint && state === "thinking" && (
          <Text fontSize="2.2vmin" color="var(--theme-fg-faint)">
            {hint}
          </Text>
        )}

        {audioBlocked && reply && (
          <Text fontSize="2.2vmin" color="var(--theme-fg-faint)">
            (couldn't speak that)
          </Text>
        )}
      </VStack>
    </Box>
  );
}
