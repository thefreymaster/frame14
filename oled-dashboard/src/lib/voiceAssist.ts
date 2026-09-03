/**
 * Voice assist session state.
 *
 * A module-level store in the same shape as navVisibility.ts / themeMode.ts:
 * the socket is the only writer, components subscribe. Deliberately not React
 * state for the audio level — that arrives ~16 times a second and is handled
 * separately in VoiceLevelRing.
 */

import { socket } from "./socket";
import { MicError, startRecording, type Recorder } from "./voiceRecorder";

export type VoiceState =
  | "idle"
  | "arming"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "error";

export type SlowHint = "none" | "still-thinking" | "waking-model";

export interface VoiceSnapshot {
  state: VoiceState;
  transcript: string;
  reply: string;
  errorMessage: string | null;
  audioUrl: string | null;
  audioBlocked: boolean;
  slowHint: SlowHint;
}

const IDLE: VoiceSnapshot = {
  state: "idle",
  transcript: "",
  reply: "",
  errorMessage: null,
  audioUrl: null,
  audioBlocked: false,
  slowHint: "none",
};

// How long the panel keeps talking into the same conversation. Long enough for
// a natural follow-up, short enough that a stranger's turn doesn't inherit it.
const CONVERSATION_TTL_MS = 5 * 60_000;
const MAX_RECORD_MS = 20_000;
const STILL_THINKING_MS = 6_000;
const WAKING_MODEL_MS = 20_000;
const DISMISS_AFTER_MS = 2_500;

let snapshot: VoiceSnapshot = IDLE;
const listeners = new Set<(s: VoiceSnapshot) => void>();

let recorder: Recorder | null = null;
let audioEl: HTMLAudioElement | null = null;
let timers: ReturnType<typeof setTimeout>[] = [];
let conversationExpiry = 0;

export function getVoiceSnapshot() {
  return snapshot;
}

export function subscribeVoice(fn: (s: VoiceSnapshot) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function set(patch: Partial<VoiceSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  for (const fn of listeners) fn(snapshot);
}

function clearTimers() {
  for (const t of timers) clearTimeout(t);
  timers = [];
}

function later(fn: () => void, ms: number) {
  timers.push(setTimeout(fn, ms));
}

function stopRecorder() {
  recorder?.stop();
  recorder = null;
}

function finish(delayMs = DISMISS_AFTER_MS) {
  clearTimers();
  stopRecorder();
  later(() => {
    if (snapshot.state !== "idle") set(IDLE);
  }, delayMs);
}

function fail(message: string) {
  clearTimers();
  stopRecorder();
  set({ state: "error", errorMessage: message, slowHint: "none" });
}

const ERROR_TEXT: Record<string, string> = {
  busy: "The display is already listening.",
  "ha-disconnected": "Lost the connection to Home Assistant.",
  "no-speech": "I didn't hear anything.",
  timeout: "The assistant took too long to answer.",
  unknown_pipeline: "The configured voice pipeline no longer exists.",
  ha_unreachable: "Home Assistant isn't reachable.",
  "run-rejected": "Home Assistant refused to start the voice pipeline.",
};

/**
 * Ollama's failure when its model directory goes unreadable is a bare client
 * error, not a Home Assistant one, so it arrives as opaque text. Name it, or the
 * panel just says "something went wrong" for a week.
 */
function describeError(code: string, message?: string): string {
  if (message && /model is required|status code: 400/i.test(message)) {
    return "The language model isn't responding. Check that Ollama can read its model files.";
  }
  return ERROR_TEXT[code] ?? message ?? "Something went wrong.";
}

function play(url: string) {
  if (!audioEl) audioEl = new Audio();
  audioEl.src = url;
  audioEl.onended = () => finish();
  void audioEl.play().catch(() => {
    // Autoplay should be permitted — the origin has microphone permission and
    // the turn began with a tap — but never lose the answer if it isn't.
    set({ audioBlocked: true });
    finish(6_000);
  });
}

function onEvent(event: { type: string; data?: Record<string, unknown> }) {
  const { type, data } = event;

  switch (type) {
    case "run-start":
      set({ state: "listening" });
      break;

    case "stt-vad-end":
      // Speech ended: close the mic immediately so the model isn't waiting on us.
      stopRecorder();
      socket.emit("assist:audio_end");
      set({ state: "transcribing" });
      break;

    case "stt-end": {
      const text = (data?.stt_output as { text?: string })?.text ?? "";
      set({ transcript: text });
      break;
    }

    case "intent-start":
      set({ state: "thinking" });
      later(() => {
        if (snapshot.state === "thinking") set({ slowHint: "still-thinking" });
      }, STILL_THINKING_MS);
      later(() => {
        if (snapshot.state === "thinking") set({ slowHint: "waking-model" });
      }, WAKING_MODEL_MS);
      break;

    case "intent-end": {
      const output = data?.intent_output as
        | { response?: { speech?: { plain?: { speech?: string } } } }
        | undefined;
      const speech = output?.response?.speech?.plain?.speech;
      if (speech) set({ reply: speech, slowHint: "none" });
      conversationExpiry = Date.now() + CONVERSATION_TTL_MS;
      break;
    }

    case "tts-end": {
      const url = (data?.tts_output as { audioUrl?: string })?.audioUrl ?? null;
      set({ state: "speaking", audioUrl: url, slowHint: "none" });
      if (url) play(url);
      else finish(6_000);
      break;
    }

    case "error": {
      const code = (data?.code as string) ?? "unknown";
      fail(describeError(code, data?.message as string));
      break;
    }

    case "run-end":
      // Terminal for the pipeline, but the reply may still be playing.
      clearTimers();
      stopRecorder();
      if (snapshot.state === "thinking" || snapshot.state === "arming") finish();
      break;
  }
}

let wired = false;
function wire() {
  if (wired) return;
  wired = true;
  socket.on("assist:event", onEvent);
  socket.on("assist:error", (payload: { code: string; message?: string }) => {
    fail(describeError(payload?.code ?? "unknown", payload?.message));
  });
}

export async function startVoiceTurn() {
  if (snapshot.state !== "idle" && snapshot.state !== "error") return;
  wire();
  clearTimers();
  set({ ...IDLE, state: "arming" });

  // getUserMedia first, while the tap is still the active user gesture.
  try {
    recorder = await startRecording({
      onChunk: (pcm) => socket.emit("assist:audio", pcm),
    });
  } catch (err) {
    const mic = err as MicError;
    fail(
      mic.code === "denied"
        ? "Microphone access is blocked. Allow it for this site in the browser's settings."
        : mic.code === "no-device"
          ? "No microphone found on this display."
          : "Could not open the microphone.",
    );
    return;
  }

  // The server holds the conversation id; the panel only decides when it has
  // gone stale, so a stranger's turn doesn't inherit the last one's context.
  const reset = Date.now() >= conversationExpiry;
  if (reset) conversationExpiry = 0;

  socket.emit("assist:start", { reset }, (ack: { ok: boolean; code?: string }) => {
    if (ack?.ok) return;
    stopRecorder();
    fail(describeError(ack?.code ?? "unknown"));
  });

  later(() => {
    if (snapshot.state === "listening") {
      stopRecorder();
      socket.emit("assist:audio_end");
      set({ state: "transcribing" });
    }
  }, MAX_RECORD_MS);
}

export function cancelVoiceTurn() {
  clearTimers();
  stopRecorder();
  if (audioEl) {
    audioEl.pause();
    audioEl.onended = null;
  }
  socket.emit("assist:cancel");
  set(IDLE);
}
