/**
 * ha-motion.js
 *
 * Connects to the Home Assistant WebSocket API and watches
 * binary_sensor.kitchen_motion_sensor_motion. When motion is detected:
 *   0 min  → broadcast change_view: clock
 *   5 min  → broadcast change_view: photos
 *   10 min → broadcast change_view: blank
 *
 * When motion clears at any point, timers are cancelled and
 * change_view: blank is broadcast immediately.
 */

import WebSocket from "ws";
import { HA_URL, HA_TOKEN } from "./config.js";

const MOTION_ENTITY = "binary_sensor.kitchen_motion_sensor_motion";
const RECONNECT_DELAY_MS = 5_000;

export function startMotionWatcher(io) {
  if (!HA_TOKEN) {
    console.warn("[ha-motion] HA_TOKEN not set — motion watcher disabled");
    return;
  }

  let msgId = 1;
  let timers = [];

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function broadcast(view) {
    console.log(`[ha-motion] → change_view: ${view}`);
    io.currentView = view;
    io.emit("change_view", view);
  }

  function onMotionOn() {
    clearTimers();
    broadcast("home");
    timers.push(setTimeout(() => broadcast("photos"), 5 * 60 * 1000));
    timers.push(setTimeout(() => broadcast("blank"), 10 * 60 * 1000));
  }

  function onMotionOff() {
    clearTimers();
    broadcast("blank");
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
        // else if (state === "off") onMotionOff();
      }
    });

    ws.on("error", (err) => {
      console.error("[ha-motion] WebSocket error:", err.message);
    });

    ws.on("close", () => {
      console.warn(
        `[ha-motion] disconnected, reconnecting in ${RECONNECT_DELAY_MS / 1000}s`,
      );
      clearTimers();
      setTimeout(connect, RECONNECT_DELAY_MS);
    });
  }

  connect();
}
