import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WitchFlight } from "../../src/components/halloween/WitchFlight";
import { renderWithProviders } from "./helpers/render";

const witch = () => screen.queryByRole("img", { name: "A witch on a broom" });

describe("WitchFlight", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("flies through a few seconds in, leaves when the crossing ends, and comes back later", () => {
    renderWithProviders(<WitchFlight />);
    expect(witch()).toBeNull();

    // The first flight is booked for 3–6 s in.
    act(() => vi.advanceTimersByTime(2_999));
    expect(witch()).toBeNull();
    act(() => vi.advanceTimersByTime(3_001));
    expect(witch()).toBeInTheDocument();

    // The crossing's own animation ending ends the flight; the ride's, which
    // bubbles up through the same element, doesn't.
    const ride = witch()!.parentElement!;
    const crossing = ride.parentElement!;
    fireEvent.animationEnd(ride);
    expect(witch()).toBeInTheDocument();
    fireEvent.animationEnd(crossing);
    expect(witch()).toBeNull();

    // The next is 15–40 s off.
    act(() => vi.advanceTimersByTime(14_999));
    expect(witch()).toBeNull();
    act(() => vi.advanceTimersByTime(25_001));
    expect(witch()).toBeInTheDocument();
  });

  it("stays home under prefers-reduced-motion", () => {
    const matchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      ...matchMedia(query),
      matches: query.includes("prefers-reduced-motion"),
    }));
    try {
      renderWithProviders(<WitchFlight />);
      act(() => vi.advanceTimersByTime(60_000));
      expect(witch()).toBeNull();
    } finally {
      window.matchMedia = matchMedia;
    }
  });
});
