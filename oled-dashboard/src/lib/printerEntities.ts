// The printer config value is the print_status sensor entity ID (e.g.
// "sensor.a1_xxx_print_status"). All sibling sensors from the Bambu Lab
// integration share that prefix, so we strip the suffix and re-derive.
export function printerBaseId(configValue: string | undefined | null): string {
  return (configValue ?? "").replace(/_print_status$/, "");
}

export function printerEntityId(base: string, suffix: string): string {
  return base ? `${base}_${suffix}` : "";
}
