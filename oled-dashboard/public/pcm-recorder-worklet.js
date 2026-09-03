/**
 * Microphone capture for the assist pipeline.
 *
 * Home Assistant's speech-to-text wants 16 kHz mono signed 16-bit little-endian
 * PCM. The AudioContext is created with sampleRate 16000, so the browser's own
 * resampler has already done the hard part by the time audio reaches here — all
 * this does is batch, clamp and convert.
 *
 * Runs on the audio render thread, which is why the RMS is computed here too:
 * the level meter then costs the main thread nothing.
 */

// 1024 samples at 16 kHz is 64 ms — ~16 messages a second, 2 KB each.
const CHUNK_SAMPLES = 1024;

class PcmRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = new Float32Array(CHUNK_SAMPLES);
    this._n = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this._buf[this._n++] = channel[i];
      if (this._n === CHUNK_SAMPLES) this._flush();
    }
    return true;
  }

  _flush() {
    const bytes = new ArrayBuffer(CHUNK_SAMPLES * 2);
    const view = new DataView(bytes);
    let sumSquares = 0;

    for (let i = 0; i < CHUNK_SAMPLES; i++) {
      const f = Math.max(-1, Math.min(1, this._buf[i]));
      sumSquares += f * f;
      // Explicit little-endian rather than relying on host byte order.
      view.setInt16(i * 2, f < 0 ? f * 0x8000 : f * 0x7fff, true);
    }

    // Transfer the buffer so the audio thread does no copying and no GC work.
    this.port.postMessage(
      { pcm: bytes, rms: Math.sqrt(sumSquares / CHUNK_SAMPLES) },
      [bytes],
    );
    this._n = 0;
  }
}

registerProcessor("pcm-recorder", PcmRecorder);
