import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HAState } from "../../src/hooks/useEntity";
import type { LightAttrs } from "../../src/lib/lightModel";
import { renderWithProviders } from "./helpers/render";

// The configured lights and their live states, as useEntitiesConfig and
// useEntities would hand them over, and the pieces around the tiles: the
// socket calls and the toaster.
const live = vi.hoisted(() => ({
  lights: [] as string[],
  states: {} as Record<string, HAState<LightAttrs> | undefined>,
  callService: vi.fn(),
  callLightService: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("../../src/hooks/useEntitiesConfig", () => ({
  useEntitiesConfig: () => ({ data: { lights: live.lights }, isPending: false }),
}));
vi.mock("../../src/hooks/useEntity", () => ({
  useEntity: (id: string) => ({ data: live.states[id] }),
  useEntities: (ids: string[]) => ids.map((id) => ({ data: live.states[id] })),
}));
vi.mock("../../src/lib/callService", () => ({
  callService: live.callService,
  callLightService: live.callLightService,
}));
vi.mock("../../src/components/ui/toaster", () => ({
  toaster: { create: live.toast },
}));

import { HomeLightsSection } from "../../src/components/HomeLightsSection";
import { setLightFavorite } from "../../src/lib/lightFavorites";

const DIMMABLE: LightAttrs = { supported_color_modes: ["color_temp", "xy"] };

const light = (id: string, name: string, state: string, attributes: LightAttrs = {}): HAState<LightAttrs> => ({
  entity_id: id,
  state,
  attributes: { friendly_name: name, ...attributes },
  last_changed: "",
  last_updated: "",
});

/** The tiles on the card, by the label each carries. */
const tiles = () =>
  [...document.querySelectorAll("[data-light-entry]")].map((el) => el.getAttribute("aria-label"));

beforeEach(() => {
  live.lights = ["light.living_room", "light.kitchen_cabinet_lights", "light.backyard", "switch.plug"];
  live.states = {
    "light.living_room": light("light.living_room", "Living Room", "on", { ...DIMMABLE, brightness: 204, rgb_color: [255, 171, 96] }),
    "light.kitchen_cabinet_lights": light("light.kitchen_cabinet_lights", "Kitchen Cabinet Lights", "on", { ...DIMMABLE, brightness: 89 }),
    "light.backyard": light("light.backyard", "Backyard", "off", DIMMABLE),
    "switch.plug": light("switch.plug", "Smart Plug", "on"),
  };
  live.callService.mockReset();
  live.callLightService.mockReset();
  live.toast.mockReset();
  live.callService.mockResolvedValue({ ok: true });
  live.callLightService.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("HomeLightsSection", () => {
  it("shows the lights that are on as the Lights page's tiles, alphabetical by the name shown, with the count and All off", () => {
    renderWithProviders(<HomeLightsSection />);
    expect(screen.getByRole("heading", { name: "Lights" })).toBeInTheDocument();
    expect(screen.getByText("3 on")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Turn off all lights" })).toBeInTheDocument();
    // The word Lights dropped from a name, as on the page; Backyard is off.
    expect(tiles()).toEqual(["Kitchen Cabinet: 35%", "Living Room: 80%", "Smart Plug: On"]);
  });

  it("renders nothing while no light is on, and before the states are in", () => {
    live.states = {
      ...live.states,
      "light.living_room": light("light.living_room", "Living Room", "off", DIMMABLE),
      "light.kitchen_cabinet_lights": light("light.kitchen_cabinet_lights", "Kitchen Cabinet Lights", "off", DIMMABLE),
      "switch.plug": light("switch.plug", "Smart Plug", "off"),
    };
    const { container, unmount } = renderWithProviders(<HomeLightsSection />);
    expect(container).toBeEmptyDOMElement();
    unmount();

    live.states = {};
    const fresh = renderWithProviders(<HomeLightsSection />);
    expect(fresh.container).toBeEmptyDOMElement();
  });

  it("a tap turns a light off, its tile leaves once reported, and the last one takes the card with it", async () => {
    const { container, rerender } = renderWithProviders(<HomeLightsSection />);
    await userEvent.click(screen.getByRole("button", { name: "Living Room: 80%" }));
    expect(live.callService).toHaveBeenCalledWith("light.living_room", "turn_off");
    // Until Home Assistant reports it, the tile waits (its spinner) where it is.
    expect(tiles()).toEqual(["Kitchen Cabinet: 35%", "Living Room: 80%", "Smart Plug: On"]);

    live.states["light.living_room"] = light("light.living_room", "Living Room", "off", DIMMABLE);
    rerender(<HomeLightsSection />);
    expect(tiles()).toEqual(["Kitchen Cabinet: 35%", "Smart Plug: On"]);
    expect(screen.getByText("2 on")).toBeInTheDocument();

    live.states["light.kitchen_cabinet_lights"] = light("light.kitchen_cabinet_lights", "Kitchen Cabinet Lights", "off", DIMMABLE);
    live.states["switch.plug"] = light("switch.plug", "Smart Plug", "off");
    rerender(<HomeLightsSection />);
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps the tile whose drawer is open, off or not, until the drawer closes", async () => {
    // The hold's timer alone is faked: the drawer mounts a frame after it.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    live.lights = ["light.living_room"];
    const { container, rerender } = renderWithProviders(<HomeLightsSection />);
    const tile = screen.getByRole("button", { name: "Living Room: 80%" });
    // A hold opens the drawer.
    fireEvent.pointerDown(tile, { pointerId: 1, isPrimary: true, button: 0, clientX: 10, clientY: 10 });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.pointerUp(tile, { pointerId: 1, isPrimary: true, button: 0, clientX: 10, clientY: 10 });
    // The release's click, which the hold swallows.
    fireEvent.click(tile);
    vi.useRealTimers();
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Living Room");

    // The light turned off from it: the tile stays, and so does the card.
    live.states["light.living_room"] = light("light.living_room", "Living Room", "off", DIMMABLE);
    rerender(<HomeLightsSection />);
    expect(tiles()).toEqual(["Living Room: Off"]);
    expect(screen.queryByText(/\d+ on/)).toBeNull();

    // Closed, the tile goes, and the card with it.
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
  // 0.153.0: the favourites, the star in a light's drawer, in place of the
  // lights that are on.
  it("shows this device's favourites, on or off, in place of the lights that are on, with their count and All off", async () => {
    setLightFavorite("light.living_room", true);
    setLightFavorite("light.backyard", true);
    // One the config no longer has is left out.
    setLightFavorite("light.gone", true);
    renderWithProviders(<HomeLightsSection />);
    expect(screen.getByRole("heading", { name: "Lights" })).toBeInTheDocument();
    expect(tiles()).toEqual(["Backyard: Off", "Living Room: 80%"]);
    // The count and All off are the card's: Kitchen Cabinet and the plug are
    // on, but not favourites.
    expect(screen.getByText("1 on")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Turn off all lights" }));
    expect(live.callService.mock.calls).toEqual([["light.living_room", "turn_off"]]);
  });

  it("follows a light starred or unstarred live, and goes back to the lights that are on with none", () => {
    renderWithProviders(<HomeLightsSection />);
    expect(tiles()).toEqual(["Kitchen Cabinet: 35%", "Living Room: 80%", "Smart Plug: On"]);

    act(() => setLightFavorite("light.backyard", true));
    expect(tiles()).toEqual(["Backyard: Off"]);
    // None of the card's lights on: no count and no All off.
    expect(screen.queryByText(/\d+ on/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Turn off all lights" })).toBeNull();

    act(() => setLightFavorite("switch.plug", true));
    expect(tiles()).toEqual(["Backyard: Off", "Smart Plug: On"]);
    expect(screen.getByText("1 on")).toBeInTheDocument();

    act(() => {
      setLightFavorite("light.backyard", false);
      setLightFavorite("switch.plug", false);
    });
    expect(tiles()).toEqual(["Kitchen Cabinet: 35%", "Living Room: 80%", "Smart Plug: On"]);
  });

  it("renders nothing while every favourite is unavailable, though lights are on", () => {
    setLightFavorite("light.backyard", true);
    live.states["light.backyard"] = light("light.backyard", "Backyard", "unavailable", DIMMABLE);
    const { container } = renderWithProviders(<HomeLightsSection />);
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps a favourite's tile while its drawer unstars it, until the drawer closes", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    setLightFavorite("light.backyard", true);
    setLightFavorite("light.living_room", true);
    renderWithProviders(<HomeLightsSection />);
    const tile = screen.getByRole("button", { name: "Backyard: Off" });
    fireEvent.pointerDown(tile, { pointerId: 1, isPrimary: true, button: 0, clientX: 10, clientY: 10 });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.pointerUp(tile, { pointerId: 1, isPrimary: true, button: 0, clientX: 10, clientY: 10 });
    fireEvent.click(tile);
    vi.useRealTimers();
    const dialog = await screen.findByRole("dialog");
    const star = within(dialog).getByRole("button", { name: "Favorite" });
    expect(star).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(star);
    expect(star).toHaveAttribute("aria-pressed", "false");
    expect(tiles()).toEqual(["Backyard: Off", "Living Room: 80%"]);

    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(tiles()).toEqual(["Living Room: 80%"]));
  });
});
