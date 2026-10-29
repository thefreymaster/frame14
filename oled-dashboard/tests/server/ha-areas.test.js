import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The configured lights and rooms, and a Home Assistant that answers the
// three registry reads with whatever the test sets.
const mocks = vi.hoisted(() => ({
  entities: {
    lights: ["light.living_room", "switch.plug", "light.front_porch"],
    lightAreas: ["Living Room", "kitchen", "Nowhere"],
    climate: ["climate.x"],
  },
  connected: true,
  registries: { areas: [], devices: [], entities: [] },
  sendCommand: vi.fn(),
}));

vi.mock("../../entities.js", () => ({ ENTITIES: mocks.entities }));
vi.mock("../../ha-socket.js", () => ({
  isHaConnected: () => mocks.connected,
  sendCommand: mocks.sendCommand,
}));

const REGISTRIES = {
  areas: [
    { area_id: "living_room", name: "Living Room" },
    { area_id: "kitchen", name: "Kitchen" },
    { area_id: "outside", name: "Outside" },
  ],
  devices: [{ id: "dev_porch", area_id: "outside" }],
  entities: [
    { entity_id: "light.living_room", area_id: "living_room" },
    { entity_id: "light.living_room_floor_lamp", area_id: "living_room" },
    { entity_id: "light.lady_lamp", area_id: "living_room", disabled_by: "user" },
    { entity_id: "light.kitchen_main_lights", area_id: "kitchen" },
    { entity_id: "light.kitchen_plug_indicator", area_id: "kitchen", entity_category: "config" },
    { entity_id: "light.kitchen_hidden", area_id: "kitchen", hidden_by: "user" },
    { entity_id: "switch.plug", area_id: "kitchen" },
    { entity_id: "light.front_porch", area_id: null, device_id: "dev_porch" },
    { entity_id: "light.basement", area_id: "basement" },
  ],
};

/** A fresh copy of the module: its resolved lights are module state. */
async function fresh() {
  vi.resetModules();
  return import("../../ha-areas.js");
}

const io = () => ({ emit: vi.fn() });

beforeEach(() => {
  mocks.connected = true;
  mocks.registries = structuredClone(REGISTRIES);
  mocks.sendCommand.mockReset();
  mocks.sendCommand.mockImplementation(async (type) => {
    if (type === "config/area_registry/list") return mocks.registries.areas;
    if (type === "config/device_registry/list") return mocks.registries.devices;
    if (type === "config/entity_registry/list") return mocks.registries.entities;
    throw new Error(`unexpected ${type}`);
  });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("before the registries are read", () => {
  it("the lights are the explicit list and there are no rooms", async () => {
    const { lightsConfig, entitiesPayload } = await fresh();
    expect(lightsConfig()).toEqual({ lights: mocks.entities.lights, rooms: [] });
    expect(entitiesPayload()).toMatchObject({ climate: ["climate.x"], lights: mocks.entities.lights, rooms: [] });
  });

  it("does nothing without the socket", async () => {
    mocks.connected = false;
    const { refreshLightAreas, lightsConfig } = await fresh();
    const socket = io();
    await refreshLightAreas(socket);
    expect(mocks.sendCommand).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();
    expect(lightsConfig().rooms).toEqual([]);
  });
});

describe("refreshLightAreas", () => {
  it("adds the configured rooms' lights and groups every light by room", async () => {
    const { refreshLightAreas, lightsConfig } = await fresh();
    const socket = io();
    await refreshLightAreas(socket);

    const { lights, rooms } = lightsConfig();
    // The explicit lights first, then the found ones in id order; nothing
    // disabled, hidden or a config entity, and no switches imported.
    expect(lights).toEqual([
      "light.living_room",
      "switch.plug",
      "light.front_porch",
      "light.kitchen_main_lights",
      "light.living_room_floor_lamp",
    ]);
    // The configured areas first in their order, then the porch's area,
    // reached through its device; only rooms with something in them.
    expect(rooms).toEqual([
      { id: "living_room", name: "Living Room", lights: ["light.living_room", "light.living_room_floor_lamp"] },
      { id: "kitchen", name: "Kitchen", lights: ["switch.plug", "light.kitchen_main_lights"] },
      { id: "outside", name: "Outside", lights: ["light.front_porch"] },
    ]);
    expect(socket.emit).toHaveBeenCalledWith("entities", expect.objectContaining({ lights, rooms, climate: ["climate.x"] }));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('no area "Nowhere"'));
  });

  it("matches an area by id, by name, case and punctuation aside", async () => {
    mocks.entities.lightAreas = ["LIVING-ROOM", "kitchen"];
    const { refreshLightAreas, lightsConfig } = await fresh();
    await refreshLightAreas(io());
    expect(lightsConfig().rooms.map((r) => r.id)).toEqual(["living_room", "kitchen", "outside"]);
    mocks.entities.lightAreas = ["Living Room", "kitchen", "Nowhere"];
  });

  it("tells the pages only when the answer changed", async () => {
    const { refreshLightAreas } = await fresh();
    const socket = io();
    await refreshLightAreas(socket);
    await refreshLightAreas(socket);
    expect(socket.emit).toHaveBeenCalledTimes(1);
    mocks.registries.entities.push({ entity_id: "light.kitchen_new", area_id: "kitchen" });
    await refreshLightAreas(socket);
    expect(socket.emit).toHaveBeenCalledTimes(2);
    expect(socket.emit.mock.calls[1][1].lights).toContain("light.kitchen_new");
  });

  it("keeps what it had when Home Assistant can't answer", async () => {
    const { refreshLightAreas, lightsConfig } = await fresh();
    const socket = io();
    await refreshLightAreas(socket);
    const before = lightsConfig();
    mocks.sendCommand.mockRejectedValue(new Error("not allowed"));
    await refreshLightAreas(socket);
    expect(lightsConfig()).toBe(before);
    expect(console.warn).toHaveBeenCalledWith("[ha-areas] couldn't read the registries:", "not allowed");
    mocks.sendCommand.mockResolvedValue({ not: "a list" });
    await refreshLightAreas(socket);
    expect(lightsConfig()).toBe(before);
    expect(socket.emit).toHaveBeenCalledTimes(1);
  });

  it("reads once at a time", async () => {
    const { refreshLightAreas } = await fresh();
    const socket = io();
    await Promise.all([refreshLightAreas(socket), refreshLightAreas(socket)]);
    expect(mocks.sendCommand).toHaveBeenCalledTimes(3);
  });
});

describe("scheduleLightAreasRefresh", () => {
  it("re-reads a second after the last registry change", async () => {
    vi.useFakeTimers();
    const { scheduleLightAreasRefresh } = await fresh();
    const socket = io();
    scheduleLightAreasRefresh(socket);
    scheduleLightAreasRefresh(socket);
    await vi.advanceTimersByTimeAsync(999);
    expect(mocks.sendCommand).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.sendCommand).toHaveBeenCalledTimes(3);
  });
});
