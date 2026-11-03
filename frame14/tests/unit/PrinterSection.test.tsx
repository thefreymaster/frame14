import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrinterModel } from "../../src/hooks/usePrinter";
import { renderWithProviders } from "./helpers/render";

// The printer as usePrinter hands it over, and the router's navigate.
const live = vi.hoisted(() => ({
  printer: null as unknown as PrinterModel,
  navigate: vi.fn(),
}));

vi.mock("../../src/hooks/usePrinter", () => ({
  usePrinter: () => live.printer,
}));
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => live.navigate,
}));
// NumberFlow animates with web APIs jsdom lacks; the figure is what matters.
vi.mock("@number-flow/react", () => ({
  default: ({ value }: { value: number }) => <span>{value}</span>,
}));

import { PrinterSection } from "../../src/components/PrinterSection";

const printing = (over: Partial<PrinterModel> = {}): PrinterModel => ({
  configured: true,
  loading: false,
  status: "running",
  hms: false,
  progress: 42,
  remainingMinutes: 73,
  finishesAt: new Date(2026, 9, 30, 15, 42),
  taskName: "EmergencyKeyRing",
  currentLayer: 9,
  totalLayers: 20,
  nozzle: { value: 220, target: 220, unit: "°C" },
  bed: { value: 65, target: 65, unit: "°C" },
  chamber: null,
  coverVersion: "2026-10-30T12:00:00+00:00",
  hasCamera: true,
  pause: null,
  resume: null,
  stop: null,
  chamberLight: null,
  ...over,
});

const body = () => screen.getByRole("button", { name: "Open the printer page" });

beforeEach(() => {
  live.navigate.mockReset();
});

describe("PrinterSection", () => {
  it("renders nothing unless a job prints or sits paused", () => {
    for (const status of ["idle", "finish", "failed", "offline", "prepare", "unknown"]) {
      live.printer = printing({ status });
      const { container, unmount } = renderWithProviders(<PrinterSection />);
      expect(container, status).toBeEmptyDOMElement();
      unmount();
    }
  });

  it("shows the status and time left in the header, and the job, its layer, finish time and progress in the body", () => {
    live.printer = printing();
    const { container } = renderWithProviders(<PrinterSection />);
    expect(screen.getByRole("heading", { name: "3D printer" })).toBeInTheDocument();
    expect(screen.getByText("Printing")).toBeInTheDocument();
    expect(screen.getByText("1h 13m left")).toBeInTheDocument();
    expect(screen.getByText("EmergencyKeyRing")).toBeInTheDocument();
    expect(screen.getByText(/^Layer 9 of 20 · finishes 3:42/)).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "42");
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "/api/printer/cover?v=2026-10-30T12%3A00%3A00%2B00%3A00",
    );
  });

  it("says Paused and drops the finish time while paused", () => {
    live.printer = printing({ status: "pause" });
    renderWithProviders(<PrinterSection />);
    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(screen.getByText("Layer 9 of 20")).toBeInTheDocument();
    expect(screen.queryByText(/finishes/)).toBeNull();
  });

  it("has no picture, layer or time left without them", () => {
    live.printer = printing({
      coverVersion: null,
      currentLayer: null,
      remainingMinutes: null,
      finishesAt: null,
    });
    const { container } = renderWithProviders(<PrinterSection />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByText(/Layer/)).toBeNull();
    expect(screen.queryByText(/left/)).toBeNull();
  });

  it("a tap, Enter or Space opens the Printer page", async () => {
    live.printer = printing();
    renderWithProviders(<PrinterSection />);
    await userEvent.click(body());
    body().focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(live.navigate).toHaveBeenCalledTimes(3);
    expect(live.navigate).toHaveBeenCalledWith("/printer");
  });
});
