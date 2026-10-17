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
