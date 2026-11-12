import { render, screen } from "@testing-library/react";
import { MdAutoAwesome, MdOutlinePalette } from "react-icons/md";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HAState } from "../../src/hooks/useEntity";
import type { SceneAttrs } from "../../src/lib/scenes";
import { renderWithProviders } from "./helpers/render";

// The configured scenes, their states, and whether the server has answered
// every subscribe.
const live = vi.hoisted(() => ({
  scenes: undefined as string[] | undefined,
  states: {} as Record<string, HAState<SceneAttrs> | undefined>,
  acked: true,
}));

vi.mock("../../src/hooks/useEntitiesConfig", () => ({
  useEntitiesConfig: () => ({ data: { scenes: live.scenes }, isPending: false }),
}));
vi.mock("../../src/hooks/useEntity", () => ({
  useEntity: (id: string) => ({ data: live.states[id] }),
  useEntities: (ids: string[]) => ids.map((id) => ({ data: live.states[id] })),
  useEntitiesAcked: () => live.acked,
}));
vi.mock("../../src/lib/callService", () => ({ runScene: vi.fn() }));
vi.mock("../../src/components/ui/toaster", () => ({ toaster: { create: vi.fn() } }));

import { ScenesCard } from "../../src/components/ScenesCard";

const scene = (id: string, name: string, state: string): HAState<SceneAttrs> => ({
  entity_id: id,
  state,
  attributes: { friendly_name: name },
  last_changed: "",
  last_updated: "",
});

const MOVIE = "automation.new_automation_3";
const READING = "scene.reading";

const tiles = () =>
  [...document.querySelectorAll("[data-scene-entry]")].map((el) => el.getAttribute("aria-label"));

beforeEach(() => {
  live.scenes = [MOVIE, READING];
  live.states = {
    [MOVIE]: scene(MOVIE, "Living Room Movie Mode", "on"),
    [READING]: scene(READING, "Reading", "unknown"),
  };
  live.acked = true;
});

describe("ScenesCard", () => {
  it("is a Scenes card with a tile per configured scene, in the option's order", () => {
    const { unmount } = renderWithProviders(<ScenesCard />);
    expect(screen.getByText("Scenes")).toBeInTheDocument();
    expect(tiles()).toEqual(["Run Living Room Movie Mode", "Run Reading"]);
    unmount();
    live.scenes = [READING, MOVIE];
    renderWithProviders(<ScenesCard />);
    expect(tiles()).toEqual(["Run Reading", "Run Living Room Movie Mode"]);
  });

  it("titles itself with a palette, Home Assistant's icon for scenes, not the sparkles (0.165.1)", () => {
    const drawn = (glyph: React.ReactElement) => render(glyph).container.querySelector("svg")!.innerHTML;
    renderWithProviders(<ScenesCard />);
    const glyph = screen.getByText("Scenes").closest(".chakra-card__header")!.querySelector("svg")!.innerHTML;
    expect(glyph).toBe(drawn(<MdOutlinePalette />));
    expect(glyph).not.toBe(drawn(<MdAutoAwesome />));
  });

  it("isn't there with no scenes configured", () => {
    live.scenes = [];
    const { container, unmount } = renderWithProviders(<ScenesCard />);
    expect(container).toBeEmptyDOMElement();
    unmount();
    // An older server's config has no list at all.
    live.scenes = undefined;
    expect(renderWithProviders(<ScenesCard />).container).toBeEmptyDOMElement();
  });

  it("leaves out a scene Home Assistant doesn't have, and the card with none it has", () => {
    live.states[READING] = undefined;
    const { unmount } = renderWithProviders(<ScenesCard />);
    expect(tiles()).toEqual(["Run Living Room Movie Mode"]);
    unmount();
    live.states[MOVIE] = scene(MOVIE, "Living Room Movie Mode", "unavailable");
    expect(renderWithProviders(<ScenesCard />).container).toBeEmptyDOMElement();
  });

  it("holds the card with placeholders while the states are on their way", () => {
    live.states = {};
    live.acked = false;
    renderWithProviders(<ScenesCard />);
    expect(screen.getByText("Scenes")).toBeInTheDocument();
    expect(tiles()).toEqual([]);
    expect(document.querySelectorAll(".chakra-skeleton").length).toBeGreaterThan(0);
  });
});
