// The bird config value is the BirdNET-Go "last species" sensor entity ID
// (e.g. "sensor.birdnet_go_front_porch_camera_last_species"). Sibling sensors
// (confidence, scientific name) share that prefix, so we strip the suffix and
// re-derive.
export function birdBaseId(configValue: string | undefined | null): string {
  return (configValue ?? "").replace(/_last_species$/, "");
}

export function birdEntityId(base: string, suffix: string): string {
  return base ? `${base}_${suffix}` : "";
}
