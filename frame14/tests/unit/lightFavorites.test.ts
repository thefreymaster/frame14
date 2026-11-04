import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  loadLightFavorites,
  setLightFavorite,
  useLightFavorites,
} from "../../src/lib/lightFavorites";

describe("lightFavorites", () => {
  it("starts with none, and keeps the lights starred in the order they were", () => {
    expect(loadLightFavorites()).toEqual([]);
    setLightFavorite("light.backyard", true);
    setLightFavorite("light.living_room", true);
    // Starring one twice changes nothing.
    setLightFavorite("light.backyard", true);
    expect(loadLightFavorites()).toEqual(["light.backyard", "light.living_room"]);
    expect(JSON.parse(localStorage.getItem("light-favorites")!)).toEqual(["light.backyard", "light.living_room"]);
  });

  it("unstars one, and drops the key with the last", () => {
    setLightFavorite("light.backyard", true);
    setLightFavorite("switch.plug", true);
    setLightFavorite("light.backyard", false);
    expect(loadLightFavorites()).toEqual(["switch.plug"]);
    setLightFavorite("switch.plug", false);
    expect(loadLightFavorites()).toEqual([]);
    expect(localStorage.getItem("light-favorites")).toBeNull();
  });

  it("reads a damaged list as what it can: entity ids only, each once", () => {
    localStorage.setItem("light-favorites", "not json");
    expect(loadLightFavorites()).toEqual([]);
    localStorage.setItem("light-favorites", JSON.stringify({ id: "light.backyard" }));
    expect(loadLightFavorites()).toEqual([]);
    localStorage.setItem("light-favorites", JSON.stringify(["light.backyard", 7, null, "nonsense", "light.backyard", "switch.plug"]));
    expect(loadLightFavorites()).toEqual(["light.backyard", "switch.plug"]);
  });

  it("hands React the same list until it changes, and re-renders when it does", () => {
    const { result } = renderHook(() => useLightFavorites());
    const before = result.current;
    expect(before).toEqual([]);
    expect(loadLightFavorites()).toBe(loadLightFavorites());
    act(() => setLightFavorite("light.backyard", true));
    expect(result.current).toEqual(["light.backyard"]);
    expect(result.current).not.toBe(before);
  });
});
