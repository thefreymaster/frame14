import { io } from "socket.io-client";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ?? window.location.origin;

export const socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 2000,
  // A WebSocket straight away — the handshake and the first subscribes in
  // one round trip — rather than long-polling first and upgrading a few
  // round trips later (a start-up cost on every launch, since 0.105).
  // Polling is still tried when the WebSocket can't connect.
  transports: ["websocket", "polling"],
  tryAllTransports: true,
});
