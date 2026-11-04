import { describe, expect, it, vi } from "vitest";

// A Bambuddy printer, whose chamber light is a switch, and one configured
// switch among the lights.
vi.mock("../../entities.js", () => ({
  ENTITIES: {
    lights: ["light.kitchen", "switch.plug"],
    printer: "sensor.h2s_0938aj622701347_status",
  },
}));

const { callableSwitch } = await import("../../ha-socket.js");
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
