import { act, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SoftwareUpdate } from "../../src/hooks/useSoftware";
import { renderWithProviders } from "./helpers/render";

const state = vi.hoisted(() => ({
  update: null as SoftwareUpdate | null,
  installed: "0.180.0",
}));
vi.mock("../../src/hooks/useSoftware", () => ({
  useSoftware: () => ({
    loading: false,
    installed: state.installed,
    repoUrl: null,
    update: state.update,
    check: vi.fn(),
  }),
}));

import { SoftwareInstallIndicator } from "../../src/components/SoftwareInstallIndicator";

function update(overrides: Partial<SoftwareUpdate> = {}): SoftwareUpdate {
  return {
    entityId: "update.frame14_update",
    installed: "0.180.0",
    latest: "0.181.0",
    available: true,
    releaseUrl: null,
    inProgress: false,
    releaseNotes: null,
    ...overrides,
  };
}

const SAYING = "A new version v0.181.0 is being installed";
const arrows = (name = SAYING) => screen.queryByRole("button", { name });

beforeEach(() => {
  state.installed = "0.180.0";
});

// 0.181.0, the user: "When an update is being installed, show a spinning
// arrows icon animated in the header with a tool tip of a new version
// v0.180.0 is being installed". That it turns, where it lies and its
// tooltip are header.spec's: jsdom runs no animation and lays nothing out.
describe("the header's sign of an update being installed", () => {
  it.each([
    ["Home Assistant has no update entity for the add-on", null],
    ["the add-on is up to date", update({ available: false, latest: "0.180.0" })],
    ["a newer version is only waiting in the store", update()],
  ])("isn't there while %s", (_when, value) => {
    state.update = value;
    const { container } = renderWithProviders(<SoftwareInstallIndicator />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector("[data-header-install]")).toBeNull();
  });

  it("is a pair of turning arrows that names the version while the install is under way", () => {
    state.update = update({ inProgress: true });
    const { container } = renderWithProviders(<SoftwareInstallIndicator />);
    const button = arrows();
    expect(button).toBeInTheDocument();
    // The glyph the header turns, and the mark the header's fit goes by.
    expect(button!.querySelector("svg")).toHaveAttribute("data-header-turning");
    expect(container.querySelector("[data-header-install]")).toContainElement(button);
  });

  it("says a new version without a number when Home Assistant names none", () => {
    state.update = update({ inProgress: true, latest: null });
    renderWithProviders(<SoftwareInstallIndicator />);
    expect(arrows("A new version is being installed")).toBeInTheDocument();
  });

  it("opens a small menu at a tap: installing, the version to come and the one installed", async () => {
    state.update = update({ inProgress: true });
    renderWithProviders(<SoftwareInstallIndicator />);
    await act(async () => {
      arrows()!.click();
    });
    await waitFor(() => expect(screen.getByText("Software update")).toBeInTheDocument());
    const menu = screen.getByRole("dialog");
    expect(menu).toHaveTextContent("StatusInstalling");
    expect(menu).toHaveTextContent("New versionv0.181.0");
    expect(menu).toHaveTextContent("Installedv0.180.0");
    // The menu's own copy of the glyph stands still.
    expect(menu.querySelector("[data-header-turning]")).toBeNull();
  });

  it("names the add-on's own version as installed where the entity has none", async () => {
    state.update = update({ inProgress: true, installed: null });
    state.installed = "0.179.0";
    renderWithProviders(<SoftwareInstallIndicator />);
    await act(async () => {
      arrows()!.click();
    });
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent("Installedv0.179.0"));
  });

  it("comes as the install starts and goes as it ends", () => {
    state.update = update();
    const { rerender } = renderWithProviders(<SoftwareInstallIndicator />);
    expect(arrows()).toBeNull();
    state.update = update({ inProgress: true });
    rerender(<SoftwareInstallIndicator />);
    expect(arrows()).toBeInTheDocument();
    state.update = update({ available: false, installed: "0.181.0" });
    rerender(<SoftwareInstallIndicator />);
    expect(arrows()).toBeNull();
  });
});
