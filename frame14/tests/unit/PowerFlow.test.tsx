import { render } from "@testing-library/react";
import { createElement } from "react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IoFlash } from "react-icons/io5";
import { PowerFlow } from "../../src/components/PowerFlow";
import { TransmissionTowerIcon } from "../../src/lib/energyIcons";
import { HOME_PATH, HomeIcon, NAV_ITEMS } from "../../src/lib/navItems";
import { renderWithProviders } from "./helpers/render";

const energy = { currentProduction: 900, currentConsumption: 1200, productionToday: 14, consumptionToday: 20 };

// A wire sets its dots' pace on the running animation; jsdom has none to ask for.
const proto = Element.prototype as { getAnimations?: () => unknown[] };
const had = proto.getAnimations;
beforeAll(() => {
  proto.getAnimations = () => [];
});
afterAll(() => {
  proto.getAnimations = had;
});

/** A glyph's drawing: what its svg holds. */
const drawn = (svg: Element | null) => svg?.innerHTML;

describe("the energy flow's home node", () => {
  // 0.173.0, the user: "Use the same home icon for the solar card as the
  // home icon in the navigation".
  it("is the house the navigation's Home draws", () => {
    const { container } = renderWithProviders(<PowerFlow energy={energy} size="sm" />);
    const node = container.querySelector('[data-flow-node="ring"]')!;
    const house = node.querySelector("svg:not([data-flow-ring])");
    const home = NAV_ITEMS.find((item) => item.path === HOME_PATH)!;
    // The nav's entry while Home is the page in hand: the filled house.
    expect(home.activeIcon).toBe(HomeIcon);
    const nav = render(createElement(home.activeIcon)).container.querySelector("svg");
    expect(drawn(house)).toBeTruthy();
    expect(drawn(house)).toBe(drawn(nav));
    // Not another set's house, nor the outline the nav draws for a page not in hand.
    expect(drawn(house)).not.toBe(drawn(render(createElement(home.icon)).container.querySelector("svg")));
  });

  // 0.173.0, the user: "The center circle border is too thick. Make it
  // match the other two for generation and grid".
  it("has a ring drawn to no scale of its own, its stroke the other nodes' border", () => {
    const { container } = renderWithProviders(<PowerFlow energy={energy} size="sm" />);
    const ring = container.querySelector("svg[data-flow-ring]")!;
    // No viewBox: a stroke of 2 is 2 pixels at any size of type (energy.spec
    // measures it on the page, beside the borders).
    expect(ring).not.toHaveAttribute("viewBox");
    const circles = [...ring.querySelectorAll("circle")];
    expect(circles).toHaveLength(3);
    for (const circle of circles) {
      expect(circle).toHaveAttribute("stroke-width", "2");
      expect(circle).toHaveAttribute("r", "50%");
      expect(circle).toHaveAttribute("cx", "50%");
      expect(circle).toHaveAttribute("cy", "50%");
    }
    // Still the day's coverage: 14 of 20 kWh, the yellow lap 70 of its 100.
    expect(ring).toHaveAccessibleName("Solar covered 70% of today's use");
    expect((circles[1] as SVGElement).style.strokeDashoffset).toBe("30");
    expect((circles[2] as SVGElement).style.strokeDashoffset).toBe("100");
    // The other two nodes are bordered boxes, with no ring.
    expect(container.querySelectorAll('[data-flow-node=""]')).toHaveLength(2);
  });
});

// 0.173.0, the user: "Make the dotted lines between production house and
// usage be AC waves. Maintain flow direction and speed of consumption".
// What jsdom can see is which wires carry a wave and which way, and that the
// wave carries a trace (the user, of the waves sliding along: "lets try
// instead the wave is static in place representing the 60hz but the lines
// are redrawn tracing the wave itself"); how they are drawn and how fast the
// trace runs is energy.spec's, on a real page.
describe("the energy flow's wires", () => {
  const wires = (now: { currentProduction: number; currentConsumption: number }) => {
    const { container } = renderWithProviders(<PowerFlow energy={{ ...energy, ...now }} size="sm" />);
    return [...container.querySelectorAll("[data-flow-wire]")].map((wire) => ({
      way: wire.getAttribute("data-flow-wire"),
      waves: wire.querySelectorAll("[data-flow-wave]").length,
      traces: wire.querySelectorAll("[data-flow-wave] > [data-flow-trace]").length,
      hidden: wire.getAttribute("aria-hidden"),
    }));
  };

  it("carry a wave with a trace on it the way the power goes: from the panels to the house, and to or from the grid", () => {
    // The panels fall short: the rest comes in from the grid, towards the house.
    expect(wires({ currentProduction: 900, currentConsumption: 1200 })).toEqual([
      { way: "right", waves: 1, traces: 1, hidden: "true" },
      { way: "left", waves: 1, traces: 1, hidden: "true" },
    ]);
    // They make more than the house uses: the rest goes out to the grid.
    expect(wires({ currentProduction: 4000, currentConsumption: 1200 })).toEqual([
      { way: "right", waves: 1, traces: 1, hidden: "true" },
      { way: "right", waves: 1, traces: 1, hidden: "true" },
    ]);
  });

  it("are a hairline with no wave where no power is moving", () => {
    // Night: nothing from the panels, the house on the grid.
    expect(wires({ currentProduction: 0, currentConsumption: 800 })).toEqual([
      { way: "idle", waves: 0, traces: 0, hidden: "true" },
      { way: "left", waves: 1, traces: 1, hidden: "true" },
    ]);
    // The panels cover the house to the watt: the grid's wire is still.
    expect(wires({ currentProduction: 1200, currentConsumption: 1200 })).toEqual([
      { way: "right", waves: 1, traces: 1, hidden: "true" },
      { way: "idle", waves: 0, traces: 0, hidden: "true" },
    ]);
  });
});

// 0.176.0, the user: "Add small rays of light hitting the solar panels on the
// solar icon, make the house icon yellow when below 100% and green when over
// 100%, add electric animation around the far right lightning bolt. Make the
// far right grid bolt and circle be blue". What jsdom can see is what is
// drawn and when, and which colour each part is given; how the rays and the
// sparks move is energy.spec's, on a real page.
describe("what each of the energy flow's nodes says", () => {
  const flow = (over: Partial<typeof energy> = {}) =>
    renderWithProviders(<PowerFlow energy={{ ...energy, ...over }} size="sm" />).container;
  const node = (container: HTMLElement, name: string) => container.querySelector<HTMLElement>(`[data-flow-part="${name}"]`)!;
  /** Which flow's colour a node's icon is drawn in. */
  const iconColor = (container: HTMLElement, name: string) =>
    node(container, name).querySelector("[data-flow-icon]")!.getAttribute("data-flow-icon");

  it("has light falling on the panels while they make power, and none at night", () => {
    const day = flow({ currentProduction: 900 });
    const rays = node(day, "solar").querySelector("[data-flow-rays]")!;
    expect(rays).toBeInTheDocument();
    expect(rays.querySelectorAll("[data-flow-ray]")).toHaveLength(3);
    // Drawn over the icon, not read out, and never in a tap's way.
    expect(rays).toHaveAttribute("aria-hidden", "true");
    expect(getComputedStyle(rays).pointerEvents).toBe("none");
    expect(getComputedStyle(rays).position).toBe("absolute");
    // On the solar node alone.
    expect(day.querySelectorAll("[data-flow-rays]")).toHaveLength(1);
    expect(iconColor(day, "solar")).toBe("solar");

    const night = flow({ currentProduction: 0, currentConsumption: 800 });
    expect(night.querySelector("[data-flow-rays]")).toBeNull();
    expect(iconColor(night, "solar")).toBe("");
  });

  it("has a house in the solar's yellow until the day is covered, and green once it is", () => {
    // 14 of 20 kWh: 70%.
    expect(iconColor(flow(), "home")).toBe("solar");
    expect(iconColor(flow({ productionToday: 19.9 }), "home")).toBe("solar");
    expect(iconColor(flow({ productionToday: 20 }), "home")).toBe("export");
    expect(iconColor(flow({ productionToday: 31 }), "home")).toBe("export");
    // Nothing used yet today: not covered.
    expect(iconColor(flow({ productionToday: 0, consumptionToday: 0 }), "home")).toBe("solar");
    // The house alone: its node is the ring it was, the day's coverage.
    const covered = flow({ productionToday: 31 });
    expect(node(covered, "home")).toHaveAttribute("data-flow-node", "ring");
    expect(node(covered, "home").querySelector("svg[data-flow-ring]")).toHaveAccessibleName("Solar covered 155% of today's use");
  });

  it("has a blue grid with electricity round its icon while power moves through it, either way", () => {
    for (const now of [
      { currentProduction: 900, currentConsumption: 1200 },
      { currentProduction: 4000, currentConsumption: 1200 },
    ]) {
      const container = flow(now);
      expect(iconColor(container, "grid"), JSON.stringify(now)).toBe("grid");
      const sparks = node(container, "grid").querySelector("[data-flow-sparks]")!;
      expect(sparks).toBeInTheDocument();
      // Its icon once more behind itself, and the sparks round it.
      const icon = node(container, "grid").querySelector("svg:not([data-flow-glow])")!;
      expect(sparks.querySelector("svg[data-flow-glow]")!.innerHTML).toBe(icon.innerHTML);
      expect(sparks.querySelectorAll("[data-flow-spark]")).toHaveLength(6);
      expect(sparks).toHaveAttribute("aria-hidden", "true");
      expect(getComputedStyle(sparks).pointerEvents).toBe("none");
      expect(container.querySelectorAll("[data-flow-sparks]")).toHaveLength(1);
    }
    // The wire to it keeps the flow's own word: which way the power goes.
    const wires = (container: HTMLElement) => [...container.querySelectorAll("[data-flow-wire]")].map((w) => w.getAttribute("data-flow-wire"));
    expect(wires(flow({ currentProduction: 4000, currentConsumption: 1200 }))).toEqual(["right", "right"]);
    expect(wires(flow({ currentProduction: 900, currentConsumption: 1200 }))).toEqual(["right", "left"]);
  });

  // The same user, of the lightning bolt the grid's node had: "Is there a
  // better icon to represent the grid? Like high voltage power lines".
  it("draws the grid as a transmission tower, moving power or not", () => {
    const tower = render(createElement(TransmissionTowerIcon)).container.querySelector("svg")!;
    expect(drawn(tower)).toBeTruthy();
    for (const now of [
      { currentProduction: 900, currentConsumption: 1200 },
      { currentProduction: 1200, currentConsumption: 1200 },
    ]) {
      const icon = node(flow(now), "grid").querySelector("svg:not([data-flow-glow])");
      expect(drawn(icon), JSON.stringify(now)).toBe(drawn(tower));
    }
    // Not the bolt, which is the Circuits tab's — nor either of the other nodes' glyphs.
    const container = flow();
    const glyph = (name: string) => drawn(node(container, name).querySelector("svg:not([data-flow-glow]):not([data-flow-ring])"));
    expect(glyph("grid")).not.toBe(drawn(render(createElement(IoFlash)).container.querySelector("svg")));
    expect(new Set([glyph("solar"), glyph("home"), glyph("grid")]).size).toBe(3);
  });

  it("has a still, grey grid when the panels cover the house to the watt", () => {
    const container = flow({ currentProduction: 1200, currentConsumption: 1200 });
    expect(iconColor(container, "grid")).toBe("");
    expect(container.querySelector("[data-flow-sparks]")).toBeNull();
    expect(container.querySelector("[data-flow-spark]")).toBeNull();
  });
});
