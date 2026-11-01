import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CircuitBar } from "../../src/components/CircuitBar";
import { flowPace } from "../../src/lib/energy";
import { renderWithProviders } from "./helpers/render";

// 0.138: a circuit pulling power shows a highlight running along its bar
// (`data-flowing` on the range), at the draw's pace (0.138.1: `data-pace`,
// lib energy's flowPace — the running animation's playback rate, which jsdom
// has no animations to carry); an idle one, and the dimmed balance, don't.
describe("a circuit's bar", () => {
  const range = () => document.querySelector("[data-part=range]");

  it("flows while the circuit draws power", () => {
    renderWithProviders(<CircuitBar name="Fridge" watts={451} maxWatts={451} kwhToday={0.7} />);
    expect(screen.getByText("451 W")).toBeInTheDocument();
    expect(screen.getByText("0.7 kWh")).toBeInTheDocument();
    expect(range()).toHaveAttribute("data-flowing");
    expect(range()).toHaveAttribute("data-pace", String(flowPace(451)));
    expect(flowPace(451)).toBe(0.67);
  });

  it("runs faster the more the circuit draws, within the dots' range", () => {
    const { unmount } = renderWithProviders(<CircuitBar name="Range" watts={2500} maxWatts={2500} />);
    expect(range()).toHaveAttribute("data-pace", "1.58");
    unmount();
    renderWithProviders(<CircuitBar name="Living Room" watts={9} maxWatts={2500} />);
    expect(range()).toHaveAttribute("data-pace", "0.25");
  });

  it("is still at nothing, and as the dimmed balance", () => {
    const { unmount } = renderWithProviders(<CircuitBar name="Heat Pump 2" watts={0} maxWatts={451} />);
    expect(screen.getByText("0 W")).toBeInTheDocument();
    expect(range()).not.toHaveAttribute("data-flowing");
    unmount();
    renderWithProviders(<CircuitBar name="Other" watts={120} maxWatts={451} dim />);
    expect(range()).not.toHaveAttribute("data-flowing");
  });
});
