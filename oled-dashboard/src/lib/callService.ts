import { socket } from "./socket";

export type ServiceName = "toggle" | "turn_on" | "turn_off";

export function callService(entityId: string, service: ServiceName = "toggle") {
  const domain = entityId.split(".")[0];
  if (domain !== "light" && domain !== "switch") return;
  socket.emit("entity:call", { domain, service, entity_id: entityId });
}
