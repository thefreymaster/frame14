// The frames' photos through Home Assistant's Immich integration (0.162.0,
// photos.js + routes/photos.js): `immich_album_ids` are the albums, HA's media
// source lists them (media_source/browse_media) and HA's /immich view serves
// the pictures with HA_TOKEN; the album the frames play is kept in the data
// folder. A fresh module per case, since the options are read at import.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const FAMILY = "aaaaaaaa-0000-4000-8000-000000000001";
const GARDEN = "aaaaaaaa-0000-4000-8000-000000000002";
const PRIVATE = "aaaaaaaa-0000-4000-8000-000000000003";
const BEACH = "11111111-0000-4000-8000-000000000001";
const DOG = "11111111-0000-4000-8000-000000000002";
const VIDEO = "11111111-0000-4000-8000-000000000003";
const ROSES = "11111111-0000-4000-8000-000000000004";
const SECRET = "11111111-0000-4000-8000-000000000005";

const asset = (album, id, file, mime) => ({
  title: file,
  media_class: mime.startsWith("video/") ? "video" : "image",
  media_content_type: mime,
  media_content_id: `media-source://immich/acct-1|albums|${album}|${id}|${file}|${mime}`,
  can_play: mime.startsWith("video/"),
  can_expand: false,
  thumbnail: `/immich/acct-1/${id}/thumbnail/${mime}`,
});

/** HA's Immich media source, as browse_media answers it: one account, three albums. */
const HA_MEDIA = {
  "media-source://immich": {
    title: "Immich",
    children: [{ title: "Evan", media_content_id: "media-source://immich/acct-1", can_expand: true }],
  },
  "media-source://immich/acct-1|albums": {
    title: "albums",
    children: [
      { title: "Family", media_content_id: `media-source://immich/acct-1|albums|${FAMILY}` },
      { title: "Garden", media_content_id: `media-source://immich/acct-1|albums|${GARDEN}` },
      { title: "Private", media_content_id: `media-source://immich/acct-1|albums|${PRIVATE}` },
    ],
  },
  [`media-source://immich/acct-1|albums|${FAMILY}`]: {
    title: "Family",
    children: [
      asset(FAMILY, BEACH, "beach.jpg", "image/jpeg"),
      asset(FAMILY, VIDEO, "party.mp4", "video/mp4"),
      asset(FAMILY, DOG, "dog | best.heic", "image/heic"),
    ],
  },
  [`media-source://immich/acct-1|albums|${GARDEN}`]: {
    title: "Garden",
    children: [asset(GARDEN, ROSES, "roses.png", "image/png")],
  },
  [`media-source://immich/acct-1|albums|${PRIVATE}`]: {
    title: "Private",
    children: [asset(PRIVATE, SECRET, "secret.jpg", "image/jpeg")],
  },
};

let dir;
let sendCommand;
let connected;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "frame14-photos-"));
  process.env.FRAME14_DATA_DIR = dir;
  connected = true;
  sendCommand = vi.fn(async (type, payload) => {
    if (type !== "media_source/browse_media") throw new Error(`unexpected ${type}`);
    const item = HA_MEDIA[payload.media_content_id];
    if (!item) throw new Error("Unknown media item");
    return item;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock("../../config.js");
  vi.doUnmock("../../entities.js");
  vi.doUnmock("../../ha-socket.js");
  delete process.env.FRAME14_DATA_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

async function photosApp(albums) {
  vi.resetModules();
  vi.doMock("../../config.js", async (orig) => ({
    ...(await orig()),
    HA_URL: "http://ha.test:8123",
    HA_TOKEN: "test-token",
  }));
  vi.doMock("../../entities.js", () => ({ ENTITIES: { albums } }));
  vi.doMock("../../ha-socket.js", () => ({
    sendCommand: (...args) => sendCommand(...args),
    isHaConnected: () => connected,
  }));
  const { startPhotos } = await import("../../photos.js");
  const { default: router } = await import("../../routes/photos.js");
  const app = express();
  app.use(express.json());
  app.locals.photos = startPhotos();
  app.locals.io = { emit: vi.fn() };
  app.use("/api/photos", router);
  return app;
}

const browsed = () => sendCommand.mock.calls.map(([, payload]) => payload.media_content_id);

function imageFetch(status = 200) {
  const fetch = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "image/jpeg" }),
    arrayBuffer: async () => new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer,
  }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("GET /api/photos/config", () => {
  it("is no album, without asking Home Assistant, when none is configured", async () => {
    const res = await request(await photosApp([])).get("/api/photos/config");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ defaultAlbumId: null, options: [] });
    expect(sendCommand).not.toHaveBeenCalled();
  });

  it("lists the configured albums in their order, each once, the first playing until one is picked", async () => {
    const app = await photosApp([GARDEN, ` ${FAMILY.toUpperCase()} `, GARDEN, "not-an-album", 7]);
    const res = await request(app).get("/api/photos/config");
    expect(res.body).toEqual({ defaultAlbumId: GARDEN, options: [GARDEN, FAMILY] });
    expect(sendCommand).not.toHaveBeenCalled();
  });
});

describe("POST /api/photos/config", () => {
  it("plays a configured album on every frame, and keeps it across a restart", async () => {
    const app = await photosApp([FAMILY, GARDEN]);
    const res = await request(app).post("/api/photos/config").send({ option: GARDEN });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ defaultAlbumId: GARDEN });
    expect(app.locals.io.emit).toHaveBeenCalledWith("photos_refresh");
    expect((await request(app).get("/api/photos/config")).body.defaultAlbumId).toBe(GARDEN);

    const restarted = await photosApp([FAMILY, GARDEN]);
    expect((await request(restarted).get("/api/photos/config")).body.defaultAlbumId).toBe(GARDEN);
    // An album taken out of the options: the first again.
    const fewer = await photosApp([FAMILY]);
    expect((await request(fewer).get("/api/photos/config")).body.defaultAlbumId).toBe(FAMILY);
  });

  it("refuses an album that isn't configured, and has nowhere to go without one", async () => {
    const app = await photosApp([FAMILY]);
    const res = await request(app).post("/api/photos/config").send({ option: PRIVATE });
    expect(res.status).toBe(400);
    expect(app.locals.io.emit).not.toHaveBeenCalled();
    expect((await request(app).get("/api/photos/config")).body.defaultAlbumId).toBe(FAMILY);
    expect((await request(await photosApp([])).post("/api/photos/config").send({ option: FAMILY })).status).toBe(404);
  });
});

describe("GET /api/photos/albums", () => {
  it("names the configured albums from Home Assistant's Immich, in their order", async () => {
    const res = await request(await photosApp([GARDEN, FAMILY, "aaaaaaaa-0000-4000-8000-00000000ffff"])).get("/api/photos/albums");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: GARDEN, albumName: "Garden" },
      { id: FAMILY, albumName: "Family" },
      // One HA doesn't have is named by its id.
      { id: "aaaaaaaa-0000-4000-8000-00000000ffff", albumName: "aaaaaaaa-0000-4000-8000-00000000ffff" },
    ]);
    expect(browsed()).toEqual(["media-source://immich", "media-source://immich/acct-1|albums"]);
  });

  it("is a 503 with no albums configured, while HA is down, and a 502 without HA's Immich", async () => {
    expect((await request(await photosApp([])).get("/api/photos/albums")).status).toBe(503);

    sendCommand = vi.fn(async () => {
      throw new Error("HA WebSocket not connected");
    });
    connected = false;
    const down = await request(await photosApp([FAMILY])).get("/api/photos/albums");
    expect(down.status).toBe(503);

    connected = true;
    sendCommand = vi.fn(async () => {
      throw new Error("Immich is not configured");
    });
    const missing = await request(await photosApp([FAMILY])).get("/api/photos/albums");
    expect(missing.status).toBe(502);
    expect(missing.body.error).toMatch(/Immich is not configured/);
  });
});

describe("GET /api/photos/albums/:albumId", () => {
  it("lists a configured album's pictures in HA's order, leaving its videos out", async () => {
    const app = await photosApp([FAMILY, GARDEN]);
    const res = await request(app).get(`/api/photos/albums/${FAMILY}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: FAMILY, albumName: "Family", assets: [{ id: BEACH }, { id: DOG }] });
    expect(browsed()).toContain(`media-source://immich/acct-1|albums|${FAMILY}`);
  });

  it("asks Home Assistant once a minute, however many frames ask", async () => {
    const app = await photosApp([FAMILY]);
    await Promise.all([1, 2, 3].map(() => request(app).get(`/api/photos/albums/${FAMILY}`)));
    await request(app).get(`/api/photos/albums/${FAMILY}`);
    expect(browsed().filter((id) => id.endsWith(FAMILY))).toHaveLength(1);
  });

  it("is a 404 for an album that isn't configured, without asking HA", async () => {
    const res = await request(await photosApp([FAMILY])).get(`/api/photos/albums/${PRIVATE}`);
    expect(res.status).toBe(404);
    expect(sendCommand).not.toHaveBeenCalled();
  });
});

describe("GET /api/photos/asset/:assetId/thumbnail", () => {
  it("is the picture from HA's Immich view, signed in with HA_TOKEN, the preview or the small thumbnail", async () => {
    const app = await photosApp([FAMILY]);
    const fetch = imageFetch();
    await request(app).get(`/api/photos/albums/${FAMILY}`);

    const res = await request(app).get(`/api/photos/asset/${BEACH}/thumbnail`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/jpeg");
    expect([...res.body]).toEqual([0xff, 0xd8, 0xff, 0xd9]);
    expect(fetch).toHaveBeenLastCalledWith(
      `http://ha.test:8123/immich/acct-1/${BEACH}/preview/image/jpeg`,
      expect.objectContaining({ headers: { Authorization: "Bearer test-token" } }),
    );
    await request(app).get(`/api/photos/asset/${DOG}/thumbnail?size=thumbnail`);
    expect(fetch).toHaveBeenLastCalledWith(`http://ha.test:8123/immich/acct-1/${DOG}/thumbnail/image/jpeg`, expect.anything());
  });

  it("finds a photo after a restart by listing the albums again", async () => {
    const app = await photosApp([FAMILY, GARDEN]);
    const fetch = imageFetch();
    const res = await request(app).get(`/api/photos/asset/${ROSES}/thumbnail`);
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(`http://ha.test:8123/immich/acct-1/${ROSES}/preview/image/jpeg`, expect.anything());
  });

  it("serves no picture outside the configured albums", async () => {
    const app = await photosApp([FAMILY]);
    const fetch = imageFetch();
    expect((await request(app).get(`/api/photos/asset/${SECRET}/thumbnail`)).status).toBe(404);
    expect((await request(app).get(`/api/photos/asset/${VIDEO}/thumbnail`)).status).toBe(404);
    expect((await request(app).get("/api/photos/asset/..%2F..%2Fapi%2Fstates/thumbnail")).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is a 502 when HA's Immich refuses the picture", async () => {
    const app = await photosApp([FAMILY]);
    imageFetch(404);
    const res = await request(app).get(`/api/photos/asset/${BEACH}/thumbnail`);
    expect(res.status).toBe(502);
  });
});
