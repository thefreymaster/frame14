import { describe, expect, it } from "vitest";
import {
  fanSpeedLabel,
  HIDDEN_FAN_SPEEDS,
  VACUUM_PARTS,
  vacuumEntityIds,
  vacuumState,
} from "../../src/lib/vacuum";

describe("vacuumEntityIds", () => {
  it("names Roborock's sensors after the vacuum", () => {
    const ids = vacuumEntityIds("vacuum.roborock_q5_pro");
    expect(ids.battery).toBe("sensor.roborock_q5_pro_battery");
    expect(ids.charging).toBe("binary_sensor.roborock_q5_pro_charging");
    expect(ids.error).toBe("sensor.roborock_q5_pro_vacuum_error");
    expect(ids.lastClean).toBe("sensor.roborock_q5_pro_last_clean_begin");
    expect(ids.mainBrush).toBe("sensor.roborock_q5_pro_main_brush_time_left");
  });

  it("is empty for an id without a name", () => {
    expect(Object.values(vacuumEntityIds("nope")).every((id) => id === "")).toBe(true);
  });

  it("counts down four parts", () => {
    expect(VACUUM_PARTS.map((p) => p.key)).toEqual(["mainBrush", "sideBrush", "filter", "sensors"]);
  });
});

describe("vacuumState", () => {
  it("docked and charging says Charging", () => {
    expect(vacuumState("docked", true)).toEqual({ label: "Charging", palette: "green" });
    expect(vacuumState("docked", false)).toEqual({ label: "Docked", palette: "gray" });
  });

  it("knows the usual states and spells out the rest", () => {
    expect(vacuumState("cleaning", false)).toEqual({ label: "Cleaning", palette: "green" });
    expect(vacuumState("error", false).palette).toBe("red");
    expect(vacuumState("segment_cleaning", false)).toEqual({ label: "Segment cleaning", palette: "gray" });
  });
});

describe("fanSpeedLabel", () => {
  it("names Roborock's suction levels", () => {
    expect(fanSpeedLabel("max_plus")).toBe("Max+");
    expect(fanSpeedLabel("smart_mode")).toBe("Smart");
    expect(fanSpeedLabel("balanced")).toBe("Balanced");
    expect(fanSpeedLabel("whatever_x")).toBe("Whatever x");
  });

  it("hides the settings that aren't suction", () => {
    expect([...HIDDEN_FAN_SPEEDS].sort()).toEqual(["custom", "gentle", "off"]);
  });
});
