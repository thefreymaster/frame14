import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MdLightbulb, MdOutlineLightbulb } from "react-icons/md";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HAState } from "../../src/hooks/useEntity";
import type { LightAttrs } from "../../src/lib/lightModel";
import { renderWithProviders } from "./helpers/render";

// The light's live state, as useEntity would hand it over, and the pieces
// around the tile: the socket call and the toaster.
const live = vi.hoisted(() => ({
  state: undefined as HAState<LightAttrs> | undefined,
  callService: vi.fn(),
  callLightService: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("../../src/hooks/useEntity", () => ({
  useEntity: () => ({ data: live.state }),
}));
vi.mock("../../src/lib/callService", () => ({
  callService: live.callService,
  callLightService: live.callLightService,
}));
vi.mock("../../src/components/ui/toaster", () => ({
  toaster: { create: live.toast },
}));

import { LightControl } from "../../src/components/LightControl";

const light = (state: string, attributes: LightAttrs = {}): HAState<LightAttrs> => ({
  entity_id: "light.living_room",
  state,
  attributes: { friendly_name: "Living Room", ...attributes },
  last_changed: "",
  last_updated: "",
});

function renderTile() {
  return renderWithProviders(
    <LightControl
      entity_id="light.living_room"
      name="Living Room"
      Icon={MdOutlineLightbulb}
      ActiveIcon={MdLightbulb}
      onOpen={vi.fn()}
    />,
  );
}

const tile = () => screen.getByRole("button");

beforeEach(() => {
  live.callService.mockReset();
  live.callLightService.mockReset();
  live.toast.mockReset();
  live.callService.mockResolvedValue({ ok: true });
  live.callLightService.mockResolvedValue({ ok: true });
});

/** A finger across the tile: down at `from`, moved to `to`, lifted there (x, in a 200px-wide tile at 0). */
function swipe(el: HTMLElement, from: number, to: number, dy = 0) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({ left: 0, width: 200, top: 0, height: 60, right: 200, bottom: 60, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
  const at = (clientX: number, clientY = 0) => ({ pointerId: 1, isPrimary: true, button: 0, clientX, clientY });
  fireEvent.pointerDown(el, at(from));
  fireEvent.pointerMove(el, at(from + (to > from ? 10 : -10), dy));
  fireEvent.pointerMove(el, at(to, dy));
  fireEvent.pointerUp(el, at(to, dy));
  // The release's click.
  fireEvent.click(el);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("LightControl", () => {
  it("shows the name and the brightness while on", () => {
    live.state = light("on", { brightness: 204, rgb_color: [255, 171, 96] });
    renderTile();
    expect(tile()).toHaveAttribute("aria-label", "Living Room: 80%");
    expect(tile()).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("reads Off while off", () => {
    live.state = light("off");
    renderTile();
    expect(tile()).toHaveAttribute("aria-label", "Living Room: Off");
    expect(tile()).toHaveAttribute("aria-pressed", "false");
  });

  it("renders nothing for an unavailable light", () => {
    live.state = light("unavailable");
    const { container } = renderTile();
    expect(container).toBeEmptyDOMElement();
  });

  it("a tap turns an on light off and waits for Home Assistant to say so", async () => {
    live.state = light("on", { brightness: 255 });
    const { rerender } = renderTile();
    await userEvent.click(tile());
    expect(live.callService).toHaveBeenCalledWith("light.living_room", "turn_off");
    expect(tile()).toHaveAttribute("aria-busy", "true");
    // A second tap while it waits does nothing.
    await userEvent.click(tile());
    expect(live.callService).toHaveBeenCalledTimes(1);
    // The light reports off: the wait is over.
    live.state = light("off");
    rerender(
      <LightControl entity_id="light.living_room" name="Living Room" Icon={MdOutlineLightbulb} ActiveIcon={MdLightbulb} onOpen={vi.fn()} />,
    );
    expect(tile()).toHaveAttribute("aria-busy", "false");
    expect(tile()).toHaveAttribute("aria-label", "Living Room: Off");
  });

  it("a refused call ends the wait with an error toast", async () => {
    live.state = light("off");
    live.callService.mockResolvedValue({ ok: false, error: "The bulb isn't answering" });
    renderTile();
    await userEvent.click(tile());
    expect(live.callService).toHaveBeenCalledWith("light.living_room", "turn_on");
    expect(tile()).toHaveAttribute("aria-busy", "false");
    expect(live.toast).toHaveBeenCalledWith({
      type: "error",
      title: "Couldn't turn on Living Room",
      description: "The bulb isn't answering",
    });
  });

  it("gives up after 15 seconds without a new state, with a toast", async () => {
    vi.useFakeTimers();
    live.state = light("off");
    renderTile();
    await act(async () => {
      tile().click();
    });
    expect(tile()).toHaveAttribute("aria-busy", "true");
    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });
    expect(tile()).toHaveAttribute("aria-busy", "false");
    expect(live.toast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error", title: "Living Room didn't turn on" }),
    );
  });

  // 0.139: a sideways swipe sets the brightness where the finger is.
  it("dims to where a swipe ends, showing the level until the light reports, and the release isn't a tap", async () => {
    live.state = light("on", { brightness: 204, supported_color_modes: ["brightness"] });
    renderTile();
    expect(screen.getByText("80%")).toBeInTheDocument();
    swipe(tile(), 20, 100);
    await act(async () => {});
    expect(live.callLightService).toHaveBeenCalledWith("light.living_room", { brightness_pct: 50 });
    expect(live.callService).not.toHaveBeenCalled();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(tile()).toHaveAttribute("aria-label", "Living Room: 50%");
    // Past the end: the slider's limits. An off light comes on at the level.
    live.state = light("off", { supported_color_modes: ["brightness"] });
    renderTile();
    const [, off] = screen.getAllByRole("button");
    swipe(off, 10, 400);
    await act(async () => {});
    expect(live.callLightService).toHaveBeenLastCalledWith("light.living_room", { brightness_pct: 100 });
    expect(off).toHaveAttribute("aria-label", "Living Room: 100%");
  });

  it("leaves an up-or-down drag to the page, and a switch has no swipe", async () => {
    live.state = light("on", { brightness: 204, supported_color_modes: ["brightness"] });
    renderTile();
    swipe(tile(), 20, 30, 60);
    await act(async () => {});
    expect(live.callLightService).not.toHaveBeenCalled();
    // That release's click was a tap.
    expect(live.callService).toHaveBeenCalledWith("light.living_room", "turn_off");
    live.callService.mockClear();
    live.state = light("on", { supported_color_modes: ["onoff"] });
    renderTile();
    const [, plain] = screen.getAllByRole("button");
    swipe(plain, 20, 150);
    await act(async () => {});
    expect(live.callLightService).not.toHaveBeenCalled();
    expect(live.callService).toHaveBeenCalledWith("light.living_room", "turn_off");
  });

  // 0.139: the light's own Home Assistant icon, drawn over its colour.
  it("draws the icon set for the light in Home Assistant, else the bulb", () => {
    live.state = light("on", { brightness: 204, icon: "mdi:ceiling-light" });
    renderTile();
    const glyph = tile().querySelector("[data-mdi-icon]");
    expect(glyph).toHaveAttribute("data-mdi-icon", "ceiling-light");
    expect(tile().querySelector("svg")).toBeNull();
    live.state = light("on", { brightness: 204 });
    renderTile();
    const [, plain] = screen.getAllByRole("button");
    expect(plain.querySelector("[data-mdi-icon]")).toBeNull();
    expect(plain.querySelector("svg")).not.toBeNull();
  });
});
