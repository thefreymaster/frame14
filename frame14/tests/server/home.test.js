// routes/home.js's calendars: the ones `calendar_exclude` names (an option
// since 0.145.0; calendar.radarr was hard-coded before) are left out.
import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ exclude: ["calendar.radarr"] }));

vi.mock("../../config.js", async (orig) => ({
  ...(await orig()),
  HA_URL: "http://ha.test",
  HA_TOKEN: "test-token",
}));
vi.mock("../../entities.js", () => ({
  ENTITIES: {
    get calendarExclude() {
      return mocks.exclude;
    },
  },
}));

import homeRouter from "../../routes/home.js";

const app = express();
app.use("/api/home", homeRouter);

afterEach(() => vi.unstubAllGlobals());

describe("the calendars", () => {
  it("leaves out the ones calendar_exclude names", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => ({
        ok: true,
        json: async () =>
          String(url).endsWith("/api/calendars")
            ? [
                { entity_id: "calendar.family", name: "Family" },
                { entity_id: "calendar.radarr", name: "Radarr" },
              ]
            : [],
      })),
    );
    const res = await request(app).get("/api/home/calendar/agenda?days=1");
    expect(res.status).toBe(200);
    expect(res.body.calendars.map((c) => c.entity_id)).toEqual(["calendar.family"]);
  });
});
