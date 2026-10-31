import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { openApiDocument, renderSwaggerUiHtml } from "../../openapi.js";
import docsRouter from "../../routes/docs.js";

describe("the OpenAPI document", () => {
  it("is OpenAPI 3 and describes the routes the pages use", () => {
    expect(openApiDocument.openapi).toMatch(/^3\./);
    expect(openApiDocument.info?.title).toBeTruthy();
    for (const path of [
      "/api", "/api/entities", "/api/software", "/api/connection", "/api/weather",
      "/api/home/weather", "/api/home/climate", "/api/home/calendar", "/api/energy",
      "/api/energy/today", "/api/circuits", "/api/change/{view}", "/api/screen", "/api/screen/{state}", "/api/screen/schedule",
    ]) {
      expect(openApiDocument.paths, path).toHaveProperty(path);
    }
  });

  it("gives every operation a summary and a response", () => {
    for (const [path, ops] of Object.entries(openApiDocument.paths)) {
      for (const [method, op] of Object.entries(ops)) {
        expect(op.summary ?? op.description, `${method.toUpperCase()} ${path}`).toBeTruthy();
        expect(Object.keys(op.responses ?? {}).length, `${method.toUpperCase()} ${path}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("GET /api/docs", () => {
  const app = express();
  app.use("/api/docs", docsRouter);

  it("serves the document and the Swagger UI page", async () => {
    const json = await request(app).get("/api/docs/openapi.json");
    expect(json.status).toBe(200);
    expect(json.body.openapi).toBe(openApiDocument.openapi);
    // The Swagger UI's static files sit under the same mount, which sends
    // the bare path on to its slash; a browser follows.
    const html = await request(app).get("/api/docs").redirects(1);
    expect(html.status).toBe(200);
    expect(html.text).toContain("swagger");
    expect(renderSwaggerUiHtml({ specUrl: "/api/docs/openapi.json" })).toContain("/api/docs/openapi.json");
  });
});
