/**
 * Microphone capture for the assist pipeline.
 *
 * The AudioContext is deliberately constructed at 16 kHz so the browser's own
 * resampler converts the 44.1/48 kHz microphone stream down to what Home
 * Assistant's speech-to-text expects. The worklet then only has to clamp and
 * convert to signed 16-bit — no hand-rolled resampling, no aliasing bugs.
 */

export interface Recorder {
  stop(): void;
}

const WORKLET_URL = "/pcm-recorder-worklet.js";

type LevelListener = (rms: number) => void;
const levelListeners = new Set<LevelListener>();

/** Subscribe to the live input level. Returns an unsubscribe function. */
export function subscribeLevel(fn: LevelListener) {
  levelListeners.add(fn);
  return () => levelListeners.delete(fn);
}

function emitLevel(rms: number) {
  for (const fn of levelListeners) fn(rms);
}

/**
 * True when this browser can capture audio at all.
 *
 * `navigator.mediaDevices` is undefined outside a secure context, so this also
 * covers "the panel is being served over plain http".
 */
export function micAvailable(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

export type MicErrorCode = "denied" | "no-device" | "unsupported" | "failed";

export class MicError extends Error {
  readonly code: MicErrorCode;

  constructor(code: MicErrorCode, message: string) {
    super(message);
    this.name = "MicError";
    this.code = code;
  }
}

function classify(err: unknown): MicError {
  const name = (err as { name?: string })?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return new MicError("denied", "Microphone access is blocked");
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return new MicError("no-device", "No microphone found");
  }
  return new MicError("failed", (err as Error)?.message ?? "Microphone failed");
}

/**
 * Open the microphone and start streaming PCM chunks.
 *
 * Must be called synchronously from a user gesture — getUserMedia is the first
 * await, which keeps the activation alive and also unlocks audio playback for
 * the spoken reply later in the turn.
 */
export async function startRecording(opts: {
  onChunk: (pcm: ArrayBuffer) => void;
}): Promise<Recorder> {
  if (!micAvailable()) {
    throw new MicError("unsupported", "This display cannot capture audio");
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        // Let the browser do noise suppression and gain. Home Assistant's own
        // equivalents stay off — doubling up measurably hurts whisper.
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (err) {
    throw classify(err);
  }

  const ctx = new AudioContext({ sampleRate: 16000 });
  let node: AudioWorkletNode | null = null;

  function stop() {
    try {
      node?.disconnect();
      node?.port.close();
    } catch {
      /* already torn down */
    }
    for (const track of stream.getTracks()) track.stop();
    void ctx.close().catch(() => {});
    emitLevel(0);
  }

  try {
    // Resuming inside the gesture is what makes the reply audible later.
    await ctx.resume();
    await ctx.audioWorklet.addModule(WORKLET_URL);

    node = new AudioWorkletNode(ctx, "pcm-recorder");
    node.port.onmessage = (event: MessageEvent) => {
      const { pcm, rms } = event.data as { pcm: ArrayBuffer; rms: number };
      emitLevel(rms);
      opts.onChunk(pcm);
    };

    // Source -> worklet only. Never connect to ctx.destination, or the panel
    // echoes the microphone back through its own speaker.
    ctx.createMediaStreamSource(stream).connect(node);
  } catch (err) {
    stop();
    throw classify(err);
  }

  return { stop };
}
