import { act, fireEvent, screen, waitFor } from "@testing-library/react";
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

import { LightsOnSection } from "../../src/components/LightsOnSection";

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

describe("LightsOnSection", () => {
  it("shows the lights that are on as the Lights page's tiles, alphabetical by the name shown, with the count and All off", () => {
    renderWithProviders(<LightsOnSection />);
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
    const { container, unmount } = renderWithProviders(<LightsOnSection />);
    expect(container).toBeEmptyDOMElement();
    unmount();

    live.states = {};
    const fresh = renderWithProviders(<LightsOnSection />);
    expect(fresh.container).toBeEmptyDOMElement();
  });

  it("a tap turns a light off, its tile leaves once reported, and the last one takes the card with it", async () => {
    const { container, rerender } = renderWithProviders(<LightsOnSection />);
    await userEvent.click(screen.getByRole("button", { name: "Living Room: 80%" }));
    expect(live.callService).toHaveBeenCalledWith("light.living_room", "turn_off");
    // Until Home Assistant reports it, the tile waits (its spinner) where it is.
    expect(tiles()).toEqual(["Kitchen Cabinet: 35%", "Living Room: 80%", "Smart Plug: On"]);

    live.states["light.living_room"] = light("light.living_room", "Living Room", "off", DIMMABLE);
    rerender(<LightsOnSection />);
    expect(tiles()).toEqual(["Kitchen Cabinet: 35%", "Smart Plug: On"]);
    expect(screen.getByText("2 on")).toBeInTheDocument();

    live.states["light.kitchen_cabinet_lights"] = light("light.kitchen_cabinet_lights", "Kitchen Cabinet Lights", "off", DIMMABLE);
    live.states["switch.plug"] = light("switch.plug", "Smart Plug", "off");
    rerender(<LightsOnSection />);
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps the tile whose drawer is open, off or not, until the drawer closes", async () => {
    // The hold's timer alone is faked: the drawer mounts a frame after it.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    live.lights = ["light.living_room"];
    const { container, rerender } = renderWithProviders(<LightsOnSection />);
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
    rerender(<LightsOnSection />);
    expect(tiles()).toEqual(["Living Room: Off"]);
    expect(screen.queryByText(/\d+ on/)).toBeNull();

    // Closed, the tile goes, and the card with it.
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
