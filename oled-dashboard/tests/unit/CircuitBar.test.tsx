import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CircuitBar } from "../../src/components/CircuitBar";
import { renderWithProviders } from "./helpers/render";

// 0.138: a circuit pulling power shows a highlight running along its bar
// (`data-flowing` on the range); an idle one, and the dimmed balance, don't.
describe("a circuit's bar", () => {
  const range = () => document.querySelector("[data-part=range]");

  it("flows while the circuit draws power", () => {
    renderWithProviders(<CircuitBar name="Fridge" watts={451} maxWatts={451} kwhToday={0.7} />);
    expect(screen.getByText("451 W")).toBeInTheDocument();
    expect(screen.getByText("0.7 kWh")).toBeInTheDocument();
    expect(range()).toHaveAttribute("data-flowing");
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
