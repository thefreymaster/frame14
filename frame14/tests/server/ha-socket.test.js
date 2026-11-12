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
    lights: ["light.living_room", "switch.ihome_smartplug_05b4df_outlet"],
    lightAreas: [],
    climate: ["climate.samsung_airconditioner_2"],
    climateNames: {},
    energy: {},
    circuits: { main: "", balance: "", items: [] },
    vacuums: ["vacuum.roborock_q5_pro"],
    fans: ["fan.living_room_ceiling_fan"],
    mediaPlayer: PLEX,
    printer: `${STUB.printer}_print_status`,
    teamTracker: ["sensor.teamtracker_fsu"],
    person: "",
    camera: "",
    cameras: [],
    // The house's helpers, options since 0.145.0.
    motion: "binary_sensor.kitchen_motion_sensor_motion",
    route: "input_select.oledos_route",
    // The Lights page's scenes (0.165.0): the stub has a script and another
    // automation too, which this doesn't list.
    scenes: [STUB.scenes.movie, STUB.scenes.reading],
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
const onNotify = vi.fn();

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
    // The pages' lights, as index.js hands them over from ha-areas.js: the
    // configured ones and a room's (the reading nook's).
    ha.startHaSocket(io, {
      onPrimed: primed,
      onRegistryChanged,
      onNotify,
      lights: () => ["light.living_room", "switch.ihome_smartplug_05b4df_outlet", "light.lady_lamp"],
    });
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
      // A media player takes play_media alone (the assist reply) since the
      // Media page went (0.145.0): its turn_off would reach any TV otherwise.
      { domain: "media_player", service: "turn_off", entity_id: TV },
      { domain: "media_player", service: "toggle", entity_id: PLEX },
      { domain: "media_player", service: "volume_set", entity_id: PLEX, volume_level: 0.5 },
      { domain: "media_player", service: "select_source", entity_id: TV, source: "HDMI 1" },
      { domain: "media_player", service: "media_play", entity_id: PLEX },
      { domain: "media_player", service: "play_media", entity_id: TV, media_content_id: "http://evil/x.mp3", media_content_type: "music" },
      // A switch only if a page shows it to switch (0.151.0): not one Home
      // Assistant has that isn't configured, nor the Unraid integration's.
      { domain: "switch", service: "turn_off", entity_id: "switch.sonoff_1001816bdb" },
      { domain: "switch", service: "turn_off", entity_id: "switch.unserver_container_plex" },
      { domain: "switch", service: "turn_off", entity_id: "switch.unserver_vm_home_assistant" },
      { domain: "switch", service: "toggle", entity_id: "switch.unserver_array" },
      // A light, fan or thermostat only if a page shows it (0.156.0), and
      // play_media only to the assist speaker — none is set here.
      { domain: "light", service: "turn_on", entity_id: "light.front_yard" },
      { domain: "light", service: "turn_off", entity_id: "light.kitchen_main_lights" },
      { domain: "fan", service: "turn_off", entity_id: "fan.aidens_fan" },
      { domain: "climate", service: "set_hvac_mode", entity_id: "climate.samsung_airconditioner_3", hvac_mode: "off" },
      // A scene, script or automation only if scene_entities names it
      // (0.165.0), and only run: never switched off, toggled or reloaded.
      { domain: "script", service: "turn_on", entity_id: STUB.scenes.script },
      { domain: "automation", service: "trigger", entity_id: STUB.scenes.automation },
      { domain: "automation", service: "turn_off", entity_id: STUB.scenes.movie },
      { domain: "automation", service: "toggle", entity_id: STUB.scenes.movie },
      { domain: "automation", service: "turn_on", entity_id: STUB.scenes.movie },
      { domain: "automation", service: "reload" },
      { domain: "scene", service: "trigger", entity_id: STUB.scenes.reading },
      { domain: "scene", service: "apply", entity_id: STUB.scenes.reading },
      { domain: "scene", service: "turn_on", entity_id: STUB.scenes.movie },
      { domain: "script", service: "turn_on", entity_id: STUB.scenes.reading },
      { domain: "scene", service: "turn_on", entity_id: [STUB.scenes.reading] },
      { domain: "scene", service: "turn_on" },
      {
        domain: "media_player",
        service: "play_media",
        entity_id: TV,
        media_content_id: `http://127.0.0.1:${PORT}/api/tts_proxy/abc.mp3`,
        media_content_type: "music",
      },
    ];
    for (const call of refused) expect(ha.callService(call), JSON.stringify(call)).toBe(false);
    expect(ha.getState("switch.unserver_container_plex").state).toBe("on");
    expect(ha.getState("light.front_yard").state).toBe("off");
    expect(ha.getState(STUB.scenes.script).attributes.last_triggered).toBeNull();
    expect(ha.getState(STUB.scenes.automation).attributes.last_triggered).toBeNull();
    expect(ha.getState(STUB.scenes.movie).state).toBe("on");
  });

  it("runs a configured automation's actions and a configured scene (0.165.0)", async () => {
    stub.setState("light.kitchen_cabinet_lights", "on");
    await until(() => ha.getState("light.kitchen_cabinet_lights").state === "on");
    await expect(ha.callService({ domain: "automation", service: "trigger", entity_id: STUB.scenes.movie })).resolves.toEqual({ ok: true });
    // Movie mode: the living room down to a quarter, the kitchen off.
    await until(() => ha.getState("light.kitchen_cabinet_lights").state === "off");
    expect(ha.getState("light.living_room")).toMatchObject({ state: "on", attributes: { brightness: 64 } });
    expect(ha.getState(STUB.scenes.movie).attributes.last_triggered).not.toBeNull();

    await expect(ha.callService({ domain: "scene", service: "turn_on", entity_id: STUB.scenes.reading })).resolves.toEqual({ ok: true });
    await until(() => ha.getState("light.lady_lamp").state === "on");
    stub.reset();
    await until(() => ha.getState("light.kitchen_cabinet_lights").state === "on");
  });

  it("an automation still running when the wait ends has run; a scene that never answers hasn't (0.165.0)", async () => {
    // Home Assistant answers automation.trigger once the actions are done:
    // one with a delay in it outlasts the wait without having failed.
    stub.setServiceBehaviour({ delay_ms: 300 });
    await expect(
      ha.callService({ domain: "automation", service: "trigger", entity_id: STUB.scenes.movie }, { timeoutMs: 50 }),
    ).resolves.toEqual({ ok: true });
    await expect(
      ha.callService({ domain: "scene", service: "turn_on", entity_id: STUB.scenes.reading }, { timeoutMs: 50 }),
    ).resolves.toEqual({ ok: false, error: "Home Assistant didn't answer within 10s" });
    // A refusal is still a refusal, whatever the domain.
    stub.setServiceBehaviour({ fail: { [STUB.scenes.movie]: "Automation is disabled" } });
    await expect(
      ha.callService({ domain: "automation", service: "trigger", entity_id: STUB.scenes.movie }),
    ).resolves.toEqual({ ok: false, error: "Automation is disabled" });
    await new Promise((r) => setTimeout(r, 350));
    stub.reset();
  });

  it("switches a configured switch (0.151.0: the only kind it does, with the printer's chamber light)", async () => {
    await expect(ha.callService({ domain: "switch", service: "turn_on", entity_id: "switch.ihome_smartplug_05b4df_outlet" })).resolves.toEqual({ ok: true });
    await until(() => ha.getState("switch.ihome_smartplug_05b4df_outlet").state === "on");
    expect(ha.callableSwitch("switch.ihome_smartplug_05b4df_outlet")).toBe(true);
    expect(ha.callableSwitch("switch.unserver_container_plex")).toBe(false);
  });

  it("calls the pages' lights, a room's through the hook, the configured fan and the printer's chamber light (0.156.0)", async () => {
    await expect(ha.callService({ domain: "light", service: "turn_off", entity_id: "light.living_room" })).resolves.toEqual({ ok: true });
    await expect(ha.callService({ domain: "fan", service: "set_percentage", entity_id: "fan.living_room_ceiling_fan", percentage: 75 })).resolves.toEqual({ ok: true });
    await until(() => ha.getState("fan.living_room_ceiling_fan").attributes.percentage === 75);
    const chamber = `light.${STUB.printer.split(".")[1].replace(/_print_status$/, "")}_chamber_light`;
    expect(ha.callableEntity("light", chamber)).toBe(true);
    await expect(ha.callService({ domain: "light", service: "turn_on", entity_id: chamber })).resolves.toEqual({ ok: true });
    expect(ha.callableEntity("light", "light.lady_lamp")).toBe(true);
  });

  it("takes the configured vacuum's and printer's controls", async () => {
    await expect(ha.callService({ domain: "vacuum", service: "pause", entity_id: "vacuum.roborock_q5_pro" })).resolves.toEqual({ ok: true });
    await until(() => ha.getState("vacuum.roborock_q5_pro").state === "paused");
    await expect(ha.callService({ domain: "vacuum", service: "set_fan_speed", entity_id: "vacuum.roborock_q5_pro", fan_speed: "max_plus" })).resolves.toEqual({ ok: true });
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

describe("notifications (0.160.0)", () => {
  it("hands an automation's frame14_notify to the hook, and no other event", async () => {
    stub.pushEvent("call_service", { domain: "light" });
    stub.pushEvent("frame14_notify", { title: "Washer finished", message: "Time to move the clothes to the dryer.", tag: "appliance-washer" });
    await until(() => onNotify.mock.calls.length > 0);
    expect(onNotify.mock.calls).toEqual([
      [{ title: "Washer finished", message: "Time to move the clothes to the dryer.", tag: "appliance-washer" }],
    ]);
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

  it("kitchen motion restores the last route", async () => {
    stub.setState("input_select.oledos_route", "photos");
    stub.setState("binary_sensor.kitchen_motion_sensor_motion", "on");
    await until(() => io.currentView === "photos");
    stub.setState("binary_sensor.kitchen_motion_sensor_motion", "off");
  });

  it("kitchen motion wakes a blank frame onto the last route", async () => {
    stub.setState("input_select.oledos_route", "clock");
    io.currentView = "blank";
    stub.setState("binary_sensor.kitchen_motion_sensor_motion", "on");
    await until(() => io.currentView === "clock");
    stub.setState("binary_sensor.kitchen_motion_sensor_motion", "off");
  });

  it("kitchen motion leaves a frame on Halloween, a game or a movie where it is", async () => {
    stub.setState("input_select.oledos_route", "home");
    for (const view of ["halloween", "football", "marquee"]) {
      io.currentView = view;
      io.emit.mockClear();
      stub.setState("binary_sensor.kitchen_motion_sensor_motion", "on");
      await new Promise((r) => setTimeout(r, 200));
      expect(io.currentView, view).toBe(view);
      expect(io.emit).not.toHaveBeenCalledWith("change_view", expect.anything());
      stub.setState("binary_sensor.kitchen_motion_sensor_motion", "off");
    }
  });
});

describe("the rest", () => {
  it("setLastRoute writes the route to Home Assistant", async () => {
    await ha.setLastRoute("clock");
    await until(() => stub.getState("input_select.oledos_route").state === "clock");
  });

  it("the transient views are never remembered", () => {
    expect([...ha.TRANSIENT_VIEWS].sort()).toEqual(["blank", "football", "halloween", "marquee"]);
  });

  it("installUpdate, refreshEntity and reloadAddonStore go through the socket", async () => {
    expect(ha.installUpdate(STUB.addonUpdate)).toBe(true);
    expect(ha.installUpdate("light.x")).toBe(false);
    expect(ha.refreshEntity(STUB.addonUpdate)).toBe(true);
    expect(ha.refreshEntity("not an id")).toBe(false);
    await expect(ha.reloadAddonStore()).resolves.toEqual({});
    // The stub's changelog, whole, as the Supervisor's release notes (0.136).
    await expect(ha.fetchReleaseNotes(STUB.addonUpdate)).resolves.toMatch(/^# Changelog\n/);
    await expect(ha.fetchReleaseNotes("light.x")).rejects.toThrow(/update entity/);
  });
});
