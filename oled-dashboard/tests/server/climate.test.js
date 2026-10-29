import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendCommand: vi.fn(),
}));

vi.mock("../../config.js", async (orig) => ({
  ...(await orig()),
  HA_URL: "http://ha.test",
  HA_TOKEN: "test-token",
}));
vi.mock("../../entities.js", () => ({
  ENTITIES: {
    climate: ["climate.one", "climate.two"],
    climateNames: { "climate.one": "1st Floor AC" },
  },
}));
vi.mock("../../ha-socket.js", () => ({ sendCommand: mocks.sendCommand }));

import climateRouter from "../../routes/climate.js";

const app = express();
app.use("/api/home/climate", climateRouter);

const haState = (id, state, attributes) => ({ entity_id: id, state, attributes });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("GET /api/home/climate", () => {
  it("fetches each thermostat and names it by climate_names, else its own name", async () => {
    const states = {
      "climate.one": haState("climate.one", "heat", {
        friendly_name: "Localthings 1st FLR AC", current_temperature: 64, current_humidity: "46",
        temperature: 70, hvac_action: "heating", fan_mode: "auto", fan_modes: ["auto", "low"],
      }),
      "climate.two": haState("climate.two", "off", { friendly_name: "Localthings 2nd FLR AC", current_temperature: 68, temperature: 68 }),
    };
    const fetchMock = vi.fn(async (url, init) => {
      const id = String(url).split("/").pop();
      expect(init.headers.Authorization).toBe("Bearer test-token");
      return { ok: true, json: async () => states[id] };
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await request(app).get("/api/home/climate");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        entity_id: "climate.one", name: "1st Floor AC", state: "heat", currentTemp: 64, currentHumidity: 46,
        targetTemp: 70, hvacMode: "heat", hvacAction: "heating", fanMode: "auto", fanModes: ["auto", "low"],
      },
      {
        entity_id: "climate.two", name: "Localthings 2nd FLR AC", state: "off", currentTemp: 68, currentHumidity: null,
        targetTemp: 68, hvacMode: "off", hvacAction: null, fanMode: null, fanModes: [],
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("is a 500 when Home Assistant doesn't answer", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 502 })));
    const res = await request(app).get("/api/home/climate");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Failed to fetch/);
  });
});

describe("GET /api/home/climate/history", () => {
  it("folds the day's history into quarter hours", async () => {
    // 00:45 today: three quarter hours so far.
    const midnight = new Date(2026, 9, 29, 0, 0, 0);
    vi.useFakeTimers({ now: new Date(2026, 9, 29, 0, 45, 0), toFake: ["Date"] });
    const at = (min) => (midnight.getTime() + min * 60e3) / 1000;
    const rows = [
      { s: "heat", a: { current_temperature: 70, temperature: 70, hvac_action: "heating" }, lu: at(0) },
      { s: "heat", a: { current_temperature: 72, temperature: 70, hvac_action: "idle" }, lu: at(10) },
      { s: "heat", a: { current_temperature: 71, temperature: 71, hvac_action: "idle" }, lu: at(20) },
    ];
    mocks.sendCommand.mockResolvedValue({ "climate.one": rows, "climate.two": [] });

    const res = await request(app).get("/api/home/climate/history");
    expect(res.status).toBe(200);
    expect(mocks.sendCommand).toHaveBeenCalledWith(
      "history/history_during_period",
      expect.objectContaining({ entity_ids: ["climate.one", "climate.two"], minimal_response: false }),
    );
    expect(res.body.start).toBe(midnight.toISOString());
    const [one, two] = res.body.units;
    expect(one.entity_id).toBe("climate.one");
    expect(one.points).toEqual([
      // 70° for ten minutes and 72° for five: a time-weighted 70.7; heating ran.
      { time: new Date(at(0) * 1000).toISOString(), temp: 70.7, target: 70, action: "heating" },
      // 72° for five minutes then 71° for ten; the target set last in the quarter.
      { time: new Date(at(15) * 1000).toISOString(), temp: 71.3, target: 71, action: null },
      { time: new Date(at(30) * 1000).toISOString(), temp: 71, target: 71, action: null },
    ]);
    expect(two.points).toEqual([]);
  });

  it("shows no target while the unit is off", async () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 29, 0, 10, 0), toFake: ["Date"] });
    const midnight = new Date(2026, 9, 29, 0, 0, 0).getTime() / 1000;
    mocks.sendCommand.mockResolvedValue({
      "climate.one": [{ s: "off", a: { current_temperature: 68, temperature: 70, hvac_action: "off" }, lu: midnight }],
      "climate.two": [],
    });
    const res = await request(app).get("/api/home/climate/history");
    expect(res.body.units[0].points).toEqual([
      { time: new Date(midnight * 1000).toISOString(), temp: 68, target: null, action: null },
    ]);
  });

  it("is a 500 when the history can't be read", async () => {
    mocks.sendCommand.mockRejectedValue(new Error("no recorder"));
    const res = await request(app).get("/api/home/climate/history");
    expect(res.status).toBe(500);
  });
});
