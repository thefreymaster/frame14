import { useSyncExternalStore } from "react";
import { socket } from "./socket";

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
  applyLocal(v);
}

export function getNavVisible() {
  return visible;
}

export function toggleNavVisible() {
  setNavVisible(!visible);
}

export function useNavVisible() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

socket.on("nav_visibility", (v: boolean) => {
  if (typeof v !== "boolean") return;
  applyLocal(v);
});
