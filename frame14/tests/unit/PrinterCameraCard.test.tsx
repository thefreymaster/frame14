import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PrinterCameraCard } from "../../src/components/PrinterCameraCard";
import { renderWithProviders } from "./helpers/render";

const img = (container: HTMLElement) => {
  const el = container.querySelector("img");
  if (!el) throw new Error("no stream <img>");
  return el;
};

describe("PrinterCameraCard", () => {
  it("is titled Camera, with an icon and no badge, by default", () => {
    const { container } = renderWithProviders(<PrinterCameraCard />);
    const heading = screen.getByRole("heading", { name: "Camera" });
    expect(heading.parentElement?.querySelector("svg")).not.toBeNull();
    fireEvent.load(img(container));
    expect(screen.queryByText("Live")).toBeNull();
  });

  it("with `badge`, says Live once the first frame is up, Offline when the stream fails, and nothing while a retry connects", async () => {
    const { container } = renderWithProviders(
      <PrinterCameraCard title="3D printer" badge />,
    );
    expect(screen.getByRole("heading", { name: "3D printer" })).toBeInTheDocument();
    expect(screen.queryByText("Live")).toBeNull();
    expect(screen.queryByText("Offline")).toBeNull();

    fireEvent.load(img(container));
    expect(screen.getByText("Live")).toBeInTheDocument();

    fireEvent.error(img(container));
    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(screen.getByText("Camera unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Live")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.queryByText("Offline")).toBeNull();
    expect(screen.queryByText("Live")).toBeNull();
    expect(img(container).getAttribute("src")).toBe("/api/printer/camera/stream?attempt=1");
  });
});
