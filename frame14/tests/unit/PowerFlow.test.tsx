import { render } from "@testing-library/react";
import { createElement } from "react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PowerFlow } from "../../src/components/PowerFlow";
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
// What jsdom can see is which wires carry a wave and which way; how one is
// drawn and how fast it travels is energy.spec's, on a real page.
describe("the energy flow's wires", () => {
  const wires = (now: { currentProduction: number; currentConsumption: number }) => {
    const { container } = renderWithProviders(<PowerFlow energy={{ ...energy, ...now }} size="sm" />);
    return [...container.querySelectorAll("[data-flow-wire]")].map((wire) => ({
      way: wire.getAttribute("data-flow-wire"),
      waves: wire.querySelectorAll("[data-flow-wave]").length,
      hidden: wire.getAttribute("aria-hidden"),
    }));
  };

  it("carry a wave the way the power goes: from the panels to the house, and to or from the grid", () => {
    // The panels fall short: the rest comes in from the grid, towards the house.
    expect(wires({ currentProduction: 900, currentConsumption: 1200 })).toEqual([
      { way: "right", waves: 1, hidden: "true" },
      { way: "left", waves: 1, hidden: "true" },
    ]);
    // They make more than the house uses: the rest goes out to the grid.
    expect(wires({ currentProduction: 4000, currentConsumption: 1200 })).toEqual([
      { way: "right", waves: 1, hidden: "true" },
      { way: "right", waves: 1, hidden: "true" },
    ]);
  });

  it("are a hairline with no wave where no power is moving", () => {
    // Night: nothing from the panels, the house on the grid.
    expect(wires({ currentProduction: 0, currentConsumption: 800 })).toEqual([
      { way: "idle", waves: 0, hidden: "true" },
      { way: "left", waves: 1, hidden: "true" },
    ]);
    // The panels cover the house to the watt: the grid's wire is still.
    expect(wires({ currentProduction: 1200, currentConsumption: 1200 })).toEqual([
      { way: "right", waves: 1, hidden: "true" },
      { way: "idle", waves: 0, hidden: "true" },
    ]);
  });
});
