import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// What the routes read from the rest of the server, as the tests set it.
const mocks = vi.hoisted(() => ({
  connected: true,
  states: new Map(),
  entities: {
    circuits: {
      main: "sensor.main",
      balance: "sensor.balance",
      items: [
        { name: "Heat Pump", power: "sensor.ac1_power_minute_average" },
        { name: "Oven", power: "sensor.oven_power_minute_average" },
        { name: "Fridge", power: "sensor.fridge_power_minute_average" },
      ],
    },
  },
  setLastRoute: vi.fn(),
  entitiesPayload: vi.fn(() => ({ lights: ["light.a"], rooms: [] })),
}));

vi.mock("../../config.js", async (orig) => ({
  ...(await orig()),
  HA_URL: "http://ha.local:8123",
  HA_TOKEN: "test-token",
  VERSION: "9.9.9",
  ASSIST_PIPELINE_ID: "",
}));
vi.mock("../../entities.js", () => ({ ENTITIES: mocks.entities }));
vi.mock("../../ha-socket.js", () => ({
  isHaConnected: () => mocks.connected,
  getState: (id) => mocks.states.get(id),
  setLastRoute: mocks.setLastRoute,
  TRANSIENT_VIEWS: new Set(["blank", "marquee", "football", "halloween"]),
}));
vi.mock("../../ha-areas.js", () => ({ entitiesPayload: mocks.entitiesPayload }));

import healthRouter from "../../routes/health.js";
import entitiesRouter from "../../routes/entities.js";
import connectionRouter from "../../routes/connection.js";
import viewsRouter from "../../routes/views.js";
import screenRouter from "../../routes/screen.js";
import circuitsRouter from "../../routes/circuits.js";

function app(path, router, locals = {}) {
  const a = express();
  Object.assign(a.locals, locals);
  a.use(path, router);
  return a;
}

const state = (id, value) => [id, { entity_id: id, state: String(value), attributes: {} }];

beforeEach(() => {
  mocks.connected = true;
  mocks.setLastRoute.mockReset();
  mocks.states = new Map([
    state("sensor.main", 1220.07),
    state("sensor.balance", 384.99),
    state("sensor.ac1_power_minute_average", 412),
    state("sensor.ac1_energy_today", 3.2),
    state("sensor.oven_power_minute_average", "unknown"),
    state("sensor.fridge_power_minute_average", 148),
  ]);
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("GET /api", () => {
  it("says it is up, with the version", async () => {
    const res = await request(app("/api", healthRouter)).get("/api");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      message: "API is running",
      version: "9.9.9",
      assistPipeline: "",
    });
  });
});

describe("GET /api/entities", () => {
  it("is the entity config with the lights by room", async () => {
    const res = await request(app("/api/entities", entitiesRouter)).get("/api/entities");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ lights: ["light.a"], rooms: [] });
    expect(mocks.entitiesPayload).toHaveBeenCalled();
  });
});

describe("GET /api/connection", () => {
  const a = app("/api/connection", connectionRouter);

  it("describes the server and its Home Assistant link", async () => {
    const res = await request(a).get("/api/connection");
    expect(res.status).toBe(200);
    expect(res.body.server).toMatchObject({ version: "9.9.9", hostname: expect.any(String) });
    expect(res.body.server.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(res.body.homeAssistant).toEqual({ host: "ha.local:8123", connected: true });
    expect(res.body.client.address).toBe("127.0.0.1");
  });

  it("takes the caller's address from the proxy headers first", async () => {
    const cf = await request(a).get("/api/connection").set("cf-connecting-ip", "203.0.113.9").set("x-forwarded-for", "198.51.100.1, 10.0.0.1");
    expect(cf.body.client.address).toBe("203.0.113.9");
    const fwd = await request(a).get("/api/connection").set("x-forwarded-for", "198.51.100.1, 10.0.0.1");
    expect(fwd.body.client.address).toBe("198.51.100.1");
  });

  it("reports Home Assistant down", async () => {
    mocks.connected = false;
    const res = await request(a).get("/api/connection");
    expect(res.body.homeAssistant.connected).toBe(false);
  });
});

describe("GET /api/change/:view", () => {
  it("moves every screen and remembers the view", async () => {
    const io = { emit: vi.fn(), currentView: "home" };
    const res = await request(app("/api", viewsRouter, { io })).get("/api/change/clock");
    expect(res.status).toBe(200);
    expect(io.emit).toHaveBeenCalledWith("change_view", "clock");
    expect(io.currentView).toBe("clock");
    expect(mocks.setLastRoute).toHaveBeenCalledWith("clock");
  });

  it("never remembers a transient view", async () => {
    const io = { emit: vi.fn(), currentView: "home" };
    await request(app("/api", viewsRouter, { io })).get("/api/change/blank");
    expect(io.emit).toHaveBeenCalledWith("change_view", "blank");
    expect(mocks.setLastRoute).not.toHaveBeenCalled();
  });
});

describe("the screen routes", () => {
  const HOURS = { enabled: false, on: "06:30", off: "23:00" };
  // screen.js as the routes see it (app.locals.screen).
  const screen = () => ({
    state: vi.fn(() => ({ state: "on", schedule: HOURS })),
    set: vi.fn(),
    setSchedule: vi.fn((schedule) => ({ state: "off", schedule })),
  });
  function screenApp(s) {
    const a = express();
    a.use(express.json());
    a.locals.screen = s;
    a.use("/api", screenRouter);
    return a;
  }

  it("GET /api/screen answers the state and the schedule", async () => {
    const res = await request(screenApp(screen())).get("/api/screen");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ state: "on", schedule: HOURS });
  });

  it("GET /api/screen/:state turns the frames' screen off, and on", async () => {
    const s = screen();
    const a = screenApp(s);
    expect((await request(a).get("/api/screen/off")).status).toBe(200);
    expect((await request(a).get("/api/screen/on")).status).toBe(200);
    expect(s.set.mock.calls).toEqual([["off"], ["on"]]);
  });

  it("GET /api/screen/:state refuses any other state", async () => {
    const s = screen();
    const res = await request(screenApp(s)).get("/api/screen/dim");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/on.*off/);
    expect(s.set).not.toHaveBeenCalled();
  });

  it("PUT /api/screen/schedule saves a schedule, and refuses what isn't one", async () => {
    const s = screen();
    const a = screenApp(s);
    const ok = await request(a).put("/api/screen/schedule").send({ enabled: true, on: "07:00", off: "22:00" });
    expect(ok.status).toBe(200);
    expect(s.setSchedule).toHaveBeenCalledWith({ enabled: true, on: "07:00", off: "22:00" });
    expect(ok.body).toEqual({ state: "off", schedule: { enabled: true, on: "07:00", off: "22:00" } });
    for (const bad of [{ enabled: true, on: "07:00", off: "07:00" }, { enabled: true, on: "7am", off: "22:00" }, {}]) {
      const res = await request(a).put("/api/screen/schedule").send(bad);
      expect(res.status, JSON.stringify(bad)).toBe(400);
    }
    expect(s.setSchedule).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/circuits", () => {
  it("lists the circuits by draw, with today's kWh where the cache has it", async () => {
    const res = await request(app("/api/circuits", circuitsRouter)).get("/api/circuits");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalWatts: 1220.07,
      balanceWatts: 384.99,
      circuits: [
        { name: "Heat Pump", watts: 412, kwhToday: 3.2 },
        { name: "Fridge", watts: 148, kwhToday: null },
        { name: "Oven", watts: null, kwhToday: null },
      ],
    });
  });

  it("is a 503 with no circuits configured", async () => {
    mocks.entities.circuits.items = [];
    vi.resetModules();
    const { default: router } = await import("../../routes/circuits.js");
    const res = await request(app("/api/circuits", router)).get("/api/circuits");
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/not configured/);
  });
});
