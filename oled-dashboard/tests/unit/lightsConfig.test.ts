import { describe, expect, it } from "vitest";
import {
  buildLightSections,
  LIGHT_TILE_COLUMNS_FLUID,
  sortLightSections,
} from "../../src/lib/lightsConfig";

const ids = [
  "light.living_room",
  "switch.sonoff_1001816bdb",
  "light.kitchen_main_lights",
  "light.front_porch",
];

describe("buildLightSections", () => {
  it("without rooms: one Lights group, then the Switches", () => {
    const sections = buildLightSections(ids);
    expect(sections.map((s) => s.title)).toEqual(["Lights", "Switches"]);
    expect(sections[0].entries.map((e) => e.entity_id)).toEqual([
      "light.living_room",
      "light.kitchen_main_lights",
      "light.front_porch",
    ]);
    expect(sections[1].entries.map((e) => e.entity_id)).toEqual([
      "switch.sonoff_1001816bdb",
    ]);
  });

  it("names a tile from its id, in title case", () => {
    const [lights] = buildLightSections(["light.kitchen_main_lights"]);
    expect(lights.entries[0].name).toBe("Kitchen Main Lights");
  });

  it("a section per room first, in the server's order, then Other lights", () => {
    const rooms = [
      { id: "kitchen", name: "Kitchen", lights: ["light.kitchen_main_lights"] },
      {
        id: "living_room",
        name: "Living Room",
        lights: ["light.living_room", "switch.sonoff_1001816bdb"],
      },
    ];
    const sections = buildLightSections(ids, rooms);
    expect(sections.map((s) => s.title)).toEqual([
      "Kitchen",
      "Living Room",
      "Other lights",
    ]);
    expect(sections[1].entries.map((e) => e.entity_id)).toEqual([
      "light.living_room",
      "switch.sonoff_1001816bdb",
    ]);
    expect(sections[2].entries.map((e) => e.entity_id)).toEqual([
      "light.front_porch",
    ]);
  });

  it("leaves out a room none of whose lights are configured", () => {
    const rooms = [{ id: "attic", name: "Attic", lights: ["light.attic"] }];
    expect(buildLightSections(ids, rooms).map((s) => s.title)).toEqual([
      "Lights",
      "Switches",
    ]);
  });

  it("puts a light in the first room that claims it", () => {
    const rooms = [
      { id: "a", name: "A", lights: ["light.living_room"] },
      { id: "b", name: "B", lights: ["light.living_room", "light.front_porch"] },
    ];
    const sections = buildLightSections(ids, rooms);
    expect(sections[0].entries.map((e) => e.entity_id)).toEqual([
      "light.living_room",
    ]);
    expect(sections[1].entries.map((e) => e.entity_id)).toEqual([
      "light.front_porch",
    ]);
  });

  it("keeps switches in no room under Switches when rooms exist", () => {
    const rooms = [{ id: "k", name: "Kitchen", lights: ["light.kitchen_main_lights"] }];
    const sections = buildLightSections(ids, rooms);
    expect(sections.map((s) => s.title)).toEqual([
      "Kitchen",
      "Other lights",
      "Switches",
    ]);
  });

  it("gives a light a lit bulb while on and a switch the same outlet either way", () => {
    const [lights, switches] = buildLightSections(ids);
    const bulb = lights.entries[0];
    const outlet = switches.entries[0];
    expect(bulb.Icon).not.toBe(bulb.ActiveIcon);
    expect(outlet.Icon).toBe(outlet.ActiveIcon);
  });

  it("returns nothing for no lights", () => {
    expect(buildLightSections([])).toEqual([]);
  });
});

describe("sortLightSections", () => {
  it("orders entries by the shown label, case aside, numbers in order", () => {
    const sections = buildLightSections([
      "light.lamp_10",
      "light.lamp_2",
      "light.beta",
      "light.alpha",
    ]);
    const sorted = sortLightSections(sections, (e) => e.name);
    expect(sorted[0].entries.map((e) => e.name)).toEqual([
      "Alpha",
      "Beta",
      "Lamp 2",
      "Lamp 10",
    ]);
  });

  it("sorts by the label given, not the id", () => {
    const sections = buildLightSections(["light.a", "light.b"]);
    const sorted = sortLightSections(sections, (e) =>
      e.entity_id === "light.a" ? "Zed" : "Apple",
    );
    expect(sorted[0].entries.map((e) => e.entity_id)).toEqual([
      "light.b",
      "light.a",
    ]);
  });

  it("leaves the input as it was", () => {
    const sections = buildLightSections(["light.b", "light.a"]);
    sortLightSections(sections, (e) => e.name);
    expect(sections[0].entries.map((e) => e.entity_id)).toEqual([
      "light.b",
      "light.a",
    ]);
  });
});

describe("the tile columns", () => {
  it("a desktop's third-width group takes as many 8rem tiles as fit", () => {
    expect(LIGHT_TILE_COLUMNS_FLUID).toBe("repeat(auto-fill, minmax(8rem, 1fr))");
  });
});
