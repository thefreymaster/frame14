import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "./helpers/render";

const calls = vi.hoisted(() => ({ callService: vi.fn() }));
vi.mock("../../src/lib/callService", () => ({ callService: calls.callService }));

import { LightsAllOffButton } from "../../src/components/LightsAllOffButton";

beforeEach(() => {
  calls.callService.mockReset();
  calls.callService.mockResolvedValue({ ok: true });
});

describe("LightsAllOffButton", () => {
  it("turns off every light that's on, but spares the kid's hatch light", async () => {
    renderWithProviders(
      <LightsAllOffButton entityIds={["light.living_room", "light.aidens_hatch_light", "switch.plug"]} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Turn off all lights" }));
    expect(calls.callService.mock.calls).toEqual([
      ["light.living_room", "turn_off"],
      ["switch.plug", "turn_off"],
    ]);
  });

  it("spins once pressed", async () => {
    renderWithProviders(<LightsAllOffButton entityIds={["light.living_room"]} />);
    const button = screen.getByRole("button", { name: "Turn off all lights" });
    await userEvent.click(button);
    expect(button).toHaveAttribute("data-loading");
  });

  it("isn't there when only the hatch light is on", () => {
    const { container } = renderWithProviders(
      <LightsAllOffButton entityIds={["light.aidens_hatch_light"]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
