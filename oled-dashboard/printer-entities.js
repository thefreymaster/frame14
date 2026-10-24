import { ENTITIES } from "./entities.js";

/**
 * The printer's entities that aren't sensors, derived from its status sensor
 * (ENTITIES.printer) the way src/lib/printerEntities.ts derives the rest: the
 * suffix says which integration made it, and every entity shares its prefix.
 *   ha-bambulab: sensor.a1_xxx_print_status
 *   Bambuddy:    sensor.h2s_xxx_status
 * Keep the two in step. null when no printer is configured.
 */
export function printerEntities(statusId = ENTITIES.printer) {
  const value = (statusId ?? "").trim();
  let base = "";
  let bambuddy = false;
  // _print_status first: it also ends in _status.
  if (value.endsWith("_print_status")) {
    base = value.slice(0, -"_print_status".length);
  } else if (value.endsWith("_status")) {
    base = value.slice(0, -"_status".length);
    bambuddy = true;
  }
  if (!base.startsWith("sensor.")) return null;
  const name = base.slice("sensor.".length);
  const button = (action) =>
    `button.${name}_${action}_${bambuddy ? "print" : "printing"}`;
  return {
    camera: `camera.${name}_camera`,
    cover: bambuddy ? `image.${name}_cover` : `image.${name}_cover_image`,
    buttons: [button("pause"), button("resume"), button("stop")],
  };
}
