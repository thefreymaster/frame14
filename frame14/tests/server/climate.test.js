import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
