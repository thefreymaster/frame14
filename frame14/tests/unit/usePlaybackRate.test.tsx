import { fireEvent, render } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { usePlaybackRate } from "../../src/hooks/usePlaybackRate";

// jsdom has no animations: each element is handed a list of its own, which
// a test replaces as the browser would make a CSS animation anew.
type Running = { playbackRate: number; name: string };
const running = new WeakMap<Element, Running[]>();
const proto = Element.prototype as { getAnimations?: (options?: { subtree?: boolean }) => unknown[] };
const had = proto.getAnimations;
beforeAll(() => {
  proto.getAnimations = function (this: Element, options?: { subtree?: boolean }) {
    const own = running.get(this) ?? [];
    if (!options?.subtree) return own;
    return [own, ...[...this.querySelectorAll("*")].map((el) => running.get(el) ?? [])].flat();
  };
});
afterAll(() => {
  proto.getAnimations = had;
});

function Paced({ rate }: { rate: number }) {
  const paced = usePlaybackRate(rate);
  return (
    <div ref={paced} data-testid="paced">
      <span data-testid="inside" />
    </div>
  );
}

const fresh = (name: string): Running => ({ playbackRate: 1, name });

// The power flow's wires, the light on the panels and the grid's sparks run
// at the power's pace (the user: "The speed should still change based on the
// amount of energy going through").
describe("usePlaybackRate", () => {
  it("paces the element's animations and those inside it, and paces them again for a new rate", () => {
    const { getByTestId, rerender } = render(<Paced rate={1} />);
    const own = [fresh("trace")];
    const inner = [fresh("spark")];
    running.set(getByTestId("paced"), own);
    running.set(getByTestId("inside"), inner);
    rerender(<Paced rate={2.5} />);
    expect([own[0].playbackRate, inner[0].playbackRate]).toEqual([2.5, 2.5]);
    rerender(<Paced rate={0.53} />);
    expect([own[0].playbackRate, inner[0].playbackRate]).toEqual([0.53, 0.53]);
  });

  // A folded card opened again: the browser makes its CSS animations anew,
  // at their own pace. Without this they ran at the 1 kW pace, whatever the
  // power, until the next reading.
  it("paces an animation that starts anew, the rate unchanged", () => {
    const { getByTestId, rerender } = render(<Paced rate={1} />);
    rerender(<Paced rate={4} />);
    const anew = [fresh("trace")];
    running.set(getByTestId("paced"), anew);
    const inner = [fresh("spark")];
    running.set(getByTestId("inside"), inner);
    fireEvent.animationStart(getByTestId("inside"));
    expect([anew[0].playbackRate, inner[0].playbackRate]).toEqual([4, 4]);
  });

  it("lets go of an element once it is gone", () => {
    const { getByTestId, unmount } = render(<Paced rate={3} />);
    const el = getByTestId("paced");
    unmount();
    const later = [fresh("trace")];
    running.set(el, later);
    fireEvent.animationStart(el);
    expect(later[0].playbackRate).toBe(1);
  });
});
