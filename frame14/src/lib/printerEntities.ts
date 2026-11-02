// The printer config value is the printer's status sensor. Its suffix says
// which integration created it, and every sibling sensor shares its prefix:
//   ha-bambulab: sensor.a1_xxx_print_status  (+ _print_progress, _task_name, …)
//   Bambuddy:    sensor.h2s_xxx_status       (+ _progress, _current_print, …)

export const PRINTER_FIELDS = [
  "status",
  "progress",
  "remainingTime",
  "taskName",
  "nozzleTemp",
  "nozzleTarget",
  "bedTemp",
  "bedTarget",
  "chamberTemp",
  "currentLayer",
  "totalLayers",
  "currentStage",
  "endTime",
  "startTime",
  "printLength",
  "printWeight",
  "activeTray",
  "speedProfile",
  "gcodeFilename",
] as const;

export type PrinterField = (typeof PRINTER_FIELDS)[number];

// null: the integration has no such sensor.
type Suffixes = Record<PrinterField, string | null>;

const BAMBU_LAB: Suffixes = {
  status: "print_status",
  progress: "print_progress",
  remainingTime: "remaining_time",
  taskName: "task_name",
  nozzleTemp: "nozzle_temperature",
  nozzleTarget: "nozzle_target_temperature",
  bedTemp: "bed_temperature",
  bedTarget: "bed_target_temperature",
  chamberTemp: "chamber_temperature",
  currentLayer: "current_layer",
  totalLayers: "total_layer_count",
  currentStage: "current_stage",
  endTime: "end_time",
  startTime: "start_time",
  printLength: "print_length",
  printWeight: "print_weight",
  activeTray: "active_tray",
  speedProfile: "speed_profile",
  gcodeFilename: "gcode_filename",
};

const BAMBUDDY: Suffixes = {
  status: "status",
  progress: "progress",
  remainingTime: "remaining_time",
  taskName: "current_print",
  nozzleTemp: "nozzle_temperature",
  nozzleTarget: "nozzle_target_temperature",
  bedTemp: "bed_temperature",
  bedTarget: "bed_target_temperature",
  chamberTemp: "chamber_temperature",
  currentLayer: "current_layer",
  totalLayers: "total_layers",
  currentStage: null,
  endTime: null,
  startTime: null,
  printLength: null,
  printWeight: null,
  activeTray: null,
  speedProfile: null,
  gcodeFilename: "gcode_file",
};

// Entity ID per field; "" where the integration has no such sensor or no
// printer is configured.
export function printerEntityIds(
  configValue: string | undefined | null,
): Record<PrinterField, string> {
  const value = (configValue ?? "").trim();
  // _print_status first: it also ends in _status.
  let base = "";
  let suffixes = BAMBU_LAB;
  if (value.endsWith("_print_status")) {
    base = value.slice(0, -"_print_status".length);
  } else if (value.endsWith("_status")) {
    base = value.slice(0, -"_status".length);
    suffixes = BAMBUDDY;
  }
  return Object.fromEntries(
    PRINTER_FIELDS.map((field) => {
      const suffix = suffixes[field];
      return [field, base && suffix ? `${base}_${suffix}` : ""];
    }),
  ) as Record<PrinterField, string>;
}

/** The printer's entities that aren't sensors; "" where there's none. */
export interface PrinterParts {
  /** binary_sensor: the printer is reachable (Bambuddy). */
  online: string;
  /** binary_sensor: the printer reports HMS errors. */
  hmsErrors: string;
  /** image: the current job's model thumbnail. */
  cover: string;
  camera: string;
  /** buttons */
  pause: string;
  resume: string;
  stop: string;
  /**
   * The chamber light: a light in ha-bambulab, a switch in Bambuddy. Both
   * domains go through the server's general light / switch path, so it isn't
   * in printer-entities.js.
   */
  chamberLight: string;
}

/**
 * The PrinterParts for the configured status sensor, by the same prefix and
 * integration as printerEntityIds. The server derives the camera, the cover
 * and the buttons the same way (printer-entities.js), and accepts presses on
 * those buttons only: keep the two in step.
 */
export function printerPartIds(
  configValue: string | undefined | null,
): PrinterParts {
  const value = (configValue ?? "").trim();
  const none: PrinterParts = {
    online: "",
    hmsErrors: "",
    cover: "",
    camera: "",
    pause: "",
    resume: "",
    stop: "",
    chamberLight: "",
  };
  let name = "";
  let bambuddy = false;
  if (value.endsWith("_print_status")) {
    name = value.slice(0, -"_print_status".length);
  } else if (value.endsWith("_status")) {
    name = value.slice(0, -"_status".length);
    bambuddy = true;
  }
  if (!name.startsWith("sensor.")) return none;
  name = name.slice("sensor.".length);
  const action = bambuddy ? "print" : "printing";
  return {
    online: bambuddy ? `binary_sensor.${name}_online` : "",
    hmsErrors: `binary_sensor.${name}_hms_errors`,
    cover: bambuddy ? `image.${name}_cover` : `image.${name}_cover_image`,
    camera: `camera.${name}_camera`,
    pause: `button.${name}_pause_${action}`,
    resume: `button.${name}_resume_${action}`,
    stop: `button.${name}_stop_${action}`,
    chamberLight: `${bambuddy ? "switch" : "light"}.${name}_chamber_light`,
  };
}
