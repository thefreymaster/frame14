import { describe, expect, it } from "vitest";
import { sceneAvailable, sceneName } from "../../src/lib/scenes";

describe("sceneAvailable", () => {
  it("takes whatever state Home Assistant gives but unavailable", () => {
    // An automation is on or off, a script off, a scene the time it last ran.
    for (const state of ["on", "off", "2026-11-12T20:00:00+00:00"]) expect(sceneAvailable(state)).toBe(true);
    expect(sceneAvailable("unavailable")).toBe(false);
    expect(sceneAvailable(undefined)).toBe(false);
    expect(sceneAvailable("")).toBe(false);
  });

  it("takes a scene that has never been turned on", () => {
    expect(sceneAvailable("unknown")).toBe(true);
  });
});

describe("sceneName", () => {
  it("is Home Assistant's name", () => {
    expect(sceneName("automation.new_automation_3", { friendly_name: " Living Room Movie Mode " })).toBe("Living Room Movie Mode");
  });

  it("is the id's words without one", () => {
    expect(sceneName("scene.movie_night")).toBe("Movie Night");
    expect(sceneName("script.good__night", { friendly_name: "  " })).toBe("Good Night");
  });
});
