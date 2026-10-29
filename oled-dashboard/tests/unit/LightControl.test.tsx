import { act, screen } from "@testing-library/react";
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
  toast: vi.fn(),
}));

vi.mock("../../src/hooks/useEntity", () => ({
  useEntity: () => ({ data: live.state }),
}));
vi.mock("../../src/lib/callService", () => ({
  callService: live.callService,
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
  live.toast.mockReset();
  live.callService.mockResolvedValue({ ok: true });
});

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
});
