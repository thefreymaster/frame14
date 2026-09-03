import { Router } from "express";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import {
  HA_URL,
  HA_TOKEN,
  ASSIST_PIPELINE_ID,
  ASSIST_SPEAKER,
} from "../config.js";
import {
  sendCommand,
  isHaConnected,
  startPipelineRun,
  sendAudioChunk,
  endAudioStream,
  cancelPipelineRun,
  forgetPipelineRun,
  callService,
} from "../ha-socket.js";

const router = Router();

/**
 * Voice assist: microphone in, spoken answer out.
 *
 * The browser captures 16 kHz mono PCM and streams it here over Socket.IO; this
 * module relays it to Home Assistant's assist_pipeline over the one HA
 * WebSocket, and relays the pipeline's events back. Speech recognition, the
 * language model and the voice are all Home Assistant's — nothing is done here
 * beyond transport, framing and the TTS proxy below.
 */

// One run at a time across every client: whisper, Ollama and Piper are all
// single-instance, so a second run would queue behind the first while its panel
// sat on a stuck "listening" UI.
let activeSession = null;

const RUN_HARD_TIMEOUT_MS = 150_000; // backstop; HA's own run timeout is 120s
const SPEECH_START_TIMEOUT_MS = 8_000; // no speech at all -> give up
const MAX_CHUNK_BYTES = 16_384;
const MAX_AUDIO_BYTES = 960_000; // 30s of 16kHz 16-bit mono
const MAX_PENDING_BYTES = 65_536; // audio buffered before run-start lands

// ── TTS proxy ───────────────────────────────────────────────────────────────
//
// tts-end hands back a path on Home Assistant. The panel is on its own https
// origin and HA is elsewhere, so a direct fetch would be blocked as mixed
// content. We proxy it — but the client never names a URL: it gets an opaque id
// minted here, exactly like marquee.js refuses to forward a client-supplied
// path with the HA bearer token attached.

const ttsStreams = new Map(); // id -> { url, expiresAt }
const TTS_TTL_MS = 120_000;
const TTS_PATH_RE = /^\/api\/tts_proxy\/[A-Za-z0-9_.\-]{1,128}$/;

function mintTtsId(url) {
  if (typeof url !== "string" || !TTS_PATH_RE.test(url)) return null;
  const id = randomUUID();
  ttsStreams.set(id, { url, expiresAt: Date.now() + TTS_TTL_MS });
  return id;
}

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of ttsStreams) {
    if (entry.expiresAt <= now) ttsStreams.delete(id);
  }
}, 60_000).unref();

router.get("/tts/:id", async (req, res) => {
  const entry = ttsStreams.get(req.params.id);
  if (!entry || entry.expiresAt <= Date.now()) {
    res.status(404).json({ error: "Unknown or expired audio id" });
    return;
  }

  try {
    // /api/tts_proxy/<token> does not require auth, but sending it is harmless
    // and keeps this consistent with every other HA fetch in the addon.
    const upstream = await fetch(`${HA_URL}${entry.url}`, {
      headers: { Authorization: `Bearer ${HA_TOKEN}` },
    });
    if (!upstream.ok || !upstream.body) {
      res.status(502).json({ error: `HA responded with ${upstream.status}` });
      return;
    }
    res.set("Content-Type", upstream.headers.get("content-type") ?? "audio/mpeg");
    res.set("Cache-Control", "no-store");
    // Stream rather than buffer: HA renders the audio lazily on this request, so
    // piping lets playback start before Piper has finished the sentence.
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (err) {
    console.error("[assist] TTS proxy error:", err.message);
    if (!res.headersSent) res.status(500).json({ error: "Failed to proxy TTS audio" });
  }
});

// ── Config ──────────────────────────────────────────────────────────────────
//
// Resolves the configured pipeline id to a name so a typo surfaces on /control
// instead of failing opaquely at the first tap.

let configCache = null;
let configCachedAt = 0;
const CONFIG_TTL_MS = 60_000;

async function resolveConfig() {
  if (configCache && Date.now() - configCachedAt < CONFIG_TTL_MS) return configCache;
  if (!HA_TOKEN || !isHaConnected()) return { enabled: false, error: "ha_unreachable" };

  try {
    const result = await sendCommand("assist_pipeline/pipeline/list", {}, 8_000);
    const pipelines = result?.pipelines ?? [];
    const wantedId = ASSIST_PIPELINE_ID || result?.preferred_pipeline;
    const match = pipelines.find((p) => p.id === wantedId);

    if (!match) {
      configCache = {
        enabled: false,
        error: "unknown_pipeline",
        configuredId: ASSIST_PIPELINE_ID,
        available: pipelines.map((p) => ({ id: p.id, name: p.name })),
      };
    } else {
      configCache = {
        enabled: true,
        pipelineId: match.id,
        name: match.name,
        language: match.language,
        sttEngine: match.stt_engine,
        ttsEngine: match.tts_engine,
        conversationEngine: match.conversation_engine,
        usingPreferred: !ASSIST_PIPELINE_ID,
        speaker: ASSIST_SPEAKER || null,
      };
    }
    configCachedAt = Date.now();
    return configCache;
  } catch (err) {
    console.error("[assist] pipeline list failed:", err.message);
    return { enabled: false, error: "ha_unreachable" };
  }
}

router.get("/config", async (_req, res) => {
  res.json(await resolveConfig());
});


// ── Session ─────────────────────────────────────────────────────────────────

function makeSession(socket) {
  const session = {
    socket,
    runId: null,
    handlerId: null,
    pending: [],
    pendingBytes: 0,
    bytesSent: 0,
    audioClosed: false,
    finished: false,
    hardTimer: null,
    speechTimer: null,
  };

  function clearTimers() {
    if (session.hardTimer) clearTimeout(session.hardTimer);
    if (session.speechTimer) clearTimeout(session.speechTimer);
    session.hardTimer = null;
    session.speechTimer = null;
  }

  function release() {
    if (session.finished) return;
    session.finished = true;
    clearTimers();
    if (activeSession === session) activeSession = null;
  }

  session.fail = (code, message) => {
    if (session.finished) return;
    if (session.runId != null) cancelPipelineRun(session.runId);
    release();
    socket.emit("assist:error", { code, message });
  };

  session.abort = () => {
    if (session.finished) return;
    if (session.runId != null) cancelPipelineRun(session.runId);
    release();
  };

  session.onEvent = (event) => {
    if (session.finished || !event) return;
    const { type, data } = event;

    if (type === "run-start") {
      session.handlerId = data?.runner_data?.stt_binary_handler_id ?? null;
      // The TTS stream is minted before the model runs, so the URL is usually
      // known here already.
      const earlyId = mintTtsId(data?.tts_output?.url);
      if (earlyId) session.ttsId = earlyId;
      flushPending();
      session.speechTimer = setTimeout(
        () => session.fail("no-speech", "No speech detected"),
        SPEECH_START_TIMEOUT_MS,
      );
    }

    if (type === "stt-vad-start" && session.speechTimer) {
      clearTimeout(session.speechTimer);
      session.speechTimer = null;
    }

    if (type === "intent-end") {
      // Carry the conversation forward so "turn it off" after "turn on the lamp"
      // resolves against the same context.
      const cid = data?.intent_output?.conversation_id;
      if (cid) socket.data.assistConversationId = cid;
    }

    let payload = data;
    if (type === "tts-end") {
      const url = data?.tts_output?.url;
      const id = mintTtsId(url) ?? session.ttsId ?? null;
      // Never hand the raw HA path or token to the browser.
      payload = { ...data, tts_output: { ...data?.tts_output, url: undefined, audioUrl: id ? `/api/assist/tts/${id}` : null } };
      if (id && ASSIST_SPEAKER) playOnSpeaker(url);
    }

    socket.emit("assist:event", { type, data: payload });

    if (type === "run-end") {
      if (session.runId != null) forgetPipelineRun(session.runId);
      release();
    }
  };

  function flushPending() {
    if (session.handlerId == null) return;
    for (const chunk of session.pending) sendAudioChunk(session.handlerId, chunk);
    session.pending = [];
    session.pendingBytes = 0;
    if (session.audioClosed) endAudioStream(session.handlerId);
  }

  session.pushAudio = (chunk) => {
    if (session.finished || session.audioClosed) return;
    session.bytesSent += chunk.length;
    if (session.bytesSent > MAX_AUDIO_BYTES) {
      session.closeAudio();
      return;
    }
    if (session.handlerId == null) {
      // run-start has not landed yet. Buffer rather than drop, so the opening
      // syllable of the sentence survives.
      if (session.pendingBytes + chunk.length > MAX_PENDING_BYTES) return;
      session.pending.push(chunk);
      session.pendingBytes += chunk.length;
      return;
    }
    sendAudioChunk(session.handlerId, chunk);
  };

  session.closeAudio = () => {
    if (session.finished || session.audioClosed) return;
    session.audioClosed = true;
    if (session.handlerId != null) endAudioStream(session.handlerId);
  };

  session.hardTimer = setTimeout(
    () => session.fail("timeout", "The assistant took too long to answer"),
    RUN_HARD_TIMEOUT_MS,
  );

  return session;
}

function playOnSpeaker(ttsUrl) {
  // Optional extra output. Best-effort: the panel has already been handed its
  // own copy, so a failure here must never break the turn.
  const ok = callService({
    domain: "media_player",
    service: "play_media",
    entity_id: ASSIST_SPEAKER,
    media_content_id: `${HA_URL}${ttsUrl}`,
    media_content_type: "music",
  });
  if (!ok) {
    console.warn(`[assist] could not play reply on ${ASSIST_SPEAKER}`);
  }
}

export function attachAssistSocket(socket) {
  socket.on("assist:start", async (payload, ack) => {
    const reply = typeof ack === "function" ? ack : () => {};

    // The panel decides when the conversation has gone stale.
    if (payload?.reset) socket.data.assistConversationId = null;

    if (activeSession) {
      reply({ ok: false, code: "busy" });
      return;
    }
    if (!HA_TOKEN || !isHaConnected()) {
      reply({ ok: false, code: "ha-disconnected" });
      return;
    }

    const config = await resolveConfig();
    if (!config.enabled) {
      reply({ ok: false, code: config.error ?? "unavailable" });
      return;
    }

    const session = makeSession(socket);
    activeSession = session;

    try {
      session.runId = startPipelineRun({
        pipelineId: ASSIST_PIPELINE_ID,
        conversationId: socket.data?.assistConversationId ?? null,
        onEvent: session.onEvent,
        onError: (err) => session.fail("run-rejected", err.message),
        onClose: (err) => session.fail("ha-disconnected", err.message),
      });
    } catch (err) {
      session.abort();
      reply({ ok: false, code: "ha-disconnected", message: err.message });
      return;
    }

    reply({ ok: true });
  });

  socket.on("assist:audio", (chunk) => {
    const session = activeSession;
    if (!session || session.socket !== socket) return;
    if (!Buffer.isBuffer(chunk) && !ArrayBuffer.isView(chunk)) return;
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    if (buf.length === 0 || buf.length > MAX_CHUNK_BYTES || buf.length % 2 !== 0) return;
    session.pushAudio(buf);
  });

  socket.on("assist:audio_end", () => {
    const session = activeSession;
    if (!session || session.socket !== socket) return;
    session.closeAudio();
  });

  socket.on("assist:cancel", () => {
    const session = activeSession;
    if (!session || session.socket !== socket) return;
    session.abort();
    socket.emit("assist:event", { type: "run-end", data: {} });
  });

  socket.on("disconnect", () => {
    if (activeSession?.socket === socket) activeSession.abort();
  });
}

export default router;
