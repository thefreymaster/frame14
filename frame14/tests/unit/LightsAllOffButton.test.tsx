import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "./helpers/render";

const calls = vi.hoisted(() => ({ callService: vi.fn(), exclude: ["light.aidens_hatch_light"] as string[] | undefined }));
vi.mock("../../src/lib/callService", () => ({ callService: calls.callService }));
// The add-on's light_all_off_exclude (0.145.0), as /api/entities hands it over.
vi.mock("../../src/hooks/useEntitiesConfig", () => ({
  useEntitiesConfig: () => ({ data: { lights: [], lightAllOffExclude: calls.exclude } }),
}));

import { LightsAllOffButton } from "../../src/components/LightsAllOffButton";

beforeEach(() => {
  calls.exclude = ["light.aidens_hatch_light"];
  calls.callService.mockReset();
  calls.callService.mockResolvedValue({ ok: true });
});

describe("LightsAllOffButton", () => {
  it("turns off every light that's on, but spares the ones light_all_off_exclude names", async () => {
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

  it("spares none when the option is empty, or before the config is in", async () => {
    for (const exclude of [[], undefined]) {
      calls.exclude = exclude;
      calls.callService.mockClear();
      const { unmount } = renderWithProviders(
        <LightsAllOffButton entityIds={["light.living_room", "light.aidens_hatch_light"]} />,
      );
      await userEvent.click(screen.getByRole("button", { name: "Turn off all lights" }));
      expect(calls.callService.mock.calls.map((c) => c[0])).toEqual(["light.living_room", "light.aidens_hatch_light"]);
      unmount();
    }
  });

  it("isn't there when only a spared light is on", () => {
    const { container } = renderWithProviders(
      <LightsAllOffButton entityIds={["light.aidens_hatch_light"]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
  // 0.154.0: a group's own, in its header on /lights.
  it("takes the name a group gives it, sparing the same lights", async () => {
    renderWithProviders(
      <LightsAllOffButton entityIds={["light.kitchen_cabinet", "light.aidens_hatch_light"]} label="Turn off Kitchen" />,
    );
    expect(screen.queryByRole("button", { name: "Turn off all lights" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Turn off Kitchen" }));
    expect(calls.callService.mock.calls).toEqual([["light.kitchen_cabinet", "turn_off"]]);
  });
});
