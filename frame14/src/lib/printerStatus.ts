import { sentenceCase } from "./format";

// What the printer's status sensor means. Bambuddy reports the printer's raw
// gcode_state in upper case (RUNNING, PAUSE, FINISH…), ha-bambulab its own
// lower-case words; both are lower-cased before they get here.

const STATUS: Record<string, { label: string; palette: string }> = {
  running: { label: "Printing", palette: "green" },
  printing: { label: "Printing", palette: "green" },
  prepare: { label: "Preparing", palette: "blue" },
  slicing: { label: "Slicing", palette: "blue" },
  init: { label: "Starting", palette: "blue" },
  pause: { label: "Paused", palette: "orange" },
  finish: { label: "Finished", palette: "green" },
  failed: { label: "Failed", palette: "red" },
  idle: { label: "Idle", palette: "gray" },
  offline: { label: "Offline", palette: "gray" },
  unknown: { label: "Unknown", palette: "gray" },
  unavailable: { label: "Unavailable", palette: "gray" },
};

/** The status's words and its Chakra colour palette. */
export function printerStatus(status: string): {
  label: string;
  palette: string;
} {
  return STATUS[status] ?? { label: sentenceCase(status), palette: "gray" };
}

const ACTIVE = new Set([
  "running",
  "printing",
  "prepare",
  "slicing",
  "init",
  "pause",
]);

/** A job is under way: printing, paused or getting ready. */
export function isPrintActive(status: string): boolean {
  return ACTIVE.has(status);
}

/**
 * Whether a heater's target means it's on. An idle heater's target is 0°C,
 * which a °F sensor reports as 32.
 */
export function heaterOn(target: number | null, unit: string): boolean {
  if (target == null) return false;
  return unit === "°F" ? target > 32 : target > 0;
}
