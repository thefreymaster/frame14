/**
 * ha-socket.js
 *
 * One persistent WebSocket to Home Assistant that:
 *   1. Seeds a local state cache from `get_states`
 *   2. Subscribes to `state_changed` events and keeps the cache fresh
 *   3. Fans out updates over Socket.IO rooms keyed by entity_id
 *   4. Runs the motion-sensor + album watcher that used to live in ha-motion.js
 *
 * Public API:
 *   startHaSocket(io)       — open WS, begin processing events
 *   getState(entityId)      — latest HA state object for one entity (or undefined)
 *   getAllStates()          — full Map<entity_id, haState>
 *   sendCommand(type, ...)  — one-shot WS command, resolves on its result
 *   startPipelineRun(...)   — assist_pipeline/run subscription (streams events)
 *   sendAudioChunk/endAudioStream — binary mic audio for a running pipeline
 */

import WebSocket from "ws";
import { HA_URL, HA_TOKEN } from "./config.js";
import { ENTITIES } from "./entities.js";

const MOTION_ENTITY = "binary_sensor.kitchen_motion_sensor_motion";
const ROUTE_ENTITY = "input_select.oledos_route";
const ALBUM_ENTITY = "input_select.smart_frame_album";
const RECONNECT_DELAY_MS = 5_000;

// Plex marquee: route the frame to /marquee while something is playing.
const MEDIA_ENTITY = ENTITIES.mediaPlayer;
const MEDIA_PLAY_STATES = new Set(["playing"]);
const MEDIA_STOP_STATES = new Set([
  "idle", "unavailable", "off", "standby", "unknown",
]);
// The Apple TV flaps idle -> unavailable -> idle when the Plex client drops,
// so wait before giving up on playback and going back home.
const MEDIA_STOP_GRACE_MS = 10_000;

/**
 * Views that must never be persisted as the "last route".
 *
 * setLastRoute() writes ROUTE_ENTITY, which the motion watcher reads back on
 * wake. Persisting a transient view would strand the frame there long after the
 * reason for showing it is gone.
 */
export const TRANSIENT_VIEWS = new Set(["blank", "marquee"]);

const GET_STATES_ID = 1;
const SUBSCRIBE_EVENTS_ID = 2;

const stateCache = new Map();
const pendingResults = new Map(); // id -> { resolve, reject }
// Assist pipeline runs are subscriptions, not one-shot commands: HA ACKs with a
// single `result` and then streams `event` messages on the same id until the run
// ends. pendingResults cannot model that (it resolves and deletes on the first
// result), so streaming runs live here instead.
const pendingSubscriptions = new Map(); // id -> { onEvent, onError, onClose }

let haWs = null;
let nextMsgId = 3;

const ALLOWED_DOMAINS = new Set(["light", "switch", "climate", "fan", "media_player"]);
const ALLOWED_SERVICES = new Set([
  "toggle", "turn_on", "turn_off",
  "set_hvac_mode", "set_temperature", "set_fan_mode",
  "set_percentage",
  // Only for playing an assist reply on a configured speaker. The media id is
  // built server-side from HA's own TTS path, never taken from the browser.
  "play_media",
]);
const MEDIA_CONTENT_TYPES = new Set(["music", "audio/mpeg"]);
const ALLOWED_HVAC_MODES = new Set(["heat", "cool", "off", "auto", "heat_cool", "fan_only", "dry"]);
const ENTITY_ID_RE = /^[a-z_]+\.[a-z0-9_]+$/;
// Fan mode names vary per device ("auto", "Low", "wind free"), so validate shape not value.
const FAN_MODE_RE = /^[A-Za-z0-9 _-]{1,32}$/;

export function getState(entityId) {
  return stateCache.get(entityId);
}

export function getAllStates() {
  return stateCache;
}

export function callService({ domain, service, entity_id, hvac_mode, temperature, fan_mode, percentage, media_content_id, media_content_type }) {
  if (!haWs || haWs.readyState !== 1 /* WebSocket.OPEN */) return false;
  if (!ALLOWED_DOMAINS.has(domain)) return false;
  if (!ALLOWED_SERVICES.has(service)) return false;
  if (typeof entity_id !== "string" || !ENTITY_ID_RE.test(entity_id)) return false;
  if (!entity_id.startsWith(domain + ".")) return false;

  const service_data = { entity_id };

  if (service === "set_hvac_mode") {
    if (typeof hvac_mode !== "string" || !ALLOWED_HVAC_MODES.has(hvac_mode)) return false;
    service_data.hvac_mode = hvac_mode;
  }

  if (service === "set_temperature") {
    const temp = Number(temperature);
    if (!Number.isFinite(temp) || temp < 40 || temp > 95) return false;
    service_data.temperature = temp;
  }

  if (service === "set_fan_mode") {
    if (typeof fan_mode !== "string" || !FAN_MODE_RE.test(fan_mode)) return false;
    service_data.fan_mode = fan_mode;
  }

  if (service === "set_percentage") {
    const pct = Number(percentage);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return false;
    service_data.percentage = Math.round(pct);
  }

  if (service === "play_media") {
    if (domain !== "media_player") return false;
    if (typeof media_content_id !== "string") return false;
    // Must be a TTS path on our own HA — never an arbitrary URL. Without this
    // the speaker option would be an open redirect for anything that can reach
    // the socket.
    if (!media_content_id.startsWith(`${HA_URL}/api/tts_proxy/`)) return false;
    if (!MEDIA_CONTENT_TYPES.has(media_content_type)) return false;
    service_data.media_content_id = media_content_id;
    service_data.media_content_type = media_content_type;
  }

  // fan.turn_on accepts optional percentage
  if (domain === "fan" && service === "turn_on" && percentage != null) {
    const pct = Number(percentage);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return false;
    service_data.percentage = Math.round(pct);
  }

  haWs.send(
    JSON.stringify({
      id: nextMsgId++,
      type: "call_service",
      domain,
      service,
      service_data,
    }),
  );
  return true;
}

export function sendCommand(type, payload, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    if (!haWs || haWs.readyState !== 1) {
      reject(new Error("HA WebSocket not connected"));
      return;
    }
    const id = nextMsgId++;
    const timer = setTimeout(() => {
      pendingResults.delete(id);
      reject(new Error(`HA WebSocket command timed out (id=${id}, type=${type})`));
    }, timeoutMs);
    pendingResults.set(id, {
      resolve: (r) => { clearTimeout(timer); resolve(r); },
      reject: (e) => { clearTimeout(timer); reject(e); },
    });
    haWs.send(JSON.stringify({ id, type, ...payload }));
  });
}

export function isHaConnected() {
  return !!haWs && haWs.readyState === 1;
}

/**
 * Start an `assist_pipeline/run` subscription.
 *
 * Returns the HA message id, which doubles as the run id: binary audio frames
 * are addressed by the handler id from the `run-start` event, but cancellation
 * and bookkeeping use this.
 *
 * `onEvent` receives the raw `{ type, data, timestamp }` pipeline event.
 * `onError` fires if HA rejects the run outright; `onClose` if the socket drops
 * mid-run. Exactly one of the three terminal paths runs: caller must treat
 * `run-end` (via onEvent), onError and onClose as mutually exclusive.
 */
export function startPipelineRun({
  pipelineId = "",
  conversationId = null,
  timeoutSec = 120,
  onEvent,
  onError,
  onClose,
}) {
  if (!haWs || haWs.readyState !== 1) {
    throw new Error("HA WebSocket not connected");
  }

  const id = nextMsgId++;
  const msg = {
    id,
    type: "assist_pipeline/run",
    start_stage: "stt",
    end_stage: "tts",
    timeout: timeoutSec,
    input: { sample_rate: 16_000 },
  };
  // Omitting `pipeline` makes HA use the preferred pipeline, which is what we
  // want when the addon option is left blank.
  if (pipelineId) msg.pipeline = pipelineId;
  if (conversationId) msg.conversation_id = conversationId;

  pendingSubscriptions.set(id, { onEvent, onError, onClose });
  haWs.send(JSON.stringify(msg));
  return id;
}

/**
 * Send one chunk of microphone audio.
 *
 * Wire format is a binary frame whose first byte is the handler id from
 * `run-start`, followed by raw 16 kHz mono signed-16-bit-LE PCM.
 */
export function sendAudioChunk(handlerId, pcm) {
  if (!haWs || haWs.readyState !== 1) return false;
  if (!Number.isInteger(handlerId) || handlerId < 1 || handlerId > 255) return false;

  // Socket.IO hands binary over as a Buffer, but be tolerant of ArrayBuffer and
  // typed arrays so callers don't have to care.
  const src = Buffer.isBuffer(pcm)
    ? pcm
    : ArrayBuffer.isView(pcm)
      ? Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength)
      : Buffer.from(pcm);
  if (src.length === 0) return false;

  const frame = Buffer.allocUnsafe(src.length + 1);
  frame[0] = handlerId;
  src.copy(frame, 1);
  haWs.send(frame, { binary: true });
  return true;
}

/**
 * Signal end-of-speech: a frame carrying the handler id and nothing else.
 * HA's consumer loop stops on the resulting empty payload.
 */
export function endAudioStream(handlerId) {
  if (!haWs || haWs.readyState !== 1) return false;
  if (!Number.isInteger(handlerId) || handlerId < 1 || handlerId > 255) return false;
  haWs.send(Buffer.from([handlerId]), { binary: true });
  return true;
}

/** Cancel a run and forget it. Safe to call twice, or after the run ended. */
export function cancelPipelineRun(runId) {
  if (!pendingSubscriptions.delete(runId)) return;
  if (!haWs || haWs.readyState !== 1) return;
  haWs.send(
    JSON.stringify({
      id: nextMsgId++,
      type: "unsubscribe_events",
      subscription: runId,
    }),
  );
}

/** Drop a finished run without sending an unsubscribe. */
export function forgetPipelineRun(runId) {
  pendingSubscriptions.delete(runId);
}

async function getLastRoute() {
  try {
    const res = await fetch(`${HA_URL}/api/states/${ROUTE_ENTITY}`, {
      headers: { Authorization: `Bearer ${HA_TOKEN}` },
    });
    if (!res.ok) {
      console.error(`[ha-socket] failed to get ${ROUTE_ENTITY}: ${res.status}`);
      return "home";
    }
    const data = await res.json();
    return data.state || "home";
  } catch (err) {
    console.error("[ha-socket] getLastRoute network error:", err.message);
    return "home";
  }
}

export async function setLastRoute(route) {
  if (!HA_TOKEN) return;
  try {
    const res = await fetch(
      `${HA_URL}/api/services/input_select/select_option`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HA_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity_id: ROUTE_ENTITY,
          option: route,
        }),
      },
    );
    if (!res.ok) {
      console.error(`[ha-socket] failed to set ${ROUTE_ENTITY}: ${res.status}`);
    }
  } catch (err) {
    console.error(`[ha-socket] error setting ${ROUTE_ENTITY}:`, err.message);
  }
}

export function startHaSocket(io) {
  if (!HA_TOKEN) {
    console.warn("[ha-socket] HA_TOKEN not set — HA socket disabled");
    return;
  }

  function broadcastView(view) {
    console.log(`[ha-socket] → change_view: ${view}`);
    io.currentView = view;
    io.emit("change_view", view);
  }

  async function onMotionOn() {
    const lastRoute = await getLastRoute();
    console.log(`[ha-socket] motion detected, restoring route: ${lastRoute}`);
    broadcastView(lastRoute);
  }

  let mediaStopTimer = null;

  function clearMediaStopTimer() {
    if (mediaStopTimer) {
      clearTimeout(mediaStopTimer);
      mediaStopTimer = null;
    }
  }

  function onMediaState(state) {
    if (MEDIA_PLAY_STATES.has(state)) {
      clearMediaStopTimer();
      if (io.currentView !== "marquee") {
        console.log(`[ha-socket] media playing (${state}) → marquee`);
        broadcastView("marquee");
      }
      return;
    }

    // Paused keeps the marquee up — only a real stop sends the frame home.
    if (state === "paused") {
      clearMediaStopTimer();
      return;
    }

    if (MEDIA_STOP_STATES.has(state) && io.currentView === "marquee") {
      clearMediaStopTimer();
      mediaStopTimer = setTimeout(() => {
        mediaStopTimer = null;
        // Re-check: the frame may have been navigated away in the meantime.
        if (io.currentView !== "marquee") return;
        console.log(`[ha-socket] media stopped (${state}) → home`);
        broadcastView("home");
      }, MEDIA_STOP_GRACE_MS);
    }
  }

  // Dispatch cache updates to Socket.IO rooms + run local side effects.
  function publishState(entityId, newState, prevState) {
    if (!newState) return;
    stateCache.set(entityId, newState);
    io.to(`entity:${entityId}`).emit(entityId, newState);

    if (entityId === MOTION_ENTITY && newState.state === "on") {
      onMotionOn().catch((err) =>
        console.error("[ha-socket] onMotionOn error:", err.message),
      );
      return;
    }

    if (MEDIA_ENTITY && entityId === MEDIA_ENTITY) {
      const prev = prevState?.state;
      const next = newState.state;
      if (prev !== next) onMediaState(next);
      return;
    }

    if (entityId === ALBUM_ENTITY) {
      const prev = prevState?.state;
      const next = newState.state;
      if (prev !== next) {
        console.log(`[ha-socket] album changed: ${prev} → ${next}`);
        io.emit("photos_refresh");
      }
    }
  }

  function connect() {
    const wsUrl = HA_URL.replace(/^http/, "ws") + "/api/websocket";
    console.log(`[ha-socket] connecting to ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    haWs = ws;

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }

      if (msg.type === "auth_required") {
        ws.send(JSON.stringify({ type: "auth", access_token: HA_TOKEN }));
        return;
      }

      if (msg.type === "auth_invalid") {
        console.error("[ha-socket] auth failed — check HA_TOKEN");
        ws.close();
        return;
      }

      if (msg.type === "auth_ok") {
        console.log("[ha-socket] authenticated, priming cache + subscribing");
        ws.send(JSON.stringify({ id: GET_STATES_ID, type: "get_states" }));
        ws.send(
          JSON.stringify({
            id: SUBSCRIBE_EVENTS_ID,
            type: "subscribe_events",
            event_type: "state_changed",
          }),
        );
        return;
      }

      if (msg.type === "result" && msg.id === GET_STATES_ID) {
        if (!msg.success || !Array.isArray(msg.result)) {
          console.error("[ha-socket] get_states failed:", msg.error);
          return;
        }
        for (const entity of msg.result) {
          if (entity?.entity_id) {
            stateCache.set(entity.entity_id, entity);
            io.to(`entity:${entity.entity_id}`).emit(entity.entity_id, entity);
          }
        }
        console.log(
          `[ha-socket] cache primed with ${stateCache.size} entities`,
        );
        return;
      }

      // Pipeline subscriptions must be checked before the generic branches: the
      // `result` here is only an ACK (deleting the entry would orphan the run),
      // and the event branch below drops anything without an entity_id, which is
      // every pipeline event.
      if (msg.type === "result" && pendingSubscriptions.has(msg.id)) {
        if (!msg.success) {
          const sub = pendingSubscriptions.get(msg.id);
          pendingSubscriptions.delete(msg.id);
          sub.onError(
            new Error(msg.error?.message ?? "assist pipeline run rejected"),
          );
        }
        return;
      }

      if (msg.type === "event" && pendingSubscriptions.has(msg.id)) {
        pendingSubscriptions.get(msg.id).onEvent(msg.event);
        return;
      }

      if (msg.type === "result" && pendingResults.has(msg.id)) {
        const { resolve, reject } = pendingResults.get(msg.id);
        pendingResults.delete(msg.id);
        if (msg.success) resolve(msg.result);
        else reject(new Error(msg.error?.message ?? "HA WebSocket command failed"));
        return;
      }

      if (msg.type === "event") {
        const data = msg.event?.data;
        if (!data?.entity_id) return;
        publishState(data.entity_id, data.new_state, data.old_state);
        return;
      }

      if (msg.type === "result" && msg.success === false) {
        console.warn(
          `[ha-socket] call failed (id=${msg.id}):`,
          msg.error?.message ?? msg.error,
        );
      }
    });

    ws.on("error", (err) => {
      console.error("[ha-socket] WebSocket error:", err.message);
    });

    ws.on("close", () => {
      if (haWs === ws) haWs = null;

      // A run in flight can never complete now — haWs is gone and the handler id
      // died with the connection. Fail them loudly instead of leaving the panel
      // spinning until its own timeout.
      for (const [, sub] of pendingSubscriptions) {
        try {
          sub.onClose(new Error("HA WebSocket disconnected"));
        } catch (err) {
          console.error("[ha-socket] subscription close handler threw:", err.message);
        }
      }
      pendingSubscriptions.clear();
      console.warn(
        `[ha-socket] disconnected, reconnecting in ${RECONNECT_DELAY_MS / 1000}s`,
      );
      setTimeout(connect, RECONNECT_DELAY_MS);
    });
  }

  connect();
}
