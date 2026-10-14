/**
 * The short tones that stand in for a spoken reply.
 *
 * Synthesised rather than shipped as files: two notes need no asset pipeline,
 * and they can't fail to load the way a fetched clip can. Autoplay is already
 * granted — every turn starts with a tap on the mic button.
 */

export type ReplyCue = "success" | "failure";

interface Note {
  freq: number;
  start: number;
  length: number;
}

// Rising for done, falling and lower for failed — readable without looking.
const TONES: Record<ReplyCue, { wave: OscillatorType; notes: Note[] }> = {
  success: {
    wave: "sine",
    notes: [
      { freq: 880, start: 0, length: 0.12 },
      { freq: 1320, start: 0.1, length: 0.22 },
    ],
  },
  failure: {
    wave: "triangle",
    notes: [
      { freq: 440, start: 0, length: 0.16 },
      { freq: 311, start: 0.15, length: 0.3 },
    ],
  },
};

const PEAK_GAIN = 0.22;
const ATTACK_S = 0.012;

let ctx: AudioContext | null = null;

/** Plays the cue; resolves when it has finished (or immediately if audio is unavailable). */
export async function playCue(cue: ReplyCue): Promise<void> {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") await ctx.resume();
  } catch {
    return;
  }

  const { wave, notes } = TONES[cue];
  const t0 = ctx.currentTime + 0.02;
  let end = t0;

  for (const { freq, start, length } of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;

    // Short attack and an exponential tail: no click at either edge.
    const at = t0 + start;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, at + ATTACK_S);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);

    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + length + 0.02);
    end = Math.max(end, at + length);
  }

  const waitMs = (end - ctx.currentTime) * 1000 + 30;
  await new Promise((resolve) => setTimeout(resolve, waitMs));
}
