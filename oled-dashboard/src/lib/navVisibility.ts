import { useSyncExternalStore } from "react";
import { getDeviceMode, useDeviceMode } from "./deviceMode";
import { socket } from "./socket";

// Shown or hidden is the frames' setting, synced over the socket to every
// device. Only frame-mode devices act on it: a remote (device mode
// "controller") keeps its nav up whatever the frames are doing, and still
// shows and changes the setting from /control.

let visible = true;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  return visible;
}

function applyLocal(v: boolean) {
  if (visible === v) return;
  visible = v;
  listeners.forEach((cb) => cb());
}

export function setNavVisible(v: boolean) {
  applyLocal(v);
  socket.emit("nav_visibility", v);
}

/**
 * Hide/show the nav on this device only.
 *
 * Used by routes that auto-hide the nav on mount: broadcasting that would blank
 * the nav on the phone remote too, which nobody asked for. The eye button still
 * uses setNavVisible so a deliberate press syncs everywhere.
 */
export function setNavVisibleLocal(v: boolean) {
  // A remote's nav never hides, and its copy of the frames' setting stays true
  // to the frames.
  if (getDeviceMode() === "controller") return;
  applyLocal(v);
}

export function getNavVisible() {
  return visible;
}

export function toggleNavVisible() {
  setNavVisible(!visible);
}

/** The frames' setting, for the switch that changes it. */
export function useFramesNavVisible() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Whether this device's nav is up: always, on a remote. */
export function useNavVisible() {
  const framesVisible = useFramesNavVisible();
  return useDeviceMode() === "controller" || framesVisible;
}

socket.on("nav_visibility", (v: boolean) => {
  if (typeof v !== "boolean") return;
  applyLocal(v);
});
