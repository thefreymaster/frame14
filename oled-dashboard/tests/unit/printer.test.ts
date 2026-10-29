import { describe, expect, it } from "vitest";
import { printerEntityIds, printerPartIds } from "../../src/lib/printerEntities";
import { heaterOn, isPrintActive, printerStatus } from "../../src/lib/printerStatus";

describe("printerEntityIds", () => {
  it("ha-bambulab: every sibling from the _print_status prefix", () => {
    const ids = printerEntityIds("sensor.a1_x_print_status");
    expect(ids.status).toBe("sensor.a1_x_print_status");
    expect(ids.progress).toBe("sensor.a1_x_print_progress");
    expect(ids.taskName).toBe("sensor.a1_x_task_name");
    expect(ids.totalLayers).toBe("sensor.a1_x_total_layer_count");
    expect(ids.currentStage).toBe("sensor.a1_x_current_stage");
    expect(ids.gcodeFilename).toBe("sensor.a1_x_gcode_filename");
  });

  it("Bambuddy: its own names, and nothing for the sensors it lacks", () => {
    const ids = printerEntityIds("sensor.h2s_x_status");
    expect(ids.progress).toBe("sensor.h2s_x_progress");
    expect(ids.taskName).toBe("sensor.h2s_x_current_print");
    expect(ids.totalLayers).toBe("sensor.h2s_x_total_layers");
    expect(ids.gcodeFilename).toBe("sensor.h2s_x_gcode_file");
    expect(ids.currentStage).toBe("");
    expect(ids.endTime).toBe("");
    expect(ids.activeTray).toBe("");
  });

  it("nothing without a printer, or with a sensor it doesn't know", () => {
    for (const value of ["", null, undefined, "sensor.other", "  "]) {
      expect(Object.values(printerEntityIds(value)).every((id) => id === "")).toBe(true);
    }
  });
});

describe("printerPartIds", () => {
  it("ha-bambulab's buttons, cover image and chamber light", () => {
    expect(printerPartIds("sensor.a1_x_print_status")).toEqual({
      online: "",
      hmsErrors: "binary_sensor.a1_x_hms_errors",
      cover: "image.a1_x_cover_image",
      camera: "camera.a1_x_camera",
      pause: "button.a1_x_pause_printing",
      resume: "button.a1_x_resume_printing",
      stop: "button.a1_x_stop_printing",
      chamberLight: "light.a1_x_chamber_light",
    });
  });

  it("Bambuddy's, with an online sensor and a chamber light switch", () => {
    expect(printerPartIds("sensor.h2s_x_status")).toMatchObject({
      online: "binary_sensor.h2s_x_online",
      cover: "image.h2s_x_cover",
      pause: "button.h2s_x_pause_print",
      stop: "button.h2s_x_stop_print",
      chamberLight: "switch.h2s_x_chamber_light",
    });
  });

  it("none for a value that isn't a sensor", () => {
    expect(Object.values(printerPartIds("binary_sensor.x_status")).every((id) => id === "")).toBe(true);
    expect(Object.values(printerPartIds("")).every((id) => id === "")).toBe(true);
  });
});

describe("printerStatus", () => {
  it("knows both integrations' words", () => {
    expect(printerStatus("running")).toEqual({ label: "Printing", palette: "green" });
    expect(printerStatus("printing")).toEqual({ label: "Printing", palette: "green" });
    expect(printerStatus("pause")).toEqual({ label: "Paused", palette: "orange" });
    expect(printerStatus("failed")).toEqual({ label: "Failed", palette: "red" });
  });

  it("spells out a status it hasn't met", () => {
    expect(printerStatus("weird_state")).toEqual({ label: "Weird state", palette: "gray" });
  });

  it("a job is active while printing, paused or getting ready", () => {
    expect(["running", "printing", "prepare", "slicing", "init", "pause"].every(isPrintActive)).toBe(true);
    expect(["finish", "failed", "idle", "offline", "unknown"].some(isPrintActive)).toBe(false);
  });
});

describe("heaterOn", () => {
  it("an idle heater's 0°C target reads 32 in Fahrenheit", () => {
    expect(heaterOn(32, "°F")).toBe(false);
    expect(heaterOn(33, "°F")).toBe(true);
    expect(heaterOn(0, "°C")).toBe(false);
    expect(heaterOn(1, "°C")).toBe(true);
    expect(heaterOn(null, "°C")).toBe(false);
  });
});
