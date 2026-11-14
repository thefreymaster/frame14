import { createServer, request as httpRequest } from "node:http";
import { gzipSync } from "node:zlib";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import speedtestRouter, { DEFAULT_DOWNLOAD_BYTES, MAX_DOWNLOAD_BYTES } from "../../routes/speedtest.js";

// The speed test's routes over a real socket, as index.js mounts them (after
// express.json()): the bytes are counted, and a caller that leaves midway —
// which is how the page ends every transfer — must not take the server down.
let server;
let base;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/speedtest", speedtestRouter);
  server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}/api/speedtest`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

const MB = 1024 * 1024;

describe("GET /api/speedtest/ping", () => {
  it("answers at once with nothing, never from a cache", async () => {
    const res = await fetch(`${base}/ping`);
    expect(res.status).toBe(204);
    expect(res.headers.get("cache-control")).toBe("no-store, no-transform");
    expect(await res.text()).toBe("");
  });
});

describe("GET /api/speedtest/download", () => {
  it("sends exactly the bytes asked for, as a stream nothing may cache or recompress", async () => {
    const res = await fetch(`${base}/download?bytes=1000`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
    expect(res.headers.get("content-length")).toBe("1000");
    expect(res.headers.get("cache-control")).toBe("no-store, no-transform");
    expect(res.headers.get("content-encoding")).toBeNull();
    expect((await res.arrayBuffer()).byteLength).toBe(1000);
  });

  it("goes on past its one block of noise, to the byte", async () => {
    const bytes = 2.5 * MB + 7;
    const body = Buffer.from(await (await fetch(`${base}/download?bytes=${bytes}`)).arrayBuffer());
    expect(body.length).toBe(bytes);
  });

  it("sends bytes that don't compress, so nothing on the way flatters the speed", async () => {
    const body = Buffer.from(await (await fetch(`${base}/download?bytes=200000`)).arrayBuffer());
    expect(gzipSync(body).length).toBeGreaterThan(body.length * 0.99);
  });

  it("sends its default without a size, and never more than its most", async () => {
    // A HEAD is the GET without the body: the length it would have sent.
    const bare = await fetch(`${base}/download`, { method: "HEAD" });
    expect(bare.headers.get("content-length")).toBe(String(DEFAULT_DOWNLOAD_BYTES));
    const huge = await fetch(`${base}/download?bytes=999999999999`, { method: "HEAD" });
    expect(huge.headers.get("content-length")).toBe(String(MAX_DOWNLOAD_BYTES));
  });

  it("refuses a size that isn't a whole number above zero", async () => {
    for (const bytes of ["0", "-5", "1.5", "abc", "", "1e6", "1&bytes=2", "9999999999999"]) {
      const res = await fetch(`${base}/download?bytes=${bytes}`);
      expect(res.status, bytes).toBe(400);
      expect((await res.json()).error, bytes).toMatch(/whole number/);
    }
  });
});

describe("POST /api/speedtest/upload", () => {
  const upload = (body, headers = { "Content-Type": "application/octet-stream" }) =>
    fetch(`${base}/upload`, { method: "POST", body, headers });

  it("counts what it was sent and keeps none of it", async () => {
    const res = await upload(new Uint8Array(3 * MB + 11));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store, no-transform");
    expect(await res.json()).toEqual({ bytes: 3 * MB + 11 });
  });

  it("answers an empty body", async () => {
    expect(await (await fetch(`${base}/upload`, { method: "POST" })).json()).toEqual({ bytes: 0 });
  });

  it("answers a JSON body too, which express.json() read first", async () => {
    const body = JSON.stringify({ hello: "world" });
    const res = await upload(body, { "Content-Type": "application/json" });
    expect(await res.json()).toEqual({ bytes: body.length });
  });
});

describe("a caller that leaves midway", () => {
  const alive = async () => (await fetch(`${base}/ping`)).status;

  it("ends a download without taking the server down", async () => {
    const abort = new AbortController();
    const res = await fetch(`${base}/download?bytes=${MAX_DOWNLOAD_BYTES}`, { signal: abort.signal });
    const reader = res.body.getReader();
    const first = await reader.read();
    expect(first.value.byteLength).toBeGreaterThan(0);
    abort.abort();
    await expect(reader.read()).rejects.toThrow();
    // The server has noticed by the next turn or two of its loop.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(await alive()).toBe(204);
  });

  it("ends an upload without an answer, and the server goes on", async () => {
    const { port } = server.address();
    await new Promise((resolve) => {
      const req = httpRequest(
        { host: "127.0.0.1", port, path: "/api/speedtest/upload", method: "POST", headers: { "Content-Length": 50 * MB } },
        () => {
          throw new Error("an upload cut short was answered");
        },
      );
      req.on("error", resolve);
      // A megabyte of the fifty promised, then gone.
      req.write(Buffer.alloc(MB), () => req.destroy());
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(await alive()).toBe(204);
  });
});
