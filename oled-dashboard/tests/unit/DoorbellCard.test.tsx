import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HAState } from "../../src/hooks/useEntity";
import { renderWithProviders } from "./helpers/render";

// The entity config, the live states, and the socket the card reads the
// person sensor off: the test fires its states through the handler the card
// registers.
const live = vi.hoisted(() => ({
  states: {} as Record<string, HAState | undefined>,
  handlers: new Map<string, (state: HAState) => void>(),
}));

vi.mock("../../src/hooks/useEntitiesConfig", () => ({
  useEntitiesConfig: () => ({
    data: {
      person: "binary_sensor.person",
      camera: "camera.door",
      lights: [],
      rooms: [{ id: "outside", name: "Outside", lights: ["light.yard", "light.porch"], cameras: ["camera.door"] }],
    },
    isPending: false,
  }),
}));
vi.mock("../../src/hooks/useEntity", () => ({
  useEntity: (id: string) => ({ data: live.states[id] }),
  useEntities: (ids: string[]) => ids.map((id) => ({ data: live.states[id] })),
}));
vi.mock("../../src/lib/socket", () => ({
  socket: {
    on: (event: string, fn: (state: HAState) => void) => {
      live.handlers.set(event, fn);
    },
    off: (event: string) => {
      live.handlers.delete(event);
    },
  },
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

import { DoorbellCard } from "../../src/components/DoorbellCard";

const entity = (id: string, name: string, state: string): HAState => ({
  entity_id: id,
  state,
  attributes: { friendly_name: name },
  last_changed: "",
  last_updated: "",
});

/** The person sensor reporting a state over the socket. */
const person = (state: string) =>
  act(() => {
    live.handlers.get("binary_sensor.person")?.(entity("binary_sensor.person", "Person", state));
  });

beforeEach(() => {
  live.states = {
    "camera.door": entity("camera.door", "Front Door Cam", "idle"),
    "light.yard": entity("light.yard", "Yard", "off"),
    "light.porch": entity("light.porch", "Porch", "on"),
  };
  live.handlers.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("DoorbellCard", () => {
  it("pops up on the person sensor's rising edge, named for the camera, and leaves 30s later", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { container } = renderWithProviders(<DoorbellCard />);
    expect(container).toBeEmptyDOMElement();
    person("on");
    expect(screen.getByText("Person detected")).toBeInTheDocument();
    expect(screen.getByText("Front Door Cam")).toBeInTheDocument();
    expect(screen.getByTestId("video")).toHaveAttribute("data-fit", "cover");
    // The sensor dropping doesn't cut it short; the 30s does.
    person("off");
    act(() => vi.advanceTimersByTime(29_000));
    expect(screen.getByText("Person detected")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1_000));
    expect(container).toBeEmptyDOMElement();
  });

  it("Full screen opens the camera's dialog with the room's lights in place of the card, and closing it dismisses the card", async () => {
    renderWithProviders(<DoorbellCard />);
    person("on");
    await userEvent.click(screen.getByRole("button", { name: "Full screen" }));
    const dialog = await screen.findByRole("dialog", { name: "Front Door Cam" });
    expect(screen.queryByText("Person detected")).toBeNull();
    expect(within(dialog).getByTestId("video")).toHaveAttribute("data-fit", "contain");
    const group = within(dialog).getByRole("group", { name: "Lights" });
    expect(within(group).getAllByRole("button").map((b) => [b.getAttribute("aria-label"), b.getAttribute("aria-pressed")])).toEqual([
      ["Porch", "true"],
      ["Yard", "false"],
    ]);

    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByText("Person detected")).toBeNull();
  });

  it("the 30s doesn't take it down while it is full screen", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    renderWithProviders(<DoorbellCard />);
    person("on");
    fireEvent.click(screen.getByRole("button", { name: "Full screen" }));
    // Another detection meanwhile arms the timer again; it still mustn't fire under the dialog.
    person("off");
    person("on");
    act(() => vi.advanceTimersByTime(31_000));
    vi.useRealTimers();
    expect(await screen.findByRole("dialog", { name: "Front Door Cam" })).toBeInTheDocument();
  });
});
