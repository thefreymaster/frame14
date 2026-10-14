import { useState } from "react";
import {
  Box,
  Dialog,
  Icon,
  Portal,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
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
 * Session UI — a stock Chakra Dialog, so tap-outside, Escape and the exit
 * animation come from the library.
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
      placement="center"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Body py="10">
              <VStack gap="4" textAlign="center">
                <Box
                  position="relative"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  boxSize="10rem"
                >
                  {listening && <VoiceLevelRing />}
                  {state === "thinking" && (
                    <Spinner
                      position="absolute"
                      size="xl"
                      color="colorPalette.solid"
                      css={{ "--spinner-size": "9rem" }}
                    />
                  )}
                  <Icon
                    position="relative"
                    boxSize="12"
                    color={state === "error" ? "fg.error" : "fg"}
                  >
                    {state === "done" ? <IoCheckmark /> : <IoMic />}
                  </Icon>
                </Box>

                {status && <Text color="fg.muted">{status}</Text>}

                {transcript && (
                  <Dialog.Title
                    textStyle={reply ? "md" : "2xl"}
                    fontWeight="normal"
                    color={reply ? "fg.muted" : "fg"}
                  >
                    {transcript}
                  </Dialog.Title>
                )}

                {reply && <Text textStyle="2xl">{reply}</Text>}

                {errorMessage && (
                  <>
                    <Text textStyle="xl">{errorMessage}</Text>
                    <Text textStyle="sm" color="fg.muted">
                      Tap outside to try again
                    </Text>
                  </>
                )}

                {hint && state === "thinking" && (
                  <Text textStyle="sm" color="fg.muted">
                    {hint}
                  </Text>
                )}

                {audioBlocked && reply && (
                  <Text textStyle="sm" color="fg.muted">
                    (couldn't speak that)
                  </Text>
                )}
              </VStack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
