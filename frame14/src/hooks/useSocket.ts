import { socket } from "../lib/socket";
import { useConnectionStatus } from "../lib/connection";

/** The socket and its status (lib/connection: connecting / connected /
 *  disconnected). */
export function useSocket() {
  const status = useConnectionStatus();
  return { socket, status, connected: status === "connected" };
}
