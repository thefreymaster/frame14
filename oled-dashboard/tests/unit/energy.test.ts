import { describe, expect, it } from "vitest";
import {
  coverage,
  flowPace,
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
