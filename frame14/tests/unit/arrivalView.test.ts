import { describe, expect, it, vi } from "vitest";
import { arrivalPath, createArrivalView } from "../../src/lib/arrivalView";

// The socket as arrivalView sees it: one `once` listener, fired by hand.
function fakeSocket() {
  let handler: ((view: unknown) => void) | null = null;
  return {
    once: vi.fn((_event: string, fn: (view: unknown) => void) => {
      handler = fn;
    }),
    fire: (view: unknown) => handler?.(view),
  };
}

const frame = { remote: false, page: "/home", halloween: false };

describe("arrivalPath (0.145.0)", () => {
  it("takes a frame to a game or a movie the frames are on", () => {
    expect(arrivalPath("football", frame)).toBe("/football");
    expect(arrivalPath("marquee", frame)).toBe("/marquee");
  });

  it("leaves an everyday view, and blank, to where the page opened", () => {
    for (const view of ["home", "lights", "clock", "blank", "photos"]) {
      expect(arrivalPath(view, frame), view).toBeNull();
    }
  });

  it("Halloween only on its days", () => {
    expect(arrivalPath("halloween", frame)).toBeNull();
    expect(arrivalPath("halloween", { ...frame, halloween: true })).toBe("/halloween");
  });

  it("never on a remote, on /control, or when the page is there already", () => {
    expect(arrivalPath("football", { ...frame, remote: true })).toBeNull();
    expect(arrivalPath("football", { ...frame, page: "/control" })).toBeNull();
    expect(arrivalPath("football", { ...frame, page: "/football" })).toBeNull();
  });
});

describe("the page's first current_view", () => {
  it("is listened for once, as the module loads", () => {
    const s = fakeSocket();
    createArrivalView(s);
    expect(s.once).toHaveBeenCalledWith("current_view", expect.any(Function));
  });

  it("is handed over when it arrives after the taker", () => {
    const s = fakeSocket();
    const take = createArrivalView(s);
    const fn = vi.fn();
    take(fn);
    expect(fn).not.toHaveBeenCalled();
    s.fire("football");
    expect(fn).toHaveBeenCalledWith("football");
  });

  it("is handed over at once when it arrived first, and only once", () => {
    const s = fakeSocket();
    const take = createArrivalView(s);
    s.fire("marquee");
    const first = vi.fn();
    const second = vi.fn();
    take(first);
    take(second);
    expect(first).toHaveBeenCalledWith("marquee");
    expect(second).not.toHaveBeenCalled();
  });

  it("goes to no one once the taker has let go (an effect's cleanup), and to the next", () => {
    const s = fakeSocket();
    const take = createArrivalView(s);
    const gone = vi.fn();
    const next = vi.fn();
    const release = take(gone);
    release();
    take(next);
    s.fire("football");
    expect(gone).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith("football");
  });

  it("ignores what isn't a view", () => {
    const s = fakeSocket();
    const take = createArrivalView(s);
    const fn = vi.fn();
    take(fn);
    s.fire(42);
    expect(fn).not.toHaveBeenCalled();
  });
});
