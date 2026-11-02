// routes/photos.js's album helper and Immich as options (0.145.0): with neither
// set up the album config answers none rather than an error, and a pick has
// nowhere to go. A fresh module per case, since both are read at import.
import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

async function photosApp({ immich, album }) {
  vi.resetModules();
  vi.doMock("../../config.js", async (orig) => ({
    ...(await orig()),
    HA_URL: "http://ha.test",
    HA_TOKEN: "test-token",
    IMMICH_URL: immich ? "http://immich.test" : "",
    IMMICH_API_KEY: immich ? "key" : "",
    PHOTOS_ENABLED: immich,
  }));
  vi.doMock("../../entities.js", () => ({ ENTITIES: { album } }));
  const { default: router } = await import("../../routes/photos.js");
  const app = express();
  app.use(express.json());
  app.use("/api/photos", router);
  return app;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock("../../config.js");
  vi.doUnmock("../../entities.js");
});

describe("GET /api/photos/config", () => {
  it("is no album, without asking Home Assistant, when Immich isn't set up", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const res = await request(await photosApp({ immich: false, album: "input_select.album" })).get("/api/photos/config");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ defaultAlbumId: null, options: [] });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is no album when no album_entity is configured", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const res = await request(await photosApp({ immich: true, album: "" })).get("/api/photos/config");
    expect(res.body).toEqual({ defaultAlbumId: null, options: [] });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reads the configured album helper", async () => {
    const fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ state: "album-1", attributes: { options: ["album-1", "album-2"] } }),
    }));
    vi.stubGlobal("fetch", fetch);
    const res = await request(await photosApp({ immich: true, album: "input_select.my_album" })).get("/api/photos/config");
    expect(res.body).toEqual({ defaultAlbumId: "album-1", options: ["album-1", "album-2"] });
    expect(fetch).toHaveBeenCalledWith("http://ha.test/api/states/input_select.my_album", expect.anything());
  });
});

describe("POST /api/photos/config", () => {
  it("is a 404 without an album_entity", async () => {
    const res = await request(await photosApp({ immich: true, album: "" }))
      .post("/api/photos/config")
      .send({ option: "album-2" });
    expect(res.status).toBe(404);
  });

  it("selects the option on the configured helper", async () => {
    const fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetch);
    const res = await request(await photosApp({ immich: true, album: "input_select.my_album" }))
      .post("/api/photos/config")
      .send({ option: "album-2" });
    expect(res.status).toBe(200);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ entity_id: "input_select.my_album", option: "album-2" });
  });
});

describe("GET /api/photos/albums", () => {
  it("is a 503 when Immich isn't set up", async () => {
    const res = await request(await photosApp({ immich: false, album: "" })).get("/api/photos/albums");
    expect(res.status).toBe(503);
  });
});
