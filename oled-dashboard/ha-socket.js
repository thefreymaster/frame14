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
 */

import WebSocket from "ws";
import { HA_URL, HA_TOKEN } from "./config.js";

const MOTION_ENTITY = "binary_sensor.kitchen_motion_sensor_motion";
const ROUTE_ENTITY = "input_select.oledos_route";
const ALBUM_ENTITY = "input_select.smart_frame_album";
const RECONNECT_DELAY_MS = 5_000;

const GET_STATES_ID = 1;
const SUBSCRIBE_EVENTS_ID = 2;

const stateCache = new Map();

let haWs = null;
let nextMsgId = 3;

const ALLOWED_DOMAINS = new Set(["light", "switch"]);
const ALLOWED_SERVICES = new Set(["toggle", "turn_on", "turn_off"]);
const ENTITY_ID_RE = /^[a-z_]+\.[a-z0-9_]+$/;

export function getState(entityId) {
  return stateCache.get(entityId);
}

export function getAllStates() {
  return stateCache;
}

export function callService({ domain, service, entity_id }) {
  if (!haWs || haWs.readyState !== 1 /* WebSocket.OPEN */) return false;
  if (!ALLOWED_DOMAINS.has(domain)) return false;
  if (!ALLOWED_SERVICES.has(service)) return false;
  if (typeof entity_id !== "string" || !ENTITY_ID_RE.test(entity_id)) return false;
  if (!entity_id.startsWith(domain + ".")) return false;
  haWs.send(
    JSON.stringify({
      id: nextMsgId++,
      type: "call_service",
      domain,
      service,
      service_data: { entity_id },
    }),
  );
  return true;
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
      console.warn(
        `[ha-socket] disconnected, reconnecting in ${RECONNECT_DELAY_MS / 1000}s`,
      );
      setTimeout(connect, RECONNECT_DELAY_MS);
    });
  }

  connect();
}
