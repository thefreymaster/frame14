import { socket } from "./socket";

export type ServiceName = "toggle" | "turn_on" | "turn_off";
export type HvacMode = "heat" | "cool" | "off" | "auto" | "fan_only";

/** How a call went: the server's ack (0.125), from Home Assistant's answer. */
export type CallResult = { ok: true } | { ok: false; error: string };

// How long to wait for the server's ack — it waits up to 10s on HA itself.
const CALL_TIMEOUT_MS = 12_000;

/**
 * A light, switch or fan service. Resolves with the server's ack (0.125):
 * ok once Home Assistant has run the call, or not ok with why — HA rejected
 * it, didn't answer, isn't connected, or the server never answered. It never
 * rejects, so a caller that doesn't care can ignore it.
 */
export function callService(
  entityId: string,
  service: ServiceName = "toggle",
): Promise<CallResult> {
  const domain = entityId.split(".")[0];
  if (domain !== "light" && domain !== "switch" && domain !== "fan")
    return Promise.resolve({ ok: false, error: "Not a light, switch or fan" });
  return new Promise((resolve) => {
    socket
      .timeout(CALL_TIMEOUT_MS)
      .emit(
        "entity:call",
        { domain, service, entity_id: entityId },
        (err: Error | null, result?: CallResult) => {
          if (err) resolve({ ok: false, error: "No answer from the server" });
          else resolve(result ?? { ok: true });
        },
      );
  });
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
  service: "set_fan_mode",
  params: { fan_mode: string },
): void;
export function callClimateService(
  entityId: string,
  service: "set_hvac_mode" | "set_temperature" | "set_fan_mode",
  params: { hvac_mode?: HvacMode; temperature?: number; fan_mode?: string },
) {
  socket.emit("entity:call", {
    domain: "climate",
    service,
    entity_id: entityId,
    ...params,
  });
}

/**
 * light.turn_on with a brightness and/or a colour — a white temperature or an
 * RGB colour, never both (Home Assistant rejects that). Turns the light on if
 * it is off.
 */
export function callLightService(
  entityId: string,
  params: {
    brightness_pct?: number;
    color_temp_kelvin?: number;
    rgb_color?: [number, number, number];
  },
) {
  socket.emit("entity:call", {
    domain: "light",
    service: "turn_on",
    entity_id: entityId,
    ...params,
  });
}

export function callFanService(
  entityId: string,
  service: "turn_on" | "turn_off" | "set_percentage",
  params?: { percentage?: number },
) {
  const payload: Record<string, unknown> = {
    domain: "fan",
    service,
    entity_id: entityId,
  };
  if (params?.percentage != null) payload.percentage = params.percentage;
  socket.emit("entity:call", payload);
}

/**
 * A vacuum's controls. The server takes these for the configured vacuums
 * only.
 */
export function callVacuumService(
  entityId: string,
  service: "start" | "pause" | "return_to_base" | "locate",
): void;
export function callVacuumService(
  entityId: string,
  service: "set_fan_speed",
  params: { fan_speed: string },
): void;
export function callVacuumService(
  entityId: string,
  service: string,
  params?: { fan_speed?: string },
) {
  socket.emit("entity:call", {
    domain: "vacuum",
    service,
    entity_id: entityId,
    ...params,
  });
}

export type MediaService =
  | "media_play"
  | "media_pause"
  | "media_play_pause"
  | "media_stop"
  | "media_next_track"
  | "media_previous_track"
  | "volume_up"
  | "volume_down"
  | "turn_on"
  | "turn_off";

/**
 * A media player's controls. The server takes these for the configured
 * media players only.
 */
export function callMediaService(entityId: string, service: MediaService): void;
export function callMediaService(
  entityId: string,
  service: "volume_set",
  params: { volume_level: number },
): void;
export function callMediaService(
  entityId: string,
  service: "volume_mute",
  params: { is_volume_muted: boolean },
): void;
export function callMediaService(
  entityId: string,
  service: "select_source",
  params: { source: string },
): void;
export function callMediaService(
  entityId: string,
  service: string,
  params?: { volume_level?: number; is_volume_muted?: boolean; source?: string },
) {
  socket.emit("entity:call", {
    domain: "media_player",
    service,
    entity_id: entityId,
    ...params,
  });
}

/**
 * Presses a button entity. The server takes the configured printer's pause,
 * resume and stop buttons only.
 */
export function pressButton(entityId: string) {
  socket.emit("entity:call", {
    domain: "button",
    service: "press",
    entity_id: entityId,
  });
}
