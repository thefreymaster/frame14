import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MoonIcon } from "../../src/components/MoonIcon";
import { MoonPhase } from "../../src/components/MoonPhase";
import { renderWithProviders } from "./helpers/render";

// 0.174.0, the user: "Add another concave area that has the current moon
// phase with an icon". The weather's Now card has the moon in a well: drawn
// as it stands, its phase by name, how much of it is lit and the day of the
// full moon it is growing towards (or, waning, the new one's). From the date
// (lib/moon), so the tests set the clock; the days are New York's (the
// suite's zone).

const well = () => document.querySelector<HTMLElement>('[data-weather-well="moon"]')!;
const icon = () => well().querySelector<SVGElement>("[data-moon-icon]")!;

describe("the moon's well", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    // Hours after the first quarter: half lit, the full moon a week off.
    ["2026-11-17T20:05Z", "first-quarter", "First quarter", "53% lit · Full moon Nov 24", "right"],
    ["2026-11-13T12:00Z", "waxing-crescent", "Waxing crescent", "16% lit · Full moon Nov 24", "right"],
    ["2026-11-21T12:00Z", "waxing-gibbous", "Waxing gibbous", "87% lit · Full moon Nov 24", "right"],
    // The day of the full moon looks on to the new one — the evening of
    // December 8 in New York.
    ["2026-11-24T20:00Z", "full", "Full moon", "100% lit · New moon Dec 8", "left"],
    ["2026-11-28T12:00Z", "waning-gibbous", "Waning gibbous", "80% lit · New moon Dec 8", "left"],
    ["2026-12-05T12:00Z", "waning-crescent", "Waning crescent", "12% lit · New moon Dec 8", "left"],
    // And the day of the new moon to the full one.
    ["2026-11-09T07:00Z", "new", "New moon", "0% lit · Full moon Nov 24", "left"],
  ])("at %s says %s", (at, phase, name, detail, litSide) => {
    vi.setSystemTime(new Date(at));
    renderWithProviders(<MoonPhase />);
    expect(well()).toHaveAttribute("data-moon", phase);
    expect(screen.getByText("Moon")).toBeInTheDocument();
    expect(screen.getByText(name)).toBeInTheDocument();
    expect(screen.getByText(detail)).toBeInTheDocument();
    expect(icon()).toHaveAttribute("data-lit-side", litSide);
  });

  it("moves on with the night: the full moon's name arrives while the card is up", () => {
    // The evening before November 24's full moon (14:54 UTC).
    vi.setSystemTime(new Date("2026-11-23T20:00Z"));
    renderWithProviders(<MoonPhase />);
    expect(screen.getByText("Waxing gibbous")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(12 * 3_600_000);
    });
    expect(screen.getByText("Full moon")).toBeInTheDocument();
    expect(screen.queryByText("Waxing gibbous")).toBeNull();
  });
});

describe("the moon's icon", () => {
  /** The lit part's outline: down the limb, then back up the terminator — its half-width and which way it bulges. */
  function drawn(lit: number, waxing: boolean) {
    const { container } = renderWithProviders(<MoonIcon lit={lit} waxing={waxing} />);
    const path = container.querySelector("path")!;
    const [, limb, terminator] = path.getAttribute("d")!.split("A");
    const [radii, , , sweep] = terminator.trim().split(" ");
    return {
      limbRadius: parseFloat(limb),
      halfWidth: parseFloat(radii),
      sweep,
      mirrored: path.hasAttribute("transform"),
      side: container.querySelector("[data-moon-icon]")!.getAttribute("data-lit-side"),
    };
  }

  it("draws the lit share: a half moon's terminator straight, a crescent's and a gibbous moon's bulging opposite ways", () => {
    const half = drawn(0.5, true);
    expect(half.halfWidth).toBe(0);

    const crescent = drawn(0.25, true);
    const gibbous = drawn(0.75, true);
    // A quarter lit and a quarter dark: the same curve, turned over.
    expect(crescent.halfWidth).toBeCloseTo(crescent.limbRadius / 2, 3);
    expect(gibbous.halfWidth).toBeCloseTo(crescent.halfWidth, 3);
    expect(crescent.sweep).toBe("0");
    expect(gibbous.sweep).toBe("1");

    // New and full: the terminator is the limb itself.
    expect(drawn(0, true).halfWidth).toBeCloseTo(crescent.limbRadius, 3);
    expect(drawn(1, true)).toMatchObject({ halfWidth: crescent.limbRadius, sweep: "1" });
  });

  it("is lit at the right while it waxes and at the left while it wanes", () => {
    expect(drawn(0.3, true)).toMatchObject({ mirrored: false, side: "right" });
    expect(drawn(0.3, false)).toMatchObject({ mirrored: true, side: "left" });
  });

  it("keeps a share out of range on the disc", () => {
    expect(drawn(1.2, true).halfWidth).toBe(drawn(1, true).halfWidth);
    expect(drawn(-0.1, true).halfWidth).toBe(drawn(0, true).halfWidth);
  });
});
