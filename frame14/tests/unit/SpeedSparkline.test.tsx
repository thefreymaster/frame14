import { describe, expect, it } from "vitest";
import { SpeedSparkline } from "../../src/components/SpeedSparkline";
import { TRACE_POINTS } from "../../src/lib/speedTest";
import { renderWithProviders } from "./helpers/render";

const strip = (values: number[], live = false) => {
  const { container } = renderWithProviders(<SpeedSparkline values={values} live={live} height="5rem" />);
  const [wash, line] = [...container.querySelectorAll("path")];
  return { container, wash, line, dot: container.querySelector<HTMLElement>("[data-speed-dot]") };
};
/** A path's points, as [x, y] in the plot's 1000 x 100 units. */
const points = (path: Element) =>
  [...path.getAttribute("d")!.matchAll(/[ML]([\d.]+),([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);

describe("SpeedSparkline", () => {
  it("is an empty strip before a test: no line, no dot", () => {
    const { container, line, dot } = strip([]);
    expect(container.querySelector("svg")).toBeNull();
    expect(line).toBeUndefined();
    expect(dot).toBeNull();
    expect(container.querySelector("[data-speed-trace]")).toHaveAttribute("data-speed-trace", "0");
  });

  it("starts from nothing at the left and has a point a tick", () => {
    const { line } = strip([100, 200, 200]);
    const drawn = points(line);
    expect(drawn).toHaveLength(4);
    expect(drawn[0]).toEqual([0, 100]);
    // Higher is faster, and the fastest tick leaves room above it.
    expect(drawn[1][1]).toBeGreaterThan(drawn[2][1]);
    expect(drawn[2][1]).toBe(drawn[3][1]);
    expect(drawn[2][1]).toBeGreaterThan(0);
  });

  it("grows across the transfer's time: half the ticks reach half way, all of them the right edge", () => {
    const half = points(strip(Array.from({ length: TRACE_POINTS / 2 }, () => 300)).line);
    expect(half.at(-1)![0]).toBe(500);
    const whole = points(strip(Array.from({ length: TRACE_POINTS }, () => 300)).line);
    expect(whole.at(-1)![0]).toBe(1000);
    // A tick more than expected (a late timer) still ends at the edge.
    const over = points(strip(Array.from({ length: TRACE_POINTS + 1 }, () => 300)).line);
    expect(over.at(-1)![0]).toBe(1000);
  });

  it("washes under the line down to the baseline", () => {
    const { wash, line } = strip([100, 200]);
    expect(wash.getAttribute("d")).toBe(`${line.getAttribute("d")}L100.0,100L0,100Z`);
    expect(wash.getAttribute("fill-opacity")).toBe("0.1");
  });

  it("wears a dot on its end only while the transfer runs", () => {
    expect(strip([100, 200]).dot).toBeNull();
    const { dot } = strip([100, 200], true);
    // Two ticks of twenty across; the fastest tick sits under the headroom.
    expect(dot!.style.left || getComputedStyle(dot!).left).toBe("10%");
  });
});
