import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import ece from "http_ece";
import express from "express";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// push.js (0.160.0): the phones' notifications. A local server stands in for
// a push service (FRAME14_PUSH_ORIGINS lets its origin through), and each
// "phone" is a real key pair, so what arrives is decrypted and read.

let dir;
let service;
let origin;
const received = [];
let reply = 201;

beforeAll(async () => {
  service = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      received.push({ path: req.url, headers: req.headers, body: Buffer.concat(chunks) });
      res.writeHead(reply);
      res.end();
    });
  });
  await new Promise((done) => service.listen(0, "127.0.0.1", done));
  origin = `http://127.0.0.1:${service.address().port}`;
});

afterAll(() => new Promise((done) => service.close(done)));

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "frame14-push-"));
  process.env.FRAME14_DATA_DIR = dir;
  process.env.FRAME14_PUSH_ORIGINS = origin;
  received.length = 0;
  reply = 201;
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.FRAME14_DATA_DIR;
  delete process.env.FRAME14_PUSH_ORIGINS;
  fs.rmSync(dir, { recursive: true, force: true });
});

async function load() {
  vi.resetModules();
  return import("../../push.js");
}

/** A browser's side of a subscription: its keys, and the subscription it hands over. */
function phone(name) {
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();
  const auth = crypto.randomBytes(16).toString("base64url");
  return {
    ecdh,
    auth,
    subscription: {
      endpoint: `${origin}/push/${name}`,
      keys: { p256dh: ecdh.getPublicKey().toString("base64url"), auth },
    },
    /** What arrived at its endpoint, decrypted. */
    read() {
      const hit = received.find((r) => r.path === `/push/${name}`);
      if (!hit) return null;
      return JSON.parse(ece.decrypt(hit.body, { version: "aes128gcm", privateKey: ecdh, authSecret: auth }).toString());
    },
  };
}

describe("what it takes", () => {
  it("a subscription from a push service, with its keys", async () => {
    const { normaliseSubscription } = await load();
    const keys = { p256dh: "BOrXQ_lJ5w", auth: "c2VjcmV0" };
    for (const endpoint of [
      "https://fcm.googleapis.com/fcm/send/abc",
      "https://web.push.apple.com/QF0abc",
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://wns2-par02p.notify.windows.com/w/?token=abc",
    ]) {
      expect(normaliseSubscription({ endpoint, keys, expirationTime: null }), endpoint).toEqual({ endpoint, keys });
    }
    for (const endpoint of [
      "http://fcm.googleapis.com/fcm/send/abc",
      "https://example.com/push",
      "https://fcm.googleapis.com.example.com/x",
      "https://192.168.1.10:8123/api",
      "not a url",
    ]) {
      expect(normaliseSubscription({ endpoint, keys }), endpoint).toBeNull();
    }
    const endpoint = "https://fcm.googleapis.com/fcm/send/abc";
    expect(normaliseSubscription({ endpoint })).toBeNull();
    expect(normaliseSubscription({ endpoint, keys: { p256dh: "a b", auth: "x" } })).toBeNull();
    expect(normaliseSubscription(null)).toBeNull();
  });

  it("a notification with a title or a message; a tap opens one of the app's pages", async () => {
    const { normaliseNotification } = await load();
    expect(normaliseNotification({ title: " Washer finished ", message: "Move the clothes.", tag: "appliance-washer" })).toEqual({
      title: "Washer finished", body: "Move the clothes.", tag: "appliance-washer", url: "/home",
    });
    expect(normaliseNotification({ message: "Just text" })).toEqual({ title: "Frame14", body: "Just text", url: "/home" });
    expect(normaliseNotification({ title: "x", url: "/energy/circuits" }).url).toBe("/energy/circuits");
    for (const url of ["https://example.com", "//example.com", "/\\example.com", "javascript:alert(1)", "/a b"]) {
      expect(normaliseNotification({ title: "x", url }).url, url).toBe("/home");
    }
    expect(normaliseNotification({ title: "x".repeat(500) }).title).toHaveLength(120);
    expect(normaliseNotification({})).toBeNull();
    expect(normaliseNotification({ title: "  ", message: 5 })).toBeNull();
  });
});

describe("the keys and the subscriptions", () => {
  it("makes the key pair once and keeps it", async () => {
    const first = (await load()).startPush().publicKey();
    expect(first).toMatch(/^[A-Za-z0-9_-]{87}$/);
    expect(JSON.parse(fs.readFileSync(path.join(dir, "vapid.json"), "utf-8")).publicKey).toBe(first);
    expect((await load()).startPush().publicKey()).toBe(first);
  });

  it("keeps a device once, across a restart, and forgets it when asked", async () => {
    const a = phone("a");
    let push = (await load()).startPush();
    expect(push.subscribe(a.subscription)).toEqual(a.subscription);
    push.subscribe(a.subscription);
    expect(push.count()).toBe(1);
    expect(push.subscribe({ endpoint: "https://example.com/x", keys: a.subscription.keys })).toBeNull();
    push = (await load()).startPush();
    expect(push.has(a.subscription.endpoint)).toBe(true);
    expect(push.unsubscribe(a.subscription.endpoint)).toBe(true);
    expect(push.unsubscribe(a.subscription.endpoint)).toBe(false);
    expect((await load()).startPush().count()).toBe(0);
  });

  it("drops every subscription when the keys are new: they were made for the old ones", async () => {
    (await load()).startPush().subscribe(phone("a").subscription);
    fs.rmSync(path.join(dir, "vapid.json"));
    expect((await load()).startPush().count()).toBe(0);
  });

  it("keeps the latest MAX_SUBSCRIPTIONS devices", async () => {
    const { startPush, MAX_SUBSCRIPTIONS } = await load();
    const push = startPush();
    const keys = phone("k").subscription.keys;
    for (let i = 0; i <= MAX_SUBSCRIPTIONS; i++) push.subscribe({ endpoint: `${origin}/push/${i}`, keys });
    expect(push.count()).toBe(MAX_SUBSCRIPTIONS);
    expect(push.has(`${origin}/push/0`)).toBe(false);
    expect(push.has(`${origin}/push/${MAX_SUBSCRIPTIONS}`)).toBe(true);
  });
});

describe("sending", () => {
  it("encrypts the notification to every device, signed with the add-on's key", async () => {
    const a = phone("a");
    const b = phone("b");
    const push = (await load()).startPush();
    push.subscribe(a.subscription);
    push.subscribe(b.subscription);
    const result = await push.notify({ title: "Dryer finished", message: "Clothes are dry and ready to fold.", tag: "appliance-dryer" });
    expect(result).toEqual({ sent: 2, failed: 0 });
    const expected = { title: "Dryer finished", body: "Clothes are dry and ready to fold.", tag: "appliance-dryer", url: "/home" };
    expect(a.read()).toEqual(expected);
    expect(b.read()).toEqual(expected);
    const { headers } = received[0];
    expect(headers["content-encoding"]).toBe("aes128gcm");
    expect(headers.urgency).toBe("high");
    expect(headers.topic).toBe("appliance-dryer");
    expect(Number(headers.ttl)).toBe(6 * 60 * 60);
    expect(headers.authorization).toMatch(new RegExp(`^vapid t=[^,]+, k=${push.publicKey()}$`));
  });

  it("sends a test to the one device", async () => {
    const a = phone("a");
    const b = phone("b");
    const push = (await load()).startPush();
    push.subscribe(a.subscription);
    push.subscribe(b.subscription);
    expect(await push.notify({ title: "Test" }, { endpoint: b.subscription.endpoint })).toEqual({ sent: 1, failed: 0 });
    expect(a.read()).toBeNull();
    expect(b.read()).toMatchObject({ title: "Test" });
  });

  it("drops a device its push service says is gone, and keeps one that only failed", async () => {
    const push = (await load()).startPush();
    push.subscribe(phone("a").subscription);
    reply = 500;
    expect(await push.notify({ title: "x" })).toEqual({ sent: 0, failed: 1 });
    expect(push.count()).toBe(1);
    reply = 410;
    expect(await push.notify({ title: "x" })).toEqual({ sent: 0, failed: 1 });
    expect(push.count()).toBe(0);
    expect((await load()).startPush().count()).toBe(0);
  });

  it("sends nothing without a title or a message", async () => {
    const push = (await load()).startPush();
    push.subscribe(phone("a").subscription);
    expect(await push.notify({ tag: "x" })).toBeNull();
    expect(received).toEqual([]);
  });
});

describe("the routes", () => {
  async function app() {
    const { startPush } = await load();
    const { default: router } = await import("../../routes/push.js");
    const a = express();
    a.use(express.json());
    a.locals.push = startPush();
    a.use("/api/push", router);
    return a;
  }

  it("hands out the key, and subscribes, tests and unsubscribes a device", async () => {
    const a = await app();
    const key = await request(a).get("/api/push/key");
    expect(key.body.publicKey).toBe(a.locals.push.publicKey());
    const p = phone("a");
    expect((await request(a).post("/api/push/subscribe").send(p.subscription)).status).toBe(200);
    expect(a.locals.push.has(p.subscription.endpoint)).toBe(true);
    const test = await request(a).post("/api/push/test").send({ endpoint: p.subscription.endpoint });
    expect(test.status).toBe(200);
    expect(p.read()).toMatchObject({ title: "Frame14", body: "Notifications are on for this device.", url: "/control/device" });
    const off = await request(a).post("/api/push/unsubscribe").send({ endpoint: p.subscription.endpoint });
    expect(off.body).toEqual({ ok: true, removed: true });
  });

  it("refuses what isn't a push service's subscription, and a test for a device that isn't subscribed", async () => {
    const a = await app();
    const bad = await request(a).post("/api/push/subscribe").send({ endpoint: "https://example.com/hook", keys: { p256dh: "x", auth: "y" } });
    expect(bad.status).toBe(400);
    expect((await request(a).post("/api/push/test").send({ endpoint: "https://fcm.googleapis.com/x" })).status).toBe(404);
    expect((await request(a).post("/api/push/unsubscribe").send({})).status).toBe(400);
  });

  it("says so when the push service refuses the test", async () => {
    const a = await app();
    const p = phone("a");
    await request(a).post("/api/push/subscribe").send(p.subscription);
    reply = 400;
    expect((await request(a).post("/api/push/test").send({ endpoint: p.subscription.endpoint })).status).toBe(502);
  });
});
