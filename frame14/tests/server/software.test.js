import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const changelog = (version) =>
    `# Changelog\n\n## ${version}\n\n- Added: a thing, for ${version}.\n- Fixed: another.\n\n## 0.125.0\n\n- Changed: the old one.\n`;
  return {
    states: new Map(),
    connected: true,
    installUpdate: vi.fn(() => true),
    refreshEntity: vi.fn(() => true),
    reloadAddonStore: vi.fn(async () => ({})),
    changelog,
    fetchReleaseNotes: vi.fn(async () => changelog("0.126.0")),
  };
});

vi.mock("../../config.js", async (orig) => ({
  ...(await orig()),
  VERSION: "0.125.0",
  ADDON_NAME: "Frame14",
}));
vi.mock("../../ha-socket.js", () => ({
  getAllStates: () => mocks.states,
  isHaConnected: () => mocks.connected,
  installUpdate: mocks.installUpdate,
  refreshEntity: mocks.refreshEntity,
  reloadAddonStore: mocks.reloadAddonStore,
  fetchReleaseNotes: mocks.fetchReleaseNotes,
}));

import softwareRouter, { changelogSection } from "../../routes/software.js";

const app = express();
app.use("/api/software", softwareRouter);

function updateEntity(state, latest = "0.126.0", more = {}) {
  return {
    entity_id: "update.frame14_update",
    state,
    attributes: { title: "Frame14", installed_version: "0.125.0", latest_version: latest, release_url: "https://example.test/releases", ...more },
  };
}

beforeEach(() => {
  mocks.connected = true;
  mocks.installUpdate.mockClear();
  mocks.refreshEntity.mockClear();
  mocks.reloadAddonStore.mockReset();
  mocks.reloadAddonStore.mockResolvedValue({});
  mocks.fetchReleaseNotes.mockReset();
  mocks.fetchReleaseNotes.mockImplementation(async () => mocks.changelog("0.126.0"));
  mocks.states = new Map([
    ["update.home_assistant_core_update", { state: "off", attributes: { title: "Home Assistant Core" } }],
    ["update.frame14_update", updateEntity("on")],
  ]);
});

describe("GET /api/software", () => {
  it("finds the add-on's update entity by its title", async () => {
    const res = await request(app).get("/api/software");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      installed: "0.125.0",
      // config.yaml's own `url`, the repository whose releases the card links
      // (0.149.1).
      repoUrl: "https://github.com/thefreymaster/frame14",
      update: {
        entityId: "update.frame14_update",
        installed: "0.125.0",
        latest: "0.126.0",
        available: true,
        releaseUrl: "https://example.test/releases",
        inProgress: false,
        releaseNotes: "- Added: a thing, for 0.126.0.\n- Fixed: another.",
      },
    });
  });

  it("says an install is under way from the entity, whoever started it", async () => {
    mocks.states.set("update.frame14_update", updateEntity("on", "0.126.0", { in_progress: true, update_percentage: 42 }));
    const res = await request(app).get("/api/software");
    expect(res.body.update.inProgress).toBe(true);
    // No percentage (0.138): the Supervisor never filled it in, so none is passed on.
    expect(res.body.update).not.toHaveProperty("progress");
  });

  it("fetches a version's notes once, and leaves them out when there are none or Home Assistant can't", async () => {
    mocks.states.set("update.frame14_update", updateEntity("on", "0.130.0"));
    mocks.fetchReleaseNotes.mockImplementation(async () => mocks.changelog("0.130.0"));
    await request(app).get("/api/software");
    const res = await request(app).get("/api/software");
    expect(res.body.update.releaseNotes).toBe("- Added: a thing, for 0.130.0.\n- Fixed: another.");
    expect(mocks.fetchReleaseNotes).toHaveBeenCalledTimes(1);
    expect(mocks.fetchReleaseNotes).toHaveBeenCalledWith("update.frame14_update");

    // A changelog without the version's section: nothing to show.
    mocks.states.set("update.frame14_update", updateEntity("on", "0.131.0"));
    expect((await request(app).get("/api/software")).body.update.releaseNotes).toBeNull();

    // Home Assistant couldn't answer: nothing this time, asked again the next.
    mocks.states.set("update.frame14_update", updateEntity("on", "0.132.0"));
    mocks.fetchReleaseNotes.mockRejectedValueOnce(new Error("no Supervisor"));
    expect((await request(app).get("/api/software")).body.update.releaseNotes).toBeNull();
    mocks.fetchReleaseNotes.mockImplementation(async () => mocks.changelog("0.132.0"));
    expect((await request(app).get("/api/software")).body.update.releaseNotes).toMatch(/for 0.132.0/);

    // Nothing newer: no notes, and no fetch.
    mocks.fetchReleaseNotes.mockClear();
    mocks.states.set("update.frame14_update", updateEntity("off", "0.125.0"));
    expect((await request(app).get("/api/software")).body.update.releaseNotes).toBeNull();
    expect(mocks.fetchReleaseNotes).not.toHaveBeenCalled();
  });

  it("has no update outside the add-on", async () => {
    mocks.states.delete("update.frame14_update");
    const res = await request(app).get("/api/software");
    expect(res.body).toEqual({ installed: "0.125.0", repoUrl: "https://github.com/thefreymaster/frame14", update: null });
  });
});

describe("POST /api/software/install", () => {
  it("asks Home Assistant to install the newer version", async () => {
    const res = await request(app).post("/api/software/install");
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ ok: true, version: "0.126.0" });
    expect(mocks.installUpdate).toHaveBeenCalledWith("update.frame14_update");
  });

  it("is a 409 with nothing newer, a 404 without the entity, a 503 with HA down", async () => {
    mocks.states.set("update.frame14_update", updateEntity("off", "0.125.0"));
    expect((await request(app).post("/api/software/install")).status).toBe(409);
    mocks.states.delete("update.frame14_update");
    expect((await request(app).post("/api/software/install")).status).toBe(404);
    mocks.states.set("update.frame14_update", updateEntity("on"));
    mocks.installUpdate.mockReturnValueOnce(false);
    expect((await request(app).post("/api/software/install")).status).toBe(503);
  });
});

describe("POST /api/software/check", () => {
  it("is a 503 with Home Assistant down", async () => {
    mocks.connected = false;
    const res = await request(app).post("/api/software/check");
    expect(res.status).toBe(503);
    expect(mocks.reloadAddonStore).not.toHaveBeenCalled();
  });

  it("passes on Home Assistant's refusal as a 502", async () => {
    mocks.reloadAddonStore.mockRejectedValue(new Error("Unauthorized"));
    const res = await request(app).post("/api/software/check");
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/Unauthorized/);
  });

  it("reloads the store, refreshes the entity and answers with what it has", async () => {
    const res = await request(app).post("/api/software/check");
    expect(res.status).toBe(200);
    expect(mocks.reloadAddonStore).toHaveBeenCalled();
    expect(mocks.refreshEntity).toHaveBeenCalledWith("update.frame14_update");
    expect(res.body.installed).toBe("0.125.0");
    expect(res.body.update.latest).toBe("0.126.0");
    expect(Date.parse(res.body.checkedAt)).not.toBeNaN();
  }, 8_000);
});

describe("changelogSection", () => {
  const md = "# Changelog\r\n\r\n## 0.2.0\r\n\r\n- Added: two.\r\n- Fixed: one.\r\n\r\n## 0.1.0\r\n\r\n- Added: the first.\r\n";
  it("is the version's lines up to the next heading, trimmed, CRLF or not", () => {
    expect(changelogSection(md, "0.2.0")).toBe("- Added: two.\n- Fixed: one.");
    expect(changelogSection(md, "0.1.0")).toBe("- Added: the first.");
  });
  it("is null for a version without a section, an empty one, or no changelog", () => {
    expect(changelogSection(md, "0.3.0")).toBeNull();
    expect(changelogSection("## 0.4.0\n\n\n## 0.3.0\n- x", "0.4.0")).toBeNull();
    expect(changelogSection(null, "0.2.0")).toBeNull();
    expect(changelogSection(md, null)).toBeNull();
  });
});
