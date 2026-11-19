import { afterEach, describe, expect, it, vi } from "vitest";
import { crossFade } from "../../src/lib/themeTransition";

// 0.177.0: the theme turning from bright to dark or back crossfades, through
// the browser's view transition. jsdom has none: it is stubbed here, and
// what a real page runs is header.spec's.

const originalMatchMedia = window.matchMedia;

/** A view transition that keeps its callback for the test to run, as the browser does a frame later. */
function stubViewTransition() {
  const pending: (() => void)[] = [];
  const start = vi.fn((callback: () => void) => {
    pending.push(callback);
    return {} as ViewTransition;
  });
  Object.defineProperty(document, "startViewTransition", { value: start, configurable: true });
  return { start, runPending: () => pending.splice(0).forEach((run) => run()) };
}

function stubReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: reduce && query === "(prefers-reduced-motion: reduce)",
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function stubVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
}

afterEach(() => {
  delete (document as { startViewTransition?: unknown }).startViewTransition;
  delete (document as { visibilityState?: unknown }).visibilityState;
  window.matchMedia = originalMatchMedia;
});

describe("crossing from one mode to the other", () => {
  it("makes the change inside a view transition, once the old page's picture is taken", () => {
    stubReducedMotion(false);
    const { start, runPending } = stubViewTransition();
    const change = vi.fn();
    crossFade(change);
    expect(start).toHaveBeenCalledTimes(1);
    // Not yet: the browser takes its picture of the page as it was first.
    expect(change).not.toHaveBeenCalled();
    runPending();
    expect(change).toHaveBeenCalledTimes(1);
  });

  it("makes it at once where motion is reduced", () => {
    stubReducedMotion(true);
    const { start } = stubViewTransition();
    const change = vi.fn();
    crossFade(change);
    expect(change).toHaveBeenCalledTimes(1);
    expect(start).not.toHaveBeenCalled();
  });

  it("makes it at once on a hidden page", () => {
    stubReducedMotion(false);
    stubVisibility("hidden");
    const { start } = stubViewTransition();
    const change = vi.fn();
    crossFade(change);
    expect(change).toHaveBeenCalledTimes(1);
    expect(start).not.toHaveBeenCalled();
  });

  it("makes it at once in a browser with no view transitions", () => {
    stubReducedMotion(false);
    expect("startViewTransition" in document).toBe(false);
    const change = vi.fn();
    crossFade(change);
    expect(change).toHaveBeenCalledTimes(1);
  });
});
