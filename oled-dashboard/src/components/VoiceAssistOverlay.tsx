import { useState } from "react";
import { Box, Dialog, Icon, Portal, Spinner, Text } from "@chakra-ui/react";
import { IoCheckmark, IoMic } from "react-icons/io5";
import { VoiceLevelRing } from "./VoiceLevelRing";
import type { VoiceSnapshot } from "../lib/voiceAssist";

const STATUS: Record<string, string> = {
  arming: "",
  listening: "Listening",
  transcribing: "Listening",
  thinking: "Thinking",
  speaking: "",
  done: "",
  error: "",
};

const SLOW_HINT: Record<string, string> = {
  none: "",
  "still-thinking": "still thinking…",
  "waking-model":
    "the model is waking up — this can take a minute the first time",
};

type View = Pick<
  VoiceSnapshot,
  | "state"
  | "transcript"
  | "reply"
  | "errorMessage"
  | "audioBlocked"
  | "slowHint"
>;

function sameView(a: View, b: View) {
  return (
    a.state === b.state &&
    a.transcript === b.transcript &&
    a.reply === b.reply &&
    a.errorMessage === b.errorMessage &&
    a.audioBlocked === b.audioBlocked &&
    a.slowHint === b.slowHint
  );
}

/**
 * Full-screen session UI — a Dialog in the `overlay` variant, so tap-outside,
 * Escape and the exit animation come from the library.
 *
 * Always mounted: it opens whenever a session is running. The last live
 * snapshot is kept so the exit animation shows what was on screen, not the
 * blank idle state the session has already returned to.
 */
export function VoiceAssistOverlay({
  snapshot,
  onDismiss,
}: {
  snapshot: VoiceSnapshot;
  onDismiss: () => void;
}) {
  const open = snapshot.state !== "idle";
  const [shown, setShown] = useState<View>(snapshot);
  if (open && !sameView(shown, snapshot)) setShown(snapshot);

  const { state, transcript, reply, errorMessage, audioBlocked, slowHint } =
    shown;
  const listening = state === "listening" || state === "transcribing";
  const status = STATUS[state] ?? "";
  const hint = SLOW_HINT[slowHint] ?? "";

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onDismiss();
      }}
      variant="overlay"
      motionPreset="scale"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content aria-label="Voice assistant">
            <Box
              position="relative"
              display="flex"
              alignItems="center"
              justifyContent="center"
              width="24vmin"
              height="24vmin"
            >
              {listening && <VoiceLevelRing />}
              {state === "thinking" && (
                <Spinner
                  position="absolute"
                  color="fg.faint"
                  borderWidth="0.3vmin"
                  animationDuration="1.4s"
                  css={{ "--spinner-size": "22vmin" }}
                />
              )}
              <Icon
                position="relative"
                boxSize="8vmin"
                color={state === "error" ? "fg.muted" : "fg.dim"}
              >
                {state === "done" ? <IoCheckmark /> : <IoMic />}
              </Icon>
            </Box>

            {status && (
              <Text fontSize="2.4vmin" color="fg.faint" letterSpacing="0.08em">
                {status}
              </Text>
            )}

            {transcript && (
              <Dialog.Title
                fontSize={reply ? "2.6vmin" : "4vmin"}
                fontWeight="300"
                color={reply ? "fg.muted" : "fg"}
              >
                {transcript}
              </Dialog.Title>
            )}

            {reply && (
              <Text fontSize="4.5vmin" fontWeight="300" color="fg">
                {reply}
              </Text>
            )}

            {errorMessage && (
              <>
                <Text fontSize="3.4vmin" fontWeight="300" color="fg.dim">
                  {errorMessage}
                </Text>
                <Text fontSize="2.2vmin" color="fg.faint">
                  Tap to try again
                </Text>
              </>
            )}

            {hint && state === "thinking" && (
              <Text fontSize="2.2vmin" color="fg.faint">
                {hint}
              </Text>
            )}

            {audioBlocked && reply && (
              <Text fontSize="2.2vmin" color="fg.faint">
                (couldn't speak that)
              </Text>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
