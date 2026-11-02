import { useState } from "react";
import {
  Box,
  Icon,
  Portal,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { IoCheckmark, IoMic } from "react-icons/io5";
import * as Modal from "./Modal";
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
 * Session UI — a Modal (a stock Chakra Dialog; a drawer from the bottom on a
 * phone, 0.134), so tap-outside, Escape and the exit animation come from the
 * library.
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
  const replyShown = Boolean(reply) && audioBlocked;

  return (
    <Modal.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onDismiss();
      }}
      placement="center"
    >
      <Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.Content>
            <Modal.Body py="10">
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
                  <Modal.Title
                    textStyle={replyShown ? "md" : "2xl"}
                    fontWeight="normal"
                    color={replyShown ? "fg.muted" : "fg"}
                  >
                    {transcript}
                  </Modal.Title>
                )}

                {/* The reply is spoken (or a tone plays), not written out —
                    except when it couldn't be played, so it isn't lost. */}
                {replyShown && <Text textStyle="2xl">{reply}</Text>}

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

                {replyShown && (
                  <Text textStyle="sm" color="fg.muted">
                    (couldn't speak that)
                  </Text>
                )}
              </VStack>
            </Modal.Body>
          </Modal.Content>
        </Modal.Positioner>
      </Portal>
    </Modal.Root>
  );
}
