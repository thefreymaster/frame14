import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { resetStub } from "./helpers";
import { STUB_PORT } from "./ports";

// The REST API through the real server against the stub: once, not per device.
test.skip(({ isMobile }) => isMobile, "the API has no device");

test.beforeEach(async ({ request }) => {
  await resetStub(request);
});

test("GET /api is up, at config.yaml's version", async ({ request }) => {
  const version = readFileSync(new URL("../../config.yaml", import.meta.url), "utf-8").match(/^version:\s*"([^"]+)"/m)?.[1];
  const body = await (await request.get("/api")).json();
  expect(body).toMatchObject({ ok: true, version, screenType: "oled" });
});

test("GET /api/entities resolves the lights by room", async ({ request }) => {
  const body = await (await request.get("/api/entities")).json();
  // The room added the Floor Lamp; the plug indicator (a config entity) stayed out.
  expect(body.lights).toContain("light.living_room_floor_lamp");
  expect(body.lights).not.toContain("light.kitchen_plug_indicator");
  expect(body.rooms.map((r: { id: string }) => r.id)).toEqual([
    "living_room", "kitchen", "outside", "aidens_room", "basement", "evans_office", "primary_bedroom",
  ]);
  expect(body.rooms[0]).toEqual({
    id: "living_room",
    name: "Living Room",
    lights: ["light.living_room", "light.living_room_fireplace", "light.lady_lamp", "light.living_room_floor_lamp"],
  });
  expect(body.rooms[2].lights).toEqual(["light.backyard", "light.front_yard", "light.front_porch"]);
});

test("GET /api/home/climate names the thermostats by climate_names", async ({ request }) => {
  const body = await (await request.get("/api/home/climate")).json();
  expect(body.map((u: { name: string }) => u.name)).toEqual(["1st Floor AC", "2nd Floor AC", "3rd Floor AC", "Master Room AC"]);
  expect(body[0]).toMatchObject({ state: "heat", hvacAction: "heating", currentTemp: 64, targetTemp: 70, currentHumidity: 46 });
});

test("GET /api/circuits sorts the circuits by draw", async ({ request }) => {
  const body = await (await request.get("/api/circuits")).json();
  expect(body.totalWatts).toBe(1220.07);
  expect(body.balanceWatts).toBe(384.99);
  expect(body.circuits.map((c: { name: string }) => c.name)).toEqual([
    "Heat Pump 1", "Fridge", "Workshop/Basement", "Living Room", "Kitchen", "Heat Pump 2",
  ]);
  expect(body.circuits[0]).toEqual({ name: "Heat Pump 1", watts: 412, kwhToday: 3.2 });
});

test("GET /api/software finds the add-on's update entity", async ({ request }) => {
  const body = await (await request.get("/api/software")).json();
  expect(body.update).toMatchObject({ entityId: "update.frame14_update", available: false, latest: "0.0.0" });
  expect(typeof body.installed).toBe("string");
});

test("GET /api/connection reports the Home Assistant link", async ({ request }) => {
  const body = await (await request.get("/api/connection")).json();
  expect(body.homeAssistant).toEqual({ host: `127.0.0.1:${STUB_PORT}`, connected: true });
  expect(body.client.address).toBe("127.0.0.1");
});

test("GET /api/home/weather carries the hourly and daily forecasts", async ({ request }) => {
  const body = await (await request.get("/api/home/weather")).json();
  expect(body).toMatchObject({ state: "cloudy", temperature: 74, temperatureUnit: "°F", humidity: 65 });
  expect(body.forecastHours).toHaveLength(24);
  expect(body.forecastDaily).toHaveLength(10);
  expect(body.forecast).toHaveLength(8);
});

test("GET /api/home/calendar lists today's events from every calendar", async ({ request }) => {
  const body = await (await request.get("/api/home/calendar")).json();
  expect(body.entities).toEqual(["calendar.family", "calendar.evan"]);
  expect(body.today.map((e: { summary: string }) => e.summary)).toEqual(
    expect.arrayContaining(["School pickup", "Team standup"]),
  );
});

test("GET /api/home/vacuum and /api/home/fan read the devices", async ({ request }) => {
  const vacuums = await (await request.get("/api/home/vacuum")).json();
  expect(vacuums[0]).toMatchObject({ entity_id: "vacuum.roborock_q5_pro", state: "cleaning" });
  const fans = await (await request.get("/api/home/fan")).json();
  expect(fans.map((f: { entity_id: string }) => f.entity_id)).toEqual(["fan.living_room_ceiling_fan", "fan.aidens_fan"]);
});

test("GET /api/energy and /api/energy/today answer from the stub's statistics", async ({ request }) => {
  const energy = await (await request.get("/api/energy")).json();
  expect(energy).toEqual(expect.any(Object));
  const today = await request.get("/api/energy/today");
  expect(today.status()).toBe(200);
});

test("GET /api/docs/openapi.json is the API's own description", async ({ request }) => {
  const doc = await (await request.get("/api/docs/openapi.json")).json();
  expect(doc.openapi).toMatch(/^3\./);
  expect(Object.keys(doc.paths)).toEqual(expect.arrayContaining(["/api/entities", "/api/software", "/api/home/climate"]));
});
