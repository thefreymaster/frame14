import { socket } from "./socket";

export type ServiceName = "toggle" | "turn_on" | "turn_off";
export type HvacMode = "heat" | "cool" | "off" | "auto";

export function callService(entityId: string, service: ServiceName = "toggle") {
  const domain = entityId.split(".")[0];
  if (domain !== "light" && domain !== "switch") return;
  socket.emit("entity:call", { domain, service, entity_id: entityId });
}

export function callClimateService(
  entityId: string,
  service: "set_hvac_mode",
  params: { hvac_mode: HvacMode },
): void;
export function callClimateService(
  entityId: string,
  service: "set_temperature",
  params: { temperature: number },
): void;
export function callClimateService(
  entityId: string,
  service: "set_hvac_mode" | "set_temperature",
  params: { hvac_mode?: HvacMode; temperature?: number },
) {
  socket.emit("entity:call", {
    domain: "climate",
    service,
    entity_id: entityId,
    ...params,
  });
}
