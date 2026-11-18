import { describe, expect, it } from "vitest";
import {
  coverage,
  coverageColor,
  ENERGY_COLORS,
  ENERGY_VARS,
  flowPace,
  wirePace,
  fmtKwh,
  fmtW,
  grid,
  GRID_ACTIVE_THRESHOLD,
} from "../../src/lib/energy";

const energy = (over = {}) => ({
  currentProduction: 0,
  currentConsumption: 0,
  productionToday: 0,
  consumptionToday: 0,
  ...over,
});

describe("formatting", () => {
  it("watts as kilowatts to a decimal", () => {
    expect(fmtW(1234)).toBe("1.2 kW");
    expect(fmtW(0)).toBe("0.0 kW");
    expect(fmtW(NaN)).toBe("--");
  });

  it("kilowatt-hours whole", () => {
    expect(fmtKwh(10.6)).toBe("11");
    expect(fmtKwh(NaN)).toBe("--");
  });
});

describe("coverage", () => {
  it("is production over consumption in percent, past 100 on a surplus", () => {
    expect(coverage(energy({ productionToday: 10, consumptionToday: 20 }))).toBe(50);
    expect(coverage(energy({ productionToday: 30, consumptionToday: 20 }))).toBe(150);
  });

  // 0.176.0, the user: "make the house icon yellow when below 100% and
  // green when over 100%".
  it("is the solar's yellow until the day is covered, and green from there", () => {
    expect(coverageColor(0)).toBe("solar");
    expect(coverageColor(69)).toBe("solar");
    expect(coverageColor(99.9)).toBe("solar");
    // Covered: the figure the card shows turns green at the same moment.
    expect(coverageColor(100)).toBe("export");
    expect(coverageColor(107)).toBe("export");
    expect(coverageColor(240)).toBe("export");
  });

  it("is zero before anything was used", () => {
    expect(coverage(energy({ productionToday: 5, consumptionToday: 0 }))).toBe(0);
  });
});

describe("grid", () => {
  it("imports when the house uses more than the panels make", () => {
    const g = grid(energy({ currentConsumption: 1184, currentProduction: 903 }));
    expect(g).toEqual({ abs: 281, exporting: false, active: true });
  });

  it("exports the other way round", () => {
    const g = grid(energy({ currentConsumption: 500, currentProduction: 2000 }));
    expect(g.exporting).toBe(true);
    expect(g.abs).toBe(1500);
  });

  it("ignores a flow inside the deadband", () => {
    const g = grid(energy({ currentConsumption: 1000, currentProduction: 1000 - GRID_ACTIVE_THRESHOLD }));
    expect(g.active).toBe(false);
  });
});

// 0.173.1, the user, of the energy flow's lines: "Make the speeds faster
// fir the lines for higher wattage". A wire went by flowPace until then:
// the root all the way, three times the base pace at most.
describe("wirePace", () => {
  it("is in proportion to the power from a kilowatt up", () => {
    expect(wirePace(1000)).toBe(1);
    expect(wirePace(2000)).toBe(2);
    expect(wirePace(2500)).toBe(2.5);
    expect(wirePace(5700)).toBe(5.7);
    // More than twice the power is more than twice as fast, where the root had it half as fast again.
    expect(wirePace(5700) / wirePace(2500)).toBeCloseTo(5700 / 2500, 5);
    expect(flowPace(5700) / flowPace(2500)).toBeLessThan(1.6);
  });

  it("is faster than the root gave from a kilowatt up, and the same under it", () => {
    for (const watts of [1500, 2500, 4000, 5700, 9000, 12000]) expect(wirePace(watts), `${watts} W`).toBeGreaterThan(flowPace(watts));
    for (const watts of [0, 62, 250, 500, 999, 1000]) expect(wirePace(watts), `${watts} W`).toBe(flowPace(watts));
    expect(wirePace(250)).toBe(0.5);
  });

  it("crawls at a quarter pace under 62 W and tops out at eight times from 8 kW", () => {
    expect(wirePace(0)).toBe(0.25);
    expect(wirePace(62)).toBe(0.25);
    expect(wirePace(8000)).toBe(8);
    expect(wirePace(20000)).toBe(8);
  });

  it("never slows as the power grows, across the kilowatt where the two rules meet", () => {
    let last = 0;
    for (let watts = 0; watts <= 10000; watts += 10) {
      const pace = wirePace(watts);
      expect(pace, `${watts} W`).toBeGreaterThanOrEqual(last);
      last = pace;
    }
  });

  it("rounds to hundredths, and treats nothing as nothing", () => {
    expect(wirePace(1001)).toBe(1);
    expect(wirePace(2816)).toBe(2.82);
    for (const nothing of [NaN, -500, Infinity * 0]) expect(wirePace(nothing)).toBe(0.25);
  });
});

describe("flowPace", () => {
  it("is the square root of the kilowatts", () => {
    expect(flowPace(1000)).toBe(1);
    expect(flowPace(4000)).toBe(2);
    expect(flowPace(250)).toBe(0.5);
  });

  it("crawls at a quarter pace under 62 W and tops out at three times over 9 kW", () => {
    expect(flowPace(0)).toBe(0.25);
    expect(flowPace(62)).toBe(0.25);
    expect(flowPace(9000)).toBe(3);
    expect(flowPace(20000)).toBe(3);
  });

  it("rounds to hundredths, so a watt's drift doesn't move it", () => {
    expect(flowPace(1001)).toBe(1);
    expect(flowPace(1010)).toBe(flowPace(1000));
  });

  it("treats nothing as nothing", () => {
    expect(flowPace(NaN)).toBe(0.25);
    expect(flowPace(-500)).toBe(0.25);
  });
});

// 0.176.0, the user: "Make the far right grid bolt and circle be blue".
describe("the flows' colours", () => {
  it("have a blue for the grid itself, apart from what is sent and what is taken", () => {
    expect(ENERGY_COLORS.grid).toBe("blue.500");
    expect(ENERGY_VARS.grid).toBe("var(--chakra-colors-blue-500)");
    const others = [ENERGY_COLORS.solar, ENERGY_COLORS.export, ENERGY_COLORS.import, ENERGY_COLORS.home];
    expect(others).not.toContain(ENERGY_COLORS.grid);
    // Each paint is its token, for an SVG to wear.
    for (const flow of Object.keys(ENERGY_COLORS) as (keyof typeof ENERGY_COLORS)[]) {
      expect(ENERGY_VARS[flow]).toBe(`var(--chakra-colors-${ENERGY_COLORS[flow].replace(".", "-")})`);
    }
  });
});
