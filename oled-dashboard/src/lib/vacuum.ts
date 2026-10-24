import { sentenceCase } from "./format";

// The /vacuum page's model of a robot vacuum. The core Roborock integration
// names every entity after the vacuum's own (vacuum.roborock_q5_pro →
// sensor.roborock_q5_pro_battery, …), so they're derived from it; fields a
// vacuum lacks just never get a state. Its maps are image entities named the
// same way, which the server finds (GET /api/home/vacuum).

export function vacuumEntityIds(vacuumId: string) {
  const name = vacuumId.split(".")[1] ?? "";
  const sensor = (key: string) => (name ? `sensor.${name}_${key}` : "");
  return {
    /** The finer status: "segment_cleaning", "charging", "emptying_the_bin"… */
    status: sensor("status"),
    battery: sensor("battery"),
    charging: name ? `binary_sensor.${name}_charging` : "",
    /** "none", or what went wrong: "side_brush_jammed"… */
    error: sensor("vacuum_error"),
    progress: sensor("cleaning_progress"),
    /** The current or last clean's area and time. */
    area: sensor("cleaning_area"),
    time: sensor("cleaning_time"),
    lastClean: sensor("last_clean_begin"),
    mainBrush: sensor("main_brush_time_left"),
    sideBrush: sensor("side_brush_time_left"),
    filter: sensor("filter_time_left"),
    sensors: sensor("sensor_time_left"),
  };
}

export type VacuumPartKey = "mainBrush" | "sideBrush" | "filter" | "sensors";

/**
 * The parts Roborock counts down, with its replacement intervals in hours of
 * use: the sensors report hours left, which go negative once a part is due.
 */
export const VACUUM_PARTS: {
  key: VacuumPartKey;
  label: string;
  hours: number;
}[] = [
  { key: "mainBrush", label: "Main brush", hours: 300 },
  { key: "sideBrush", label: "Side brush", hours: 200 },
  { key: "filter", label: "Filter", hours: 150 },
  { key: "sensors", label: "Sensors", hours: 30 },
];

const STATE: Record<string, { label: string; palette: string }> = {
  cleaning: { label: "Cleaning", palette: "green" },
  returning: { label: "Returning", palette: "blue" },
  docked: { label: "Docked", palette: "gray" },
  paused: { label: "Paused", palette: "orange" },
  idle: { label: "Idle", palette: "gray" },
  error: { label: "Error", palette: "red" },
  unavailable: { label: "Offline", palette: "gray" },
  unknown: { label: "Unknown", palette: "gray" },
};

/** The vacuum's state in words and its colour; docked and charging says so. */
export function vacuumState(
  state: string,
  charging: boolean,
): { label: string; palette: string } {
  if (state === "docked" && charging) {
    return { label: "Charging", palette: "green" };
  }
  return STATE[state] ?? { label: sentenceCase(state), palette: "gray" };
}

const FAN_SPEED_LABEL: Record<string, string> = {
  off: "Off",
  gentle: "Gentle",
  quiet: "Quiet",
  silent: "Silent",
  balanced: "Balanced",
  standard: "Standard",
  turbo: "Turbo",
  strong: "Strong",
  max: "Max",
  max_plus: "Max+",
  custom: "Custom",
  smart_mode: "Smart",
};

export function fanSpeedLabel(speed: string): string {
  return FAN_SPEED_LABEL[speed] ?? sentenceCase(speed);
}

/**
 * Suction settings that aren't suction: Roborock's "gentle" is suction off
 * for a mop-only run, "custom" is per-room settings from the app.
 */
export const HIDDEN_FAN_SPEEDS = new Set(["gentle", "off", "custom"]);
