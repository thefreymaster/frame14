import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HAState } from "../../src/hooks/useEntity";
import type { LightRoom } from "../../src/hooks/useEntitiesConfig";
import { renderWithProviders } from "./helpers/render";

// The rooms as /api/entities answers them, the live states, and the video
// stood in for (it would ask the server for a stream).
const live = vi.hoisted(() => ({
  rooms: [] as LightRoom[],
  states: {} as Record<string, HAState | undefined>,
}));

vi.mock("../../src/hooks/useEntitiesConfig", () => ({
  useEntitiesConfig: () => ({ data: { lights: [], rooms: live.rooms }, isPending: false }),
}));
vi.mock("../../src/hooks/useEntity", () => ({
  useEntity: (id: string) => ({ data: live.states[id] }),
  useEntities: (ids: string[]) => ids.map((id) => ({ data: live.states[id] })),
}));
vi.mock("../../src/components/CameraVideo", () => ({
  CameraVideo: ({ fit }: { fit?: string }) => <video data-testid="video" data-fit={fit ?? "cover"} />,
}));
vi.mock("../../src/lib/callService", () => ({
  callService: vi.fn(async () => ({ ok: true })),
  callLightService: vi.fn(),
}));
vi.mock("../../src/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
}));

import { CameraCard } from "../../src/components/CameraCard";

const entity = (id: string, name: string, state: string): HAState => ({
  entity_id: id,
  state,
  attributes: { friendly_name: name },
  last_changed: "",
  last_updated: "",
});

beforeEach(() => {
  live.rooms = [
    { id: "outside", name: "Outside", lights: ["light.front_yard", "light.backyard"], cameras: ["camera.front_porch_high"] },
    { id: "kitchen", name: "Kitchen", lights: ["light.kitchen"], cameras: [] },
  ];
  live.states = {
    "camera.front_porch_high": entity("camera.front_porch_high", "Front Porch", "idle"),
    "light.backyard": entity("light.backyard", "Backyard", "off"),
    "light.front_yard": entity("light.front_yard", "Front Yard", "on"),
    "light.kitchen": entity("light.kitchen", "Kitchen", "on"),
  };
});

describe("CameraCard", () => {
  it("is titled with the camera's name, from its id until the state arrives", () => {
    const { unmount } = renderWithProviders(<CameraCard entityId="camera.front_porch_high" />);
    expect(screen.getByRole("heading", { name: "Front Porch" })).toBeInTheDocument();
    expect(screen.getByTestId("video")).toHaveAttribute("data-fit", "cover");
    unmount();

    live.states = {};
    renderWithProviders(<CameraCard entityId="camera.front_porch_high" />);
    expect(screen.getByRole("heading", { name: "Front Porch High" })).toBeInTheDocument();
  });

  it("Full screen opens the dialog with the room's lights, the picture handed over to it and back", async () => {
    renderWithProviders(<CameraCard entityId="camera.front_porch_high" />);
    await userEvent.click(screen.getByRole("button", { name: "Full screen" }));
    const dialog = await screen.findByRole("dialog", { name: "Front Porch" });
    // One stream at a time: the dialog's, letterboxed; the card's well waits.
    await waitFor(() => expect(screen.getAllByTestId("video")).toHaveLength(1));
    expect(within(dialog).getByTestId("video")).toHaveAttribute("data-fit", "contain");
    const group = within(dialog).getByRole("group", { name: "Lights" });
    expect(within(group).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Backyard", "Front Yard"]);

    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByTestId("video")).toHaveAttribute("data-fit", "cover");
  });

  it("a camera in no room has no lights to control", async () => {
    live.rooms[0].cameras = [];
    renderWithProviders(<CameraCard entityId="camera.front_porch_high" />);
    await userEvent.click(screen.getByRole("button", { name: "Full screen" }));
    const dialog = await screen.findByRole("dialog", { name: "Front Porch" });
    expect(within(dialog).queryByRole("group", { name: "Lights" })).toBeNull();
  });
});
