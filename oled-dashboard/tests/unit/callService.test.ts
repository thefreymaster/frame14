import { beforeEach, describe, expect, it, vi } from "vitest";

// The socket, without a server: what was emitted, and the ack callback of the
// timed emit (entity:call) to answer as the server would.
const fake = vi.hoisted(() => ({
  emit: vi.fn(),
  timedEmit: vi.fn(),
}));

vi.mock("../../src/lib/socket", () => ({
  socket: {
    emit: fake.emit,
    timeout: () => ({ emit: fake.timedEmit }),
    on: vi.fn(),
    off: vi.fn(),
    connected: true,
  },
}));

import {
  callClimateService,
  callFanService,
  callLightService,
  callMediaService,
  callService,
  callVacuumService,
  pressButton,
} from "../../src/lib/callService";

type Ack = (err: Error | null, result?: unknown) => void;
const lastAck = (): Ack => fake.timedEmit.mock.calls.at(-1)?.[2] as Ack;

beforeEach(() => {
  fake.emit.mockReset();
  fake.timedEmit.mockReset();
});

describe("callService", () => {
  it("sends the service for a light and resolves with the server's ack", async () => {
    const result = callService("light.living_room", "turn_off");
    expect(fake.timedEmit).toHaveBeenCalledWith(
      "entity:call",
      { domain: "light", service: "turn_off", entity_id: "light.living_room" },
      expect.any(Function),
    );
    lastAck()(null, { ok: true });
    await expect(result).resolves.toEqual({ ok: true });
  });

  it("toggles by default, and takes switches and fans", async () => {
    void callService("switch.plug");
    expect(fake.timedEmit.mock.calls[0][1]).toMatchObject({ domain: "switch", service: "toggle" });
    void callService("fan.ceiling", "turn_on");
    expect(fake.timedEmit.mock.calls[1][1]).toMatchObject({ domain: "fan", service: "turn_on" });
  });

  it("passes Home Assistant's refusal on", async () => {
    const result = callService("light.x", "turn_on");
    lastAck()(null, { ok: false, error: "The bulb isn't answering" });
    await expect(result).resolves.toEqual({ ok: false, error: "The bulb isn't answering" });
  });

  it("says so when the server never answers", async () => {
    const result = callService("light.x", "turn_on");
    lastAck()(new Error("operation has timed out"));
    await expect(result).resolves.toEqual({ ok: false, error: "No answer from the server" });
  });

  it("takes an ack without a result as ok (an older server)", async () => {
    const result = callService("light.x", "turn_on");
    lastAck()(null, undefined);
    await expect(result).resolves.toEqual({ ok: true });
  });

  it("refuses any other domain without asking the server", async () => {
    await expect(callService("climate.x", "turn_off")).resolves.toEqual({
      ok: false,
      error: "Not a light, switch or fan",
    });
    expect(fake.timedEmit).not.toHaveBeenCalled();
  });
});

describe("the other calls", () => {
  it("climate: mode, temperature, fan mode", () => {
    callClimateService("climate.x", "set_hvac_mode", { hvac_mode: "heat" });
    callClimateService("climate.x", "set_temperature", { temperature: 70 });
    callClimateService("climate.x", "set_fan_mode", { fan_mode: "auto" });
    expect(fake.emit.mock.calls.map((c) => c[1])).toEqual([
      { domain: "climate", service: "set_hvac_mode", entity_id: "climate.x", hvac_mode: "heat" },
      { domain: "climate", service: "set_temperature", entity_id: "climate.x", temperature: 70 },
      { domain: "climate", service: "set_fan_mode", entity_id: "climate.x", fan_mode: "auto" },
    ]);
  });

  it("light.turn_on with a brightness and a colour", () => {
    callLightService("light.x", { brightness_pct: 50, rgb_color: [1, 2, 3] });
    expect(fake.emit).toHaveBeenCalledWith("entity:call", {
      domain: "light", service: "turn_on", entity_id: "light.x", brightness_pct: 50, rgb_color: [1, 2, 3],
    });
  });

  it("fan: a percentage only when given", () => {
    callFanService("fan.x", "turn_off");
    callFanService("fan.x", "set_percentage", { percentage: 75 });
    expect(fake.emit.mock.calls.map((c) => c[1])).toEqual([
      { domain: "fan", service: "turn_off", entity_id: "fan.x" },
      { domain: "fan", service: "set_percentage", entity_id: "fan.x", percentage: 75 },
    ]);
  });

  it("vacuum, media player and button presses", () => {
    callVacuumService("vacuum.x", "set_fan_speed", { fan_speed: "max_plus" });
    callMediaService("media_player.x", "volume_set", { volume_level: 0.2 });
    pressButton("button.x");
    expect(fake.emit.mock.calls.map((c) => c[1])).toEqual([
      { domain: "vacuum", service: "set_fan_speed", entity_id: "vacuum.x", fan_speed: "max_plus" },
      { domain: "media_player", service: "volume_set", entity_id: "media_player.x", volume_level: 0.2 },
      { domain: "button", service: "press", entity_id: "button.x" },
    ]);
  });
});
