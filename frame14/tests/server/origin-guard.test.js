import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { io as connect } from "socket.io-client";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { allowSocket, crossSite, refuseCrossSite } from "../../origin-guard.js";

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("crossSite", () => {
  const HOST = "192.168.1.10:4000";

  it("goes by Sec-Fetch-Site where the browser sends it: same-origin and typed-in pass", () => {
    expect(crossSite({ host: HOST, "sec-fetch-site": "same-origin" })).toBe(false);
    expect(crossSite({ host: HOST, "sec-fetch-site": "none" })).toBe(false);
    expect(crossSite({ host: HOST, "sec-fetch-site": "cross-site" })).toBe(true);
    // Another app under the same domain, or another port of the same host.
    expect(crossSite({ host: HOST, "sec-fetch-site": "same-site" })).toBe(true);
  });

  it("trusts the browser's word over a Host a proxy rewrote", () => {
    expect(crossSite({ host: "127.0.0.1:4000", origin: "https://frame.example.net", "sec-fetch-site": "same-origin" })).toBe(false);
  });

  it("without it, wants the Origin to be this server's: the Host, or X-Forwarded-Host", () => {
    expect(crossSite({ host: HOST, origin: `http://${HOST}` })).toBe(false);
    expect(crossSite({ host: HOST, origin: "http://evil.example" })).toBe(true);
    expect(crossSite({ host: HOST, origin: "http://192.168.1.10:8123" })).toBe(true);
    // Vite's dev proxy (changeOrigin) puts its target in the Host.
    expect(crossSite({ host: "localhost:4000", origin: "http://localhost:3000", "x-forwarded-host": "localhost:3000" })).toBe(false);
    expect(crossSite({ host: HOST, origin: "null" })).toBe(true);
  });

  it("lets through what isn't a browser's: Home Assistant's rest_command, curl", () => {
    expect(crossSite({ host: HOST })).toBe(false);
  });
});

describe("refuseCrossSite", () => {
  const app = express();
  app.use("/api", refuseCrossSite);
  app.get("/api/screen/off", (_req, res) => res.json({ ok: true }));
  app.post("/api/software/install", (_req, res) => res.status(202).json({ ok: true }));

  it("refuses another site's request with a 403, the route never reached", async () => {
    const off = await request(app).get("/api/screen/off").set("Sec-Fetch-Site", "cross-site");
    expect(off.status).toBe(403);
    expect(off.body).toEqual({ error: "Cross-site request refused" });
    const install = await request(app).post("/api/software/install").set("Origin", "http://evil.example");
    expect(install.status).toBe(403);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("refused POST /api/software/install from http://evil.example"));
  });

  it("passes the page's own requests and a rest_command's", async () => {
    expect((await request(app).get("/api/screen/off").set("Sec-Fetch-Site", "same-origin")).status).toBe(200);
    expect((await request(app).get("/api/screen/off")).status).toBe(200);
  });
});

describe("allowSocket", () => {
  let httpServer;
  let url;

  beforeAll(async () => {
    httpServer = createServer();
    new Server(httpServer, { allowRequest: allowSocket });
    await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${httpServer.address().port}`;
  });

  afterAll(() => new Promise((resolve) => httpServer.close(resolve)));

  /** Connects with these headers: "connected", or the refusal. */
  function handshake(headers) {
    return new Promise((resolve) => {
      const socket = connect(url, { transports: ["websocket"], extraHeaders: headers, reconnection: false });
      socket.on("connect", () => {
        socket.close();
        resolve("connected");
      });
      socket.on("connect_error", (e) => {
        socket.close();
        resolve(e.message);
      });
    });
  }

  it("refuses another site's socket, and takes the page's own", async () => {
    expect(await handshake({ origin: "http://evil.example" })).not.toBe("connected");
    expect(await handshake({ "sec-fetch-site": "same-site" })).not.toBe("connected");
    expect(await handshake({ origin: url })).toBe("connected");
    expect(await handshake({})).toBe("connected");
  });
});
