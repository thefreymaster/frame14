import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HAState } from "../../src/hooks/useEntity";
import type { LightAttrs } from "../../src/lib/lightModel";
import { renderWithProviders } from "./helpers/render";

// The lights' live states, as useEntity / useEntities would hand them over,
// and the pieces around the buttons: the socket call and the toaster.
const live = vi.hoisted(() => ({
  states: {} as Record<string, HAState<LightAttrs> | undefined>,
  callService: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("../../src/hooks/useEntity", () => ({
  useEntity: (id: string) => ({ data: live.states[id] }),
  useEntities: (ids: string[]) => ids.map((id) => ({ data: live.states[id] })),
}));
vi.mock("../../src/lib/callService", () => ({
  callService: live.callService,
  callLightService: vi.fn(),
}));
vi.mock("../../src/components/ui/toaster", () => ({
  toaster: { create: live.toast },
}));

import { CameraDialog } from "../../src/components/CameraDialog";

const light = (id: string, name: string, state: string, attributes: LightAttrs = {}): HAState<LightAttrs> => ({
  entity_id: id,
  state,
  attributes: { friendly_name: name, ...attributes },
  last_changed: "",
  last_updated: "",
});

const LIGHTS = ["light.front_yard", "light.backyard", "light.front_porch", "light.gone"];

function dialogAt(props: Partial<React.ComponentProps<typeof CameraDialog>> = {}, onClose = vi.fn()) {
  return (
    <CameraDialog open title="Front Porch High" badge={<span>Live</span>} lights={LIGHTS} onClose={onClose} {...props}>
      <div data-testid="feed" />
    </CameraDialog>
  );
}

/** The Lights group's buttons: each one's name and whether it's pressed. */
const buttons = (group: HTMLElement) =>
  within(group).getAllByRole("button").map((b) => [b.getAttribute("aria-label"), b.getAttribute("aria-pressed")]);

beforeEach(() => {
  live.states = {
    "light.front_yard": light("light.front_yard", "Front Yard", "off"),
    "light.backyard": light("light.backyard", "Backyard", "off", { icon: "mdi:grill" }),
    "light.front_porch": light("light.front_porch", "Front Porch", "on", { rgb_color: [255, 171, 96] }),
    "light.gone": light("light.gone", "Gone", "unavailable"),
  };
  live.callService.mockReset();
  live.toast.mockReset();
  live.callService.mockResolvedValue({ ok: true });
});

describe("CameraDialog", () => {
  it("is a full-screen dialog named for the camera, holding its feed, its badge and the lights as buttons in name order", async () => {
    renderWithProviders(dialogAt());
    const dialog = await screen.findByRole("dialog", { name: "Front Porch High" });
    // The Dialog's own content, full size — not a sheet, whatever the device.
    expect(dialog.className).toContain("chakra-dialog__content");
    expect(within(dialog).getByTestId("feed")).toBeInTheDocument();
    expect(within(dialog).getByText("Live")).toBeInTheDocument();

    const group = within(dialog).getByRole("group", { name: "Lights" });
    // Alphabetical by name; the unavailable one left out; Front Porch is on.
    expect(buttons(group)).toEqual([
      ["Backyard", "false"],
      ["Front Porch", "true"],
      ["Front Yard", "false"],
    ]);
    // The backyard's own Home Assistant icon; the others the bulb.
    expect(within(group).getByRole("button", { name: "Backyard" }).querySelector('[data-mdi-icon="grill"]')).not.toBeNull();
    expect(within(group).getByRole("button", { name: "Front Yard" }).querySelector("svg")).not.toBeNull();
    expect(within(dialog).getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("a tap turns a light on or off, waiting on Home Assistant, and a refusal toasts", async () => {
    const { rerender } = renderWithProviders(dialogAt());
    const dialog = await screen.findByRole("dialog", { name: "Front Porch High" });
    const backyard = within(dialog).getByRole("button", { name: "Backyard" });
    await userEvent.click(backyard);
    expect(live.callService).toHaveBeenCalledWith("light.backyard", "turn_on");
    // Until Home Assistant reports it the button waits, and a second tap is ignored.
    expect(backyard).toHaveAttribute("aria-busy", "true");
    expect(backyard).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(backyard);
    expect(live.callService).toHaveBeenCalledTimes(1);

    live.states["light.backyard"] = light("light.backyard", "Backyard", "on", { icon: "mdi:grill" });
    rerender(dialogAt());
    expect(backyard).toHaveAttribute("aria-busy", "false");
    expect(backyard).toHaveAttribute("aria-pressed", "true");

    live.callService.mockResolvedValueOnce({ ok: false, error: "The bulb isn't answering" });
    const porch = within(dialog).getByRole("button", { name: "Front Porch" });
    await userEvent.click(porch);
    expect(live.callService).toHaveBeenLastCalledWith("light.front_porch", "turn_off");
    await waitFor(() => expect(porch).toHaveAttribute("aria-busy", "false"));
    expect(porch).toHaveAttribute("aria-pressed", "true");
    expect(live.toast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error", title: "Couldn't turn off Front Porch", description: "The bulb isn't answering" }),
    );
  });

  it("closes from its button", async () => {
    const onClose = vi.fn();
    renderWithProviders(dialogAt({}, onClose));
    const dialog = await screen.findByRole("dialog", { name: "Front Porch High" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("has no Lights group for a camera with none to control", async () => {
    renderWithProviders(dialogAt({ lights: [] }));
    const dialog = await screen.findByRole("dialog", { name: "Front Porch High" });
    expect(within(dialog).queryByRole("group", { name: "Lights" })).toBeNull();
    expect(within(dialog).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Close"]);
  });
});
