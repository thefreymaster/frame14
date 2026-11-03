import { act, fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HAState } from "../../src/hooks/useEntity";
import type { GuestAttrs, UnraidContainer, UnraidVm } from "../../src/lib/unraid";
import { renderWithProviders } from "./helpers/render";

// The containers' and VMs' live states, as useEntity / useEntities would hand
// them over — a store each tile subscribes to, as it does to the socket, so a
// state set here re-renders the tile that shows it (a static mock doesn't
// reach a tile the React Compiler has memoised) — and the socket's call,
// which nothing here may make.
type States = Record<string, HAState<Record<string, unknown>> | undefined>;
const live = vi.hoisted(() => ({
  states: {} as States,
  listeners: new Set<() => void>(),
  callService: vi.fn(),
}));
function setState(id: string, state: HAState<Record<string, unknown>>) {
  live.states = { ...live.states, [id]: state };
  act(() => live.listeners.forEach((fn) => fn()));
}

vi.mock("../../src/hooks/useEntity", async () => {
  const { useSyncExternalStore } = await import("react");
  const subscribe = (fn: () => void) => {
    live.listeners.add(fn);
    return () => void live.listeners.delete(fn);
  };
  const useStates = () => useSyncExternalStore(subscribe, () => live.states);
  return {
    useEntity: (id: string) => ({ data: useStates()[id] }),
    useEntities: (ids: string[]) => {
      const states = useStates();
      return ids.map((id) => ({ data: states[id] }));
    },
  };
});
vi.mock("../../src/lib/callService", () => ({ callService: live.callService }));

import { UnraidGuestsCard } from "../../src/components/UnraidGuestsCard";

const CONTAINERS: UnraidContainer[] = [
  { name: "Immich-Server", switch: "switch.immich", cpu: null, memory: null },
  { name: "Plex", switch: "switch.plex", cpu: "sensor.plex_cpu", memory: "sensor.plex_memory" },
  { name: "Valheim2026", switch: "switch.valheim", cpu: null, memory: null },
];
const VMS: UnraidVm[] = [
  { name: "Home Assistant", switch: "switch.vm_ha" },
  { name: "Ubuntu", switch: "switch.vm_ubuntu" },
  { name: "Windows 11", switch: "switch.vm_windows" },
];

const st = (state: string, attributes: Record<string, unknown> = {}) => ({
  entity_id: "x.y",
  state,
  attributes,
  last_changed: "",
  last_updated: "",
});
const container = (state: string, status: string, extra: GuestAttrs = {}) =>
  st(state, { status, ...extra });
const vm = (state: string, vmState: string) => st(state, { state: vmState });

const containersCard = <UnraidGuestsCard kind="container" guests={CONTAINERS} title="Containers" icon={<svg />} />;
const vmCard = <UnraidGuestsCard kind="vm" guests={VMS} title="VMs" icon={<svg />} />;
const tile = (name: string) => document.querySelector(`[data-guest="${name}"]`) as HTMLElement;

beforeEach(() => {
  live.states = {
    "switch.immich": container("on", "PAUSED"),
    "switch.plex": container("on", "RUNNING", { icon_url: "https://example.com/plex.png" }),
    "sensor.plex_cpu": st("2.13", { unit_of_measurement: "%" }),
    "sensor.plex_memory": st("512.3", { unit_of_measurement: "MB" }),
    "switch.valheim": container("off", "EXITED"),
    "switch.vm_ha": vm("on", "RUNNING"),
    "switch.vm_ubuntu": vm("on", "PAUSED"),
    "switch.vm_windows": vm("off", "SHUTOFF"),
  };
  live.callService.mockReset();
});

describe("UnraidGuestsCard: containers", () => {
  it("shows each container's status, what it uses while its sensors are enabled, and how many run", () => {
    renderWithProviders(containersCard);
    expect(screen.getByRole("heading", { name: "Containers" })).toBeInTheDocument();
    // A paused container still runs.
    expect(screen.getByText("2 of 3 running")).toBeInTheDocument();
    expect([...document.querySelectorAll("[data-guest]")].map((el) => el.getAttribute("data-guest")))
      .toEqual(["Immich-Server", "Plex", "Valheim2026"]);
    expect(within(tile("Immich-Server")).getByText("Paused")).toBeInTheDocument();
    expect(within(tile("Plex")).getByText("Running")).toBeInTheDocument();
    expect(within(tile("Plex")).getByText("2.1% CPU · 512 MB")).toBeInTheDocument();
    expect(within(tile("Valheim2026")).getByText("Stopped")).toBeInTheDocument();
  });

  it("is read only: no switch, no button, and a tap calls nothing", () => {
    renderWithProviders(containersCard);
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    fireEvent.click(tile("Plex"));
    expect(live.callService).not.toHaveBeenCalled();
  });

  it("follows a container's state live, its usage only while it runs", () => {
    renderWithProviders(containersCard);
    setState("switch.plex", container("off", "EXITED"));
    expect(within(tile("Plex")).getByText("Stopped")).toBeInTheDocument();
    expect(within(tile("Plex")).queryByText(/CPU/)).toBeNull();
    expect(screen.getByText("1 of 3 running")).toBeInTheDocument();
    setState("switch.valheim", container("on", "RUNNING"));
    expect(within(tile("Valheim2026")).getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("2 of 3 running")).toBeInTheDocument();
  });

  it("draws the template's icon, and Docker's whale once it fails to load", () => {
    renderWithProviders(containersCard);
    const img = tile("Plex").querySelector("img")!;
    expect(img).toHaveAttribute("src", "https://example.com/plex.png");
    fireEvent.error(img);
    expect(tile("Plex").querySelector("img")).toBeNull();
    expect(tile("Plex").querySelector("svg")).not.toBeNull();
  });

  it("says a container is unavailable, and gives no count until every state is in", () => {
    live.states["switch.plex"] = st("unavailable");
    delete live.states["switch.valheim"];
    renderWithProviders(containersCard);
    expect(within(tile("Plex")).getByText("Unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/running$/)).toBeNull();
  });
});

describe("UnraidGuestsCard: VMs", () => {
  it("reads a VM's status from libvirt's state, with a screen for its icon and no switch", () => {
    renderWithProviders(vmCard);
    expect(screen.getByRole("heading", { name: "VMs" })).toBeInTheDocument();
    expect(screen.getByText("2 of 3 running")).toBeInTheDocument();
    expect(within(tile("Home Assistant")).getByText("Running")).toBeInTheDocument();
    expect(within(tile("Ubuntu")).getByText("Paused")).toBeInTheDocument();
    expect(within(tile("Windows 11")).getByText("Stopped")).toBeInTheDocument();
    expect(tile("Home Assistant").getAttribute("data-kind")).toBe("vm");
    expect(tile("Home Assistant").querySelector("img")).toBeNull();
    expect(tile("Home Assistant").querySelector("svg")).not.toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});
