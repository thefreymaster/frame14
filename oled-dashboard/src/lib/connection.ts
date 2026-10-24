import { useSyncExternalStore } from "react";
import { socket } from "./socket";

/**
 * What the header's connection icon shows, from the socket's state over time:
 * "connecting" while the socket is down but still within its grace period
 * (from the app's start, or from the moment a connection dropped), then
 * "disconnected" once it has been down for DISCONNECTED_AFTER_MS. socket.io
 * keeps retrying throughout; this only decides what the UI says about it.
 */
export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export const DISCONNECTED_AFTER_MS = 60_000;

let status: ConnectionStatus = socket.connected ? "connected" : "connecting";
let everConnected = socket.connected;
let giveUp: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function set(next: ConnectionStatus) {
  if (status === next) return;
  status = next;
  listeners.forEach((fn) => fn());
}

function startGrace() {
  clearTimeout(giveUp);
  set("connecting");
  giveUp = setTimeout(() => set("disconnected"), DISCONNECTED_AFTER_MS);
}

socket.on("connect", () => {
  clearTimeout(giveUp);
  everConnected = true;
  set("connected");
});
socket.on("disconnect", startGrace);
if (!socket.connected) startGrace();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getConnectionStatus() {
  return status;
}

export function useConnectionStatus() {
  return useSyncExternalStore(subscribe, getConnectionStatus);
}

/** The status in words: a first connection is "Connecting…", one after a
 *  drop "Reconnecting…". */
export function connectionLabel(s: ConnectionStatus) {
  switch (s) {
    case "connected":
      return "Connected";
    case "disconnected":
      return "Disconnected";
    default:
      return everConnected ? "Reconnecting…" : "Connecting…";
  }
}
