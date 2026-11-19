import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import express from "express";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// seen.js (0.178.0): what a camera saw when a notification went out. A local
// server stands in for Home Assistant: the camera's still (camera_proxy) and
// a clip under its /media/ view, each only with the token, and a record of
// every path asked for.

const STILL = Buffer.from("a jpeg from the porch");
const GIF = Buffer.from("GIF89a and ten seconds of the walk-up");
const TOKEN = "ha-token";

let dir;
let ha;
let haUrl;
const asked = [];
let stillReply;
let clipModified;

beforeAll(async () => {
  ha = http.createServer((req, res) => {
    asked.push({ path: req.url, auth: req.headers.authorization });
    if (req.headers.authorization !== `Bearer ${TOKEN}`) {
      res.writeHead(401);
      return res.end();
    }
    if (req.url === "/api/camera_proxy/camera.front_porch_high") return stillReply(res);
    if (req.url === "/media/local/snapshots/frame14_front_porch.gif") {
      res.writeHead(200, { "content-type": "image/gif", ...(clipModified ? { "last-modified": clipModified } : {}) });
      return res.end(GIF);
    }
    if (req.url === "/media/local/snapshots/notes.txt") {
      res.writeHead(200, { "content-type": "text/plain" });
      return res.end("not a clip");
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise((done) => ha.listen(0, "127.0.0.1", done));
  haUrl = `http://127.0.0.1:${ha.address().port}`;
});

afterAll(() => new Promise((done) => ha.close(done)));

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "frame14-seen-"));
  process.env.FRAME14_DATA_DIR = dir;
  asked.length = 0;
  clipModified = null;
  stillReply = (res) => {
    res.writeHead(200, { "content-type": "image/jpeg" });
    res.end(STILL);
  };
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.FRAME14_DATA_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

async function load(options = {}) {
  vi.resetModules();
  const mod = await import("../../seen.js");
  return { ...mod, seen: mod.startSeen({ haUrl, haToken: TOKEN, ...options }) };
}

const PORCH = {
  title: "Front Porch",
  message: "Someone's at the front door.",
  tag: "front-porch-person",
  url: "/cameras",
  camera: "camera.front_porch_high",
};
const CLIP = { tag: "front-porch-person", media: "/media/local/snapshots/frame14_front_porch.gif" };
const idOf = (sent) => sent.url.replace(/^\/seen\//, "");

describe("a notification that names a camera", () => {
  it("keeps the camera's still, taken with the token, and opens its page", async () => {
    const { seen } = await load();
    const sent = await seen.notification(PORCH);
    expect(sent).toEqual({ ...PORCH, url: expect.stringMatching(/^\/seen\/[A-Za-z0-9_-]{16}$/) });
    expect(asked).toEqual([{ path: "/api/camera_proxy/camera.front_porch_high", auth: `Bearer ${TOKEN}` }]);
    const id = idOf(sent);
    expect(seen.get(id)).toEqual({
      id,
      at: expect.any(String),
      camera: "camera.front_porch_high",
      title: "Front Porch",
      message: "Someone's at the front door.",
      still: `/api/seen/${id}/still`,
      clip: null,
    });
    const still = seen.file(id, "still");
    expect(still.type).toBe("image/jpeg");
    expect(fs.readFileSync(still.path)).toEqual(STILL);
    expect(seen.file(id, "clip")).toBeNull();
  });

  it("leaves one without a camera, or with something else for one, as it came", async () => {
    const { seen } = await load();
    const plain = { title: "Washer finished", message: "Move the clothes." };
    expect(await seen.notification(plain)).toBe(plain);
    for (const camera of ["light.porch", "camera.front porch", "camera.x/../../api/states", 5]) {
      const data = { ...PORCH, camera };
      expect(await seen.notification(data), String(camera)).toBe(data);
    }
    // Nothing to say, nothing kept.
    const empty = { camera: "camera.front_porch_high" };
    expect(await seen.notification(empty)).toBe(empty);
    expect(asked).toEqual([]);
  });

  it("still opens the page when the camera gives no picture, which says so", async () => {
    const { seen } = await load();
    stillReply = (res) => {
      res.writeHead(503);
      res.end();
    };
    let id = idOf(await seen.notification(PORCH));
    expect(seen.get(id).still).toBeNull();
    stillReply = (res) => {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<html>a sign-in page</html>");
    };
    id = idOf(await seen.notification(PORCH));
    expect(seen.get(id).still).toBeNull();
    expect(seen.file(id, "still")).toBeNull();
  });
});

describe("the clip", () => {
  it("goes to the newest moment with its tag, once", async () => {
    const { seen } = await load();
    const earlier = idOf(await seen.notification(PORCH));
    const other = idOf(await seen.notification({ ...PORCH, tag: "back-door" }));
    const latest = idOf(await seen.notification(PORCH));
    expect(await seen.attachClip(CLIP)).toMatchObject({ id: latest, clip: { url: `/api/seen/${latest}/clip`, type: "image/gif" } });
    expect(asked.at(-1)).toEqual({ path: CLIP.media, auth: `Bearer ${TOKEN}` });
    expect(fs.readFileSync(seen.file(latest, "clip").path)).toEqual(GIF);
    expect(seen.get(latest).clip).toEqual({ url: `/api/seen/${latest}/clip`, type: "image/gif" });
    // The next clip for the tag is the one before's; the other tag's untouched.
    expect((await seen.attachClip(CLIP)).id).toBe(earlier);
    expect(await seen.attachClip(CLIP)).toBeNull();
    expect(seen.get(other).clip).toBeNull();
  });

  it("is only ever a picture or video under Home Assistant's /media/", async () => {
    const { seen, mediaPathAllowed } = await load();
    await seen.notification(PORCH);
    asked.length = 0;
    for (const media of [
      "/api/states",
      "/media/local/../../api/states",
      "/media/local/./a.gif",
      "http://evil.example/media/local/a.gif",
      "//evil.example/media/local/a.gif",
      "/media/local/a b.gif",
      "/media/local/a.gif?x=/api",
      "/media/Local/a.gif",
      42,
    ]) {
      expect(mediaPathAllowed(media), String(media)).toBe(false);
      expect(await seen.attachClip({ ...CLIP, media }), String(media)).toBeNull();
    }
    expect(asked).toEqual([]);
    expect(mediaPathAllowed(CLIP.media)).toBe(true);
    // Under /media/ but no clip: refused, and the moment still waits for one.
    expect(await seen.attachClip({ ...CLIP, media: "/media/local/snapshots/notes.txt" })).toBeNull();
    expect(await seen.attachClip({ ...CLIP, media: "/media/local/snapshots/missing.gif" })).toBeNull();
    expect(await seen.attachClip(CLIP)).not.toBeNull();
  });

  it("isn't a file written before its moment: the last visit's, left behind by a recording that never ran", async () => {
    let t = Date.parse("2026-11-19T15:00:00Z");
    const { seen, STALE_CLIP_MS } = await load({ now: () => t });
    const id = idOf(await seen.notification(PORCH));
    clipModified = new Date(t - STALE_CLIP_MS - 1000).toUTCString();
    expect(await seen.attachClip(CLIP)).toBeNull();
    expect(seen.get(id).clip).toBeNull();
    // Written a few seconds after (the recording's length), it's this moment's.
    t += 10_000;
    clipModified = new Date(t).toUTCString();
    expect((await seen.attachClip(CLIP)).id).toBe(id);
  });

  it("waits CLIP_WINDOW_MS for its moment, no longer", async () => {
    let t = Date.parse("2026-11-19T15:00:00Z");
    const { seen, CLIP_WINDOW_MS } = await load({ now: () => t });
    await seen.notification(PORCH);
    t += CLIP_WINDOW_MS + 1;
    expect(await seen.attachClip(CLIP)).toBeNull();
  });
});

describe("what's kept", () => {
  it("the newest MAX_MOMENTS of the last week, the rest's files gone, across a restart", async () => {
    let t = Date.parse("2026-11-01T12:00:00Z");
    const { seen, MAX_MOMENTS, MAX_AGE_MS } = await load({ now: () => t });
    const first = idOf(await seen.notification(PORCH));
    const firstStill = seen.file(first, "still").path;
    const ids = [first];
    for (let i = 0; i < MAX_MOMENTS; i++) {
      t += 60_000;
      ids.push(idOf(await seen.notification(PORCH)));
    }
    expect(seen.get(first)).toBeNull();
    expect(fs.existsSync(firstStill)).toBe(false);
    expect(seen.get(ids[1])).not.toBeNull();

    const again = (await load({ now: () => t })).seen;
    expect(again.get(ids.at(-1)).still).toBe(`/api/seen/${ids.at(-1)}/still`);
    expect(fs.readFileSync(again.file(ids.at(-1), "still").path)).toEqual(STILL);

    // A week on, the next moment is the only one left.
    t += MAX_AGE_MS + 1;
    const later = idOf(await again.notification(PORCH));
    expect(ids.every((id) => again.get(id) === null)).toBe(true);
    expect(again.get(later)).not.toBeNull();
    expect(fs.readdirSync(path.join(dir, "seen")).sort()).toEqual([`${later}.jpg`, "seen.json"].sort());
  });
});

describe("GET /api/seen", () => {
  async function app() {
    const { seen } = await load();
    const router = (await import("../../routes/seen.js")).default;
    const a = express();
    a.locals.seen = seen;
    a.use("/api/seen", router);
    return { a, seen };
  }

  it("the moment, its still, and its clip once it has one", async () => {
    const { a, seen } = await app();
    const id = idOf(await seen.notification(PORCH));
    const moment = await request(a).get(`/api/seen/${id}`);
    expect(moment.status).toBe(200);
    expect(moment.headers["cache-control"]).toBe("no-store");
    expect(moment.body).toMatchObject({ id, title: "Front Porch", still: `/api/seen/${id}/still`, clip: null });

    const still = await request(a).get(`/api/seen/${id}/still`);
    expect(still.status).toBe(200);
    expect(still.headers["content-type"]).toBe("image/jpeg");
    expect(still.headers["cache-control"]).toMatch(/immutable/);
    expect(still.body).toEqual(STILL);

    expect((await request(a).get(`/api/seen/${id}/clip`)).status).toBe(404);
    await seen.attachClip(CLIP);
    const clip = await request(a).get(`/api/seen/${id}/clip`).buffer(true).parse((res, done) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => done(null, Buffer.concat(chunks)));
    });
    expect(clip.status).toBe(200);
    expect(clip.headers["content-type"]).toBe("image/gif");
    expect(clip.body).toEqual(GIF);
    // A video seeks: the file answers a range.
    const part = await request(a).get(`/api/seen/${id}/clip`).set("Range", "bytes=0-5");
    expect(part.status).toBe(206);
  });

  it("404 for an id that isn't one or a moment there isn't", async () => {
    const { a } = await app();
    for (const p of ["/api/seen/AAAAAAAAAAAAAAAA", "/api/seen/..%2F..%2Fseen.json", "/api/seen/x/still", "/api/seen/AAAAAAAAAAAAAAAA/clip"]) {
      expect((await request(a).get(p)).status, p).toBe(404);
    }
  });
});
