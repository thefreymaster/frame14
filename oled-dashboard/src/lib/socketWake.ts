import { socket } from "./socket";

/**
 * The socket after the page comes back (0.139, the user: the app "sometimes
 * fails to reconnect and just says connecting when the app has been in the
 * background"). A phone freezes a background page — its timers, its network —
 * and socket.io's reconnection waits out a backoff that was frozen with
 * them, or holds a connection the OS cut while asleep as connected until the
 * ping times out, most of a minute later. So when the page is visible again
 * (visibilitychange, pageshow — the back-forward cache — and the network
 * coming back): not connected, a fresh connection now, the stale attempt
 * dropped; connected, an `echo` to the server, and a fresh connection if no
 * answer comes in ECHO_TIMEOUT_MS.
 */
export const ECHO_TIMEOUT_MS = 3_000;

/** What is needed of the socket — the real one, or a test's stand-in. */
type Wakeable = {
  connected: boolean;
  connect(): unknown;
  disconnect(): unknown;
  timeout(ms: number): {
    emit(event: "echo", ack: (err: Error | null) => void): unknown;
  };
};

/** A fresh connection: the stale socket closed, a new one opened. */
function reconnect(s: Wakeable) {
  s.disconnect();
  s.connect();
}

/** The check a return to the page makes. */
export function wakeSocket(s: Wakeable = socket) {
  if (!s.connected) {
    reconnect(s);
    return;
  }
  s.timeout(ECHO_TIMEOUT_MS).emit("echo", (err: Error | null) => {
    if (err) reconnect(s);
  });
}

/** Listens for the page's returns; the handler is returned for a test to call. */
export function installSocketWake(
  s: Wakeable = socket,
  doc: Pick<Document, "addEventListener" | "visibilityState"> = document,
  win: Pick<Window, "addEventListener"> = window,
) {
  const onReturn = () => {
    if (doc.visibilityState === "visible") wakeSocket(s);
  };
  doc.addEventListener("visibilitychange", onReturn);
  win.addEventListener("pageshow", onReturn);
  win.addEventListener("online", onReturn);
  return onReturn;
}

if (typeof document !== "undefined" && !import.meta.env.VITEST)
  installSocketWake();
