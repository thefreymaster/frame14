import { describe, expect, it, vi } from "vitest";

// A Bambuddy printer, whose chamber light is a switch, one configured switch
// among the lights, a fan, a thermostat and the assist speaker.
vi.mock("../../entities.js", () => ({
  ENTITIES: {
    lights: ["light.kitchen", "switch.plug"],
    printer: "sensor.h2s_0938aj622701347_status",
    fans: ["fan.ceiling"],
    climate: ["climate.first_floor"],
  },
}));
vi.mock("../../config.js", async (orig) => ({
  ...(await orig()),
  // No token, so startHaSocket takes its hooks and opens nothing.
  HA_TOKEN: "",
  ASSIST_SPEAKER: "media_player.kitchen_speaker",
}));

const { callableEntity, callableSwitch } = await import("../../ha-socket.js");
const { printerEntities } = await import("../../printer-entities.js");

describe("callableSwitch (0.151.0)", () => {
  it("is a configured switch or the printer's chamber light, nothing else", () => {
    expect(callableSwitch("switch.plug")).toBe(true);
    expect(callableSwitch("switch.h2s_0938aj622701347_chamber_light")).toBe(true);
    expect(callableSwitch("switch.unserver_array")).toBe(false);
    expect(callableSwitch("switch.unserver_container_plex")).toBe(false);
    expect(callableSwitch("switch.workshop_unserver_vm_claude")).toBe(false);
  });

  it("takes the chamber light's domain from the printer's integration", () => {
    expect(printerEntities().chamberLight).toBe("switch.h2s_0938aj622701347_chamber_light");
    expect(printerEntities("sensor.a1_03919c442700723_print_status").chamberLight).toBe("light.a1_03919c442700723_chamber_light");
    expect(printerEntities("")).toBeNull();
  });
});

describe("callableEntity (0.156.0)", () => {
  it("is a light the pages show, a configured fan or thermostat, or the assist speaker", () => {
    // Without startHaSocket's hook, the pages' lights are the configured ones.
    expect(callableEntity("light", "light.kitchen")).toBe(true);
    expect(callableEntity("light", "light.basement")).toBe(false);
    expect(callableEntity("fan", "fan.ceiling")).toBe(true);
    expect(callableEntity("fan", "fan.attic")).toBe(false);
    expect(callableEntity("climate", "climate.first_floor")).toBe(true);
    expect(callableEntity("climate", "climate.garage_heater")).toBe(false);
    expect(callableEntity("media_player", "media_player.kitchen_speaker")).toBe(true);
    expect(callableEntity("media_player", "media_player.living_room_tv")).toBe(false);
    // Switches as callableSwitch has them; anything else, nothing.
    expect(callableEntity("switch", "switch.plug")).toBe(true);
    expect(callableEntity("switch", "switch.unserver_array")).toBe(false);
    expect(callableEntity("lock", "lock.front")).toBe(false);
  });

  it("takes the pages' lights from startHaSocket's hook", async () => {
    const { startHaSocket } = await import("../../ha-socket.js");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    startHaSocket({}, { lights: () => ["light.kitchen", "light.reading_nook"] });
    expect(callableEntity("light", "light.reading_nook")).toBe(true);
    expect(callableEntity("light", "light.basement")).toBe(false);
  });
});
