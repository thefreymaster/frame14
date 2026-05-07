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
