import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import iconsRouter from "../../routes/icons.js";

const app = express();
app.use("/api/icon", iconsRouter);

// 0.139: a Material Design Icons glyph by name, for a light's own icon.
describe("GET /api/icon/:name", () => {
  it("serves the set's SVG, cacheable for good", async () => {
    const res = await request(app).get("/api/icon/ceiling-light");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/image\/svg\+xml/);
    expect(res.headers["cache-control"]).toMatch(/immutable/);
    // supertest keeps an image's body as a Buffer.
    const svg = res.text ?? res.body.toString();
    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain('id="mdi-ceiling-light"');
  });

  it("is a 404 for a name the set hasn't got, and a 400 for what isn't a name", async () => {
    expect((await request(app).get("/api/icon/no-such-icon-here")).status).toBe(404);
    for (const bad of ["..%2Fpackage", "Ceiling-Light", "ceiling_light", "a-"]) {
      expect((await request(app).get(`/api/icon/${bad}`)).status, bad).toBe(400);
    }
  });
});
