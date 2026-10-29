// ha-socket.js against the stub Home Assistant over a real WebSocket: the
// cache priming, the state fan-out, the service-call validation and its
// answers, the registry events, and the watchers that move the frames.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createStub, STUB } from "../stub/stub-ha.mjs";

const PORT = 8399;
const PLEX = "media_player.plex_plex_for_apple_tv_apple_tv";
const TV = "media_player.living_room_tv";

vi.mock("../../config.js", async (orig) => ({
  ...(await orig()),
  HA_URL: `http://127.0.0.1:${PORT}`,
  HA_TOKEN: "test-token",
}));
vi.mock("../../entities.js", () => ({
  ENTITIES: {
    lights: ["light.living_room"],
    lightAreas: [],
    climate: [],
    climateNames: {},
    energy: {},
    circuits: { main: "", balance: "", items: [] },
    vacuums: ["vacuum.roborock_q5_pro"],
    fans: [],
    mediaPlayer: PLEX,
    mediaPlayers: [TV],
    printer: `${STUB.printer}_print_status`,
    teamTracker: ["sensor.teamtracker_fsu"],
    person: "",
    camera: "",
    cameras: [],
  },
}));

/** Waits for `check` to come true. */
async function until(check, ms = 3000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("timed out waiting");
}

let stub;
let ha;
let io;
let rooms;
const onRegistryChanged = vi.fn();

beforeAll(async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  stub = await createStub({ port: PORT });
  ha = await import("../../ha-socket.js");
  rooms = new Map();
  io = {
    currentView: "home",
    emit: vi.fn(),
    to: vi.fn((room) => {
      if (!rooms.has(room)) rooms.set(room, { emit: vi.fn() });
      return rooms.get(room);
    }),
  };
  await new Promise((primed) => {
    ha.startHaSocket(io, { onPrimed: primed, onRegistryChanged });
  });
});

afterAll(async () => {
  await stub.close();
});

beforeEach(() => {
  io.emit.mockClear();
  io.currentView = "home";
  stub.setServiceBehaviour();
});

describe("the cache", () => {
  it("is primed from get_states and the socket is up", () => {
    expect(ha.isHaConnected()).toBe(true);
    expect(ha.getState("light.living_room").state).toBe("on");
    expect(ha.getAllStates().size).toBeGreaterThan(100);
  });

  it("follows state_changed and fans the state out to the entity's room", async () => {
    stub.setState("light.kitchen_main_lights", "on");
    await until(() => ha.getState("light.kitchen_main_lights")?.state === "on");
    expect(io.to).toHaveBeenCalledWith("entity:light.kitchen_main_lights");
    expect(rooms.get("entity:light.kitchen_main_lights").emit).toHaveBeenCalledWith(
      "light.kitchen_main_lights",
      expect.objectContaining({ state: "on" }),
    );
  });
});

describe("sendCommand", () => {
  it("resolves with the result", async () => {
    const areas = await ha.sendCommand("config/area_registry/list", {});
    expect(areas.map((a) => a.area_id)).toContain("living_room");
  });

  it("rejects when Home Assistant refuses, and when it takes too long", async () => {
    stub.setServiceBehaviour({ fail: { "light.living_room": "nope" } });
    await expect(
      ha.sendCommand("call_service", { domain: "light", service: "turn_on", service_data: { entity_id: "light.living_room" } }),
    ).rejects.toThrow("nope");
    stub.setServiceBehaviour({ delay_ms: 500 });
    await expect(
      ha.sendCommand("call_service", { domain: "light", service: "turn_on", service_data: { entity_id: "light.living_room" } }, 50),
    ).rejects.toThrow(/timed out/);
    await new Promise((r) => setTimeout(r, 600));
  });
});

describe("callService", () => {
  it("runs a light's turn_off and answers ok once Home Assistant has", async () => {
    const result = await ha.callService({ domain: "light", service: "turn_off", entity_id: "light.living_room" });
    expect(result).toEqual({ ok: true });
    await until(() => ha.getState("light.living_room").state === "off");
    stub.setState("light.living_room", "on");
  });

  it("passes a refusal on with Home Assistant's words", async () => {
    stub.setServiceBehaviour({ fail: { "light.living_room": "The bulb isn't answering" } });
    const result = await ha.callService({ domain: "light", service: "turn_off", entity_id: "light.living_room" });
    expect(result).toEqual({ ok: false, error: "The bulb isn't answering" });
  });

  it("refuses what the server doesn't pass on", () => {
    const refused = [
      { domain: "lock", service: "unlock", entity_id: "lock.front" },
      { domain: "light", service: "explode", entity_id: "light.x" },
      { domain: "light", service: "turn_on", entity_id: "switch.x" },
      { domain: "light", service: "turn_on", entity_id: "light.Bad Id" },
      { domain: "climate", service: "set_temperature", entity_id: "climate.x", temperature: 200 },
      { domain: "climate", service: "set_hvac_mode", entity_id: "climate.x", hvac_mode: "warp" },
      { domain: "light", service: "turn_on", entity_id: "light.x", color_temp_kelvin: 3000, rgb_color: [1, 2, 3] },
      { domain: "light", service: "turn_on", entity_id: "light.x", brightness_pct: 0 },
      { domain: "light", service: "turn_on", entity_id: "light.x", rgb_color: [1, 2] },
      { domain: "fan", service: "set_percentage", entity_id: "fan.x", percentage: 101 },
      { domain: "vacuum", service: "start", entity_id: "vacuum.other" },
      { domain: "vacuum", service: "explode", entity_id: "vacuum.roborock_q5_pro" },
      { domain: "button", service: "press", entity_id: "button.random" },
      { domain: "media_player", service: "volume_set", entity_id: TV, volume_level: 2 },
      { domain: "media_player", service: "select_source", entity_id: TV, source: "<script>" },
      { domain: "media_player", service: "media_play", entity_id: "media_player.other" },
      { domain: "media_player", service: "play_media", entity_id: TV, media_content_id: "http://evil/x.mp3", media_content_type: "music" },
    ];
    for (const call of refused) expect(ha.callService(call), JSON.stringify(call)).toBe(false);
  });

  it("takes the configured vacuum's, printer's and media players' controls", async () => {
    await expect(ha.callService({ domain: "vacuum", service: "pause", entity_id: "vacuum.roborock_q5_pro" })).resolves.toEqual({ ok: true });
    await until(() => ha.getState("vacuum.roborock_q5_pro").state === "paused");
    await expect(ha.callService({ domain: "vacuum", service: "set_fan_speed", entity_id: "vacuum.roborock_q5_pro", fan_speed: "max_plus" })).resolves.toEqual({ ok: true });
    await expect(ha.callService({ domain: "media_player", service: "volume_set", entity_id: TV, volume_level: 0.5 })).resolves.toEqual({ ok: true });
    await expect(ha.callService({ domain: "media_player", service: "select_source", entity_id: TV, source: "HDMI 1" })).resolves.toEqual({ ok: true });
    const { printerEntities } = await import("../../printer-entities.js");
    const [pause] = printerEntities().buttons;
    await expect(ha.callService({ domain: "button", service: "press", entity_id: pause })).resolves.toEqual({ ok: true });
    await until(() => ha.getState(`${STUB.printer}_print_status`).state === "pause");
  });

  it("rounds and ranges a light's brightness, warmth and colour", async () => {
    await expect(
      ha.callService({ domain: "light", service: "turn_on", entity_id: "light.lady_lamp", brightness_pct: 49.6, color_temp_kelvin: 2700.4 }),
    ).resolves.toEqual({ ok: true });
    await until(() => ha.getState("light.lady_lamp").state === "on");
    expect(ha.getState("light.lady_lamp").attributes).toMatchObject({ brightness: 128, color_temp_kelvin: 2700 });
  });

  it("climate: a mode, a temperature and a fan mode", async () => {
    await expect(ha.callService({ domain: "climate", service: "set_hvac_mode", entity_id: "climate.samsung_airconditioner_2", hvac_mode: "cool" })).resolves.toEqual({ ok: true });
    await expect(ha.callService({ domain: "climate", service: "set_temperature", entity_id: "climate.samsung_airconditioner_2", temperature: 71 })).resolves.toEqual({ ok: true });
    await expect(ha.callService({ domain: "climate", service: "set_fan_mode", entity_id: "climate.samsung_airconditioner_2", fan_mode: "high" })).resolves.toEqual({ ok: true });
    await until(() => ha.getState("climate.samsung_airconditioner_2").attributes.fan_mode === "high");
    expect(ha.getState("climate.samsung_airconditioner_2")).toMatchObject({ state: "cool", attributes: { temperature: 71 } });
  });
});

describe("the registries", () => {
  it("hands a registry event to the hook", async () => {
    stub.pushEvent("entity_registry_updated", { action: "update", entity_id: "light.lady_lamp" });
    await until(() => onRegistryChanged.mock.calls.length > 0);
    expect(onRegistryChanged).toHaveBeenCalledWith("entity_registry_updated");
  });
});

describe("the watchers", () => {
  it("a movie playing takes the frames to the marquee, an episode gives them back", async () => {
    stub.setState(PLEX, "playing", { media_content_type: "movie" });
    await until(() => io.currentView === "marquee");
    expect(io.emit).toHaveBeenCalledWith("change_view", "marquee");
    stub.setState(PLEX, "playing", { media_content_type: "tvshow" });
    await until(() => io.currentView === "home");
    stub.setState(PLEX, "idle", { media_content_type: null });
  });

  it("kickoff takes the frames to the game", async () => {
    stub.setState("sensor.teamtracker_fsu", "IN");
    await until(() => io.currentView === "football");
    expect(io.emit).toHaveBeenCalledWith("change_view", "football");
    stub.setState("sensor.teamtracker_fsu", "PRE");
  });

  it("a new album refreshes the slideshows", async () => {
    stub.setState("input_select.smart_frame_album", "another-album");
    await until(() => io.emit.mock.calls.some((c) => c[0] === "photos_refresh"));
  });

  it("kitchen motion restores the last route", async () => {
    stub.setState("input_select.oledos_route", "photos");
    stub.setState("binary_sensor.kitchen_motion_sensor_motion", "on");
    await until(() => io.currentView === "photos");
    stub.setState("binary_sensor.kitchen_motion_sensor_motion", "off");
  });
});

describe("the rest", () => {
  it("setLastRoute writes the route to Home Assistant", async () => {
    await ha.setLastRoute("clock");
    await until(() => stub.getState("input_select.oledos_route").state === "clock");
  });

  it("the transient views are never remembered", () => {
    expect([...ha.TRANSIENT_VIEWS].sort()).toEqual(["blank", "football", "marquee"]);
  });

  it("installUpdate, refreshEntity and reloadAddonStore go through the socket", async () => {
    expect(ha.installUpdate(STUB.addonUpdate)).toBe(true);
    expect(ha.installUpdate("light.x")).toBe(false);
    expect(ha.refreshEntity(STUB.addonUpdate)).toBe(true);
    expect(ha.refreshEntity("not an id")).toBe(false);
    await expect(ha.reloadAddonStore()).resolves.toEqual({});
  });
});
