import { useState } from "react";
import { Portal, Text, VStack } from "@chakra-ui/react";
import * as Modal from "./Modal";
import { VoiceOrb } from "./VoiceOrb";
import { NAV_BAR_CLEARANCE } from "../lib/navMetrics";
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

/**
 * The backdrop: the page's own colour, so the words read on it in either
 * mode. Where Modal allows a blur (`<html data-backdrop-blur>`: never on
 * Android — the frame's WebView lagged under a full-screen backdrop-filter)
 * the page is frosted well past the navs' 8px under a lighter wash; without
 * one, the wash alone, nearly opaque, keeps the page behind out of the way.
 */
const VOICE_FROST = "blur(16px) saturate(1.8)";
const BACKDROP = {
  bg: "bg/90",
  "[data-backdrop-blur] &": {
    bg: "bg/60",
    backdropFilter: VOICE_FROST,
    WebkitBackdropFilter: VOICE_FROST,
  },
} as const;

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
 * Surfaceless since 0.163.0 (the user: "way more sleek, use transparent
 * background", "Blur the background too"): no card, edge or shadow — the
 * orb (VoiceOrb) and the words float on the backdrop (BACKDROP).
 * In portrait the words stop above the bottom bar, which the backdrop no
 * longer hides. With no card to tap outside of, a tap on the content closes
 * it too (zag holds a modal's layer at `pointer-events: auto`, so it can't
 * let taps through): a tap anywhere closes it, as Escape does.
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
        <Modal.Backdrop css={BACKDROP} data-voice-backdrop />
        <Modal.Positioner>
          <Modal.Content
            bg="transparent"
            boxShadow="none"
            onClick={onDismiss}
            data-voice-overlay
          >
            <Modal.Body
              pt="12"
              pb={{ base: "12", _portrait: `calc(${NAV_BAR_CLEARANCE} + 2rem)` }}
            >
              <VStack
                gap="4"
                textAlign="center"
                maxW="36rem"
                mx="auto"
                textWrap="balance"
              >
                <VoiceOrb state={state} />

                {status && (
                  <Text
                    textStyle="xs"
                    fontWeight="semibold"
                    letterSpacing="widest"
                    textTransform="uppercase"
                    color="fg.muted"
                  >
                    {status}
                  </Text>
                )}

                {transcript && (
                  <Modal.Title
                    textStyle={replyShown ? "md" : "3xl"}
                    fontWeight="medium"
                    lineHeight="short"
                    color={replyShown ? "fg.muted" : "fg"}
                  >
                    “{transcript}”
                  </Modal.Title>
                )}

                {/* The reply is spoken (or a tone plays), not written out —
                    except when it couldn't be played, so it isn't lost. */}
                {replyShown && (
                  <Text textStyle="2xl" fontWeight="medium" lineHeight="short">
                    {reply}
                  </Text>
                )}

                {errorMessage && (
                  <>
                    <Text textStyle="xl" fontWeight="medium">
                      {errorMessage}
                    </Text>
                    <Text textStyle="sm" color="fg.muted">
                      Tap anywhere to close
                    </Text>
                  </>
                )}

                {hint && state === "thinking" && (
                  <Text textStyle="sm" color="fg.muted">
                    {hint}
                  </Text>
                )}

                {replyShown && (
                  <Text textStyle="sm" color="fg.subtle">
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
