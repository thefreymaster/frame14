import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  states: new Map(),
  connected: true,
  installUpdate: vi.fn(() => true),
  refreshEntity: vi.fn(() => true),
  reloadAddonStore: vi.fn(async () => ({})),
}));

vi.mock("../../config.js", async (orig) => ({
  ...(await orig()),
  VERSION: "0.125.0",
  ADDON_NAME: "Frame14",
}));
vi.mock("../../ha-socket.js", () => ({
  getAllStates: () => mocks.states,
  isHaConnected: () => mocks.connected,
  installUpdate: mocks.installUpdate,
  refreshEntity: mocks.refreshEntity,
  reloadAddonStore: mocks.reloadAddonStore,
}));

import softwareRouter from "../../routes/software.js";

const app = express();
app.use("/api/software", softwareRouter);

function updateEntity(state, latest = "0.126.0") {
  return {
    entity_id: "update.frame14_update",
    state,
    attributes: { title: "Frame14", installed_version: "0.125.0", latest_version: latest, release_url: "https://example.test/releases" },
  };
}

beforeEach(() => {
  mocks.connected = true;
  mocks.installUpdate.mockClear();
  mocks.refreshEntity.mockClear();
  mocks.reloadAddonStore.mockReset();
  mocks.reloadAddonStore.mockResolvedValue({});
  mocks.states = new Map([
    ["update.home_assistant_core_update", { state: "off", attributes: { title: "Home Assistant Core" } }],
    ["update.frame14_update", updateEntity("on")],
  ]);
});

describe("GET /api/software", () => {
  it("finds the add-on's update entity by its title", async () => {
    const res = await request(app).get("/api/software");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      installed: "0.125.0",
      update: {
        entityId: "update.frame14_update",
        installed: "0.125.0",
        latest: "0.126.0",
        available: true,
        releaseUrl: "https://example.test/releases",
      },
    });
  });

  it("has no update outside the add-on", async () => {
    mocks.states.delete("update.frame14_update");
    const res = await request(app).get("/api/software");
    expect(res.body).toEqual({ installed: "0.125.0", update: null });
  });
});

describe("POST /api/software/install", () => {
  it("asks Home Assistant to install the newer version", async () => {
    const res = await request(app).post("/api/software/install");
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ ok: true, version: "0.126.0" });
    expect(mocks.installUpdate).toHaveBeenCalledWith("update.frame14_update");
  });

  it("is a 409 with nothing newer, a 404 without the entity, a 503 with HA down", async () => {
    mocks.states.set("update.frame14_update", updateEntity("off", "0.125.0"));
    expect((await request(app).post("/api/software/install")).status).toBe(409);
    mocks.states.delete("update.frame14_update");
    expect((await request(app).post("/api/software/install")).status).toBe(404);
    mocks.states.set("update.frame14_update", updateEntity("on"));
    mocks.installUpdate.mockReturnValueOnce(false);
    expect((await request(app).post("/api/software/install")).status).toBe(503);
  });
});

describe("POST /api/software/check", () => {
  it("is a 503 with Home Assistant down", async () => {
    mocks.connected = false;
    const res = await request(app).post("/api/software/check");
    expect(res.status).toBe(503);
    expect(mocks.reloadAddonStore).not.toHaveBeenCalled();
  });

  it("passes on Home Assistant's refusal as a 502", async () => {
    mocks.reloadAddonStore.mockRejectedValue(new Error("Unauthorized"));
    const res = await request(app).post("/api/software/check");
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/Unauthorized/);
  });

  it("reloads the store, refreshes the entity and answers with what it has", async () => {
    const res = await request(app).post("/api/software/check");
    expect(res.status).toBe(200);
    expect(mocks.reloadAddonStore).toHaveBeenCalled();
    expect(mocks.refreshEntity).toHaveBeenCalledWith("update.frame14_update");
    expect(res.body.installed).toBe("0.125.0");
    expect(res.body.update.latest).toBe("0.126.0");
    expect(Date.parse(res.body.checkedAt)).not.toBeNaN();
  }, 8_000);
});
