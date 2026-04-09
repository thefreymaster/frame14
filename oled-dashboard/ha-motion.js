/**
 * ha-motion.js
 *
 * Connects to the Home Assistant WebSocket API and watches
 * binary_sensor.kitchen_motion_sensor_motion.
 *
 * Motion detected → restore last used route from input_select.oledos_route
 * 5 min no motion → broadcast change_view: blank
 */

import WebSocket from "ws";
import { HA_URL, HA_TOKEN } from "./config.js";

const MOTION_ENTITY = "binary_sensor.kitchen_motion_sensor_motion";
const ROUTE_ENTITY = "input_select.oledos_route";
const BLANK_TIMEOUT_MS = 5 * 60 * 1000;
const RECONNECT_DELAY_MS = 5_000;

/**
 * Fetch the current value of input_select.oledos_route from HA REST API.
 */
async function getLastRoute() {
  const res = await fetch(`${HA_URL}/api/states/${ROUTE_ENTITY}`, {
    headers: { Authorization: `Bearer ${HA_TOKEN}` },
  });
  if (!res.ok) {
    console.error(`[ha-motion] failed to get ${ROUTE_ENTITY}: ${res.status}`);
    return "home";
  }
  const data = await res.json();
  return data.state || "home";
}

/**
 * Set input_select.oledos_route in HA. Called when the view changes
 * from /control or the REST API (but not for /blank).
 */
export async function setLastRoute(route) {
  if (!HA_TOKEN) return;
  try {
    const res = await fetch(`${HA_URL}/api/services/input_select/select_option`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HA_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entity_id: ROUTE_ENTITY,
        option: route,
      }),
    });
    if (!res.ok) {
      console.error(`[ha-motion] failed to set ${ROUTE_ENTITY}: ${res.status}`);
    }
  } catch (err) {
    console.error(`[ha-motion] error setting ${ROUTE_ENTITY}:`, err.message);
  }
}

export function startMotionWatcher(io) {
  if (!HA_TOKEN) {
    console.warn("[ha-motion] HA_TOKEN not set — motion watcher disabled");
    return;
  }

  let msgId = 1;
  let blankTimer = null;

  function clearBlankTimer() {
    if (blankTimer) {
      clearTimeout(blankTimer);
      blankTimer = null;
    }
  }

  function broadcast(view) {
    console.log(`[ha-motion] → change_view: ${view}`);
    io.currentView = view;
    io.emit("change_view", view);
  }

  function startBlankTimer() {
    clearBlankTimer();
    blankTimer = setTimeout(() => broadcast("blank"), BLANK_TIMEOUT_MS);
  }

  async function onMotionOn() {
    clearBlankTimer();
    const lastRoute = await getLastRoute();
    console.log(`[ha-motion] motion detected, restoring route: ${lastRoute}`);
    broadcast(lastRoute);
    startBlankTimer();
  }

  function connect() {
    const wsUrl = HA_URL.replace(/^http/, "ws") + "/api/websocket";
    console.log(`[ha-motion] connecting to ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

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

      if (msg.type === "auth_ok") {
        console.log("[ha-motion] authenticated, subscribing to state_changed");
        ws.send(
          JSON.stringify({
            id: msgId++,
            type: "subscribe_events",
            event_type: "state_changed",
          }),
        );
        return;
      }

      if (msg.type === "auth_invalid") {
        console.error("[ha-motion] auth failed — check HA_TOKEN");
        ws.close();
        return;
      }

      if (msg.type === "event") {
        const data = msg.event?.data;
        if (data?.entity_id !== MOTION_ENTITY) return;

        const state = data.new_state?.state;
        if (state === "on") onMotionOn();
      }
    });

    ws.on("error", (err) => {
      console.error("[ha-motion] WebSocket error:", err.message);
    });

    ws.on("close", () => {
      console.warn(
        `[ha-motion] disconnected, reconnecting in ${RECONNECT_DELAY_MS / 1000}s`,
      );
      clearBlankTimer();
      setTimeout(connect, RECONNECT_DELAY_MS);
    });
  }

  connect();
}
