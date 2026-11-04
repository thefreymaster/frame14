import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HAState } from "../../src/hooks/useEntity";
import type { LightAttrs } from "../../src/lib/lightModel";
import { renderWithProviders } from "./helpers/render";

// The lights' live states, as useEntity would hand them over, and the socket
// calls and the toaster around the drawer.
const live = vi.hoisted(() => ({
  states: {} as Record<string, HAState<LightAttrs> | undefined>,
  callService: vi.fn(),
  callLightService: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("../../src/hooks/useEntity", () => ({
  useEntity: (id: string) => ({ data: live.states[id] }),
}));
vi.mock("../../src/lib/callService", () => ({
  callService: live.callService,
  callLightService: live.callLightService,
}));
vi.mock("../../src/components/ui/toaster", () => ({
  toaster: { create: live.toast },
}));

import { LightDialog } from "../../src/components/LightDialog";
import { loadLightFavorites } from "../../src/lib/lightFavorites";

const S = (id: string, name: string, state: string, attributes: LightAttrs = {}): HAState<LightAttrs> => ({
  entity_id: id,
  state,
  attributes: { friendly_name: name, ...attributes },
  last_changed: "",
  last_updated: "",
});

beforeEach(() => {
  live.states = {
    "light.living_room": S("light.living_room", "Living Room", "on", { supported_color_modes: ["color_temp"], brightness: 204 }),
    "switch.plug": S("switch.plug", "Smart Plug", "off"),
    "light.porch": S("light.porch", "Porch", "on", { supported_color_modes: ["onoff"], icon: "mdi:mailbox" }),
  };
  live.callService.mockReset();
  live.callLightService.mockReset();
  live.toast.mockReset();
  live.callService.mockResolvedValue({ ok: true });
  live.callLightService.mockResolvedValue({ ok: true });
});

describe("LightDialog", () => {
  // 0.153.0: the star beside the close button.
  it("stars the light as this device's favourite from its header, and unstars it", async () => {
    renderWithProviders(<LightDialog entityId="light.living_room" onClose={vi.fn()} />);
    const dialog = await screen.findByRole("dialog");
    expect(screen.getByRole("heading", { name: "Living Room" })).toBeInTheDocument();
    const star = screen.getByRole("button", { name: "Favorite" });
    expect(star).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(star);
    expect(star).toHaveAttribute("aria-pressed", "true");
    expect(loadLightFavorites()).toEqual(["light.living_room"]);
    await userEvent.click(star);
    expect(star).toHaveAttribute("aria-pressed", "false");
    expect(loadLightFavorites()).toEqual([]);
    // A dimmable light's drawer is the dial's.
    expect(dialog.querySelector('[role="slider"][aria-label="Brightness"]')).not.toBeNull();
  });

  it("gives a switch the power switch, not the dial, and turns it on and off", async () => {
    const { rerender } = renderWithProviders(<LightDialog entityId="switch.plug" onClose={vi.fn()} />);
    await screen.findByRole("dialog");
    expect(screen.getByRole("heading", { name: "Smart Plug" })).toBeInTheDocument();
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.getByRole("button", { name: "Favorite" })).toBeInTheDocument();
    const power = screen.getByRole("checkbox");
    expect(power).not.toBeChecked();
    await userEvent.click(screen.getByText("Off", { exact: true }));
    expect(live.callService).toHaveBeenCalledWith("switch.plug", "turn_on");
    // The state it waits for, until Home Assistant reports it.
    expect(power).toBeChecked();
    live.states["switch.plug"] = S("switch.plug", "Smart Plug", "on");
    rerender(<LightDialog entityId="switch.plug" onClose={vi.fn()} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
    await userEvent.click(screen.getByText("On", { exact: true }));
    expect(live.callService).toHaveBeenLastCalledWith("switch.plug", "turn_off");
  });

  it("draws an on-off light's own icon over its switch, and toasts a refusal", async () => {
    live.callService.mockResolvedValue({ ok: false, error: "The bulb isn't answering" });
    renderWithProviders(<LightDialog entityId="light.porch" onClose={vi.fn()} />);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.querySelector('[data-mdi-icon="mailbox"]')).not.toBeNull();
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.getByRole("checkbox")).toBeChecked();
    await userEvent.click(screen.getByText("On", { exact: true }));
    expect(live.callService).toHaveBeenCalledWith("light.porch", "turn_off");
    await waitFor(() =>
      expect(live.toast).toHaveBeenCalledWith(expect.objectContaining({ type: "error", title: "Couldn't turn off Porch" })),
    );
    // Back as it was: the switch's control (the hidden input's property is
    // left to the browser's own click, under act's one render).
    expect(dialog.querySelector('[data-scope="switch"][data-part="control"]')).toHaveAttribute("data-state", "checked");
  });
});
