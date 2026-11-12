import type { EntitiesConfig } from "../hooks/useEntitiesConfig";

/**
 * What this install has set up, read from its entity config (/api/entities).
 * Nothing about the house is hard-coded, and a feature whose entities are
 * left empty is left out everywhere (0.159.0, the user: "if the entities are
 * not provided then those cards and routes are not shown"): its nav entry
 * and Settings' Navigation row, a remote's Views tile, its Home card, its
 * page (RequireFeature sends a visit home) and its queries.
 *
 * - `solar`: both power-now sensors (what /api/energy needs); `circuits`: a
 *   monitored circuit; `energy`, the Energy page: either.
 * - `lights`: a configured light or switch, a light area, or a scene (the
 *   Lights page holds the scenes, 0.165.0).
 * - `cameras`: the Cameras page has something — a camera, the printer's, or
 *   a vacuum's map.
 * - `photos`: an album in `immich_album_ids` (0.162.0; Immich's address and
 *   key from 0.145.0); `unraid`: Home Assistant has a server
 *   (0.151.0), found rather than configured.
 */
export type Feature =
  | "lights"
  | "climate"
  | "fans"
  | "solar"
  | "circuits"
  | "energy"
  | "weather"
  | "printer"
  | "vacuum"
  | "cameras"
  | "football"
  | "photos"
  | "unraid";

export type Features = Record<Feature, boolean>;

/**
 * Before the config has loaded (a first launch: it's persisted after), every
 * feature counts as set up but Unraid — a page that has one can't flicker it
 * out and back — and Unraid arrives instead, as most installs have none.
 */
export const FEATURES_UNTIL_LOADED: Features = {
  lights: true,
  climate: true,
  fans: true,
  solar: true,
  circuits: true,
  energy: true,
  weather: true,
  printer: true,
  vacuum: true,
  cameras: true,
  football: true,
  photos: true,
  unraid: false,
};

const some = (list: readonly unknown[] | undefined) => (list?.length ?? 0) > 0;

export function featuresOf(config: EntitiesConfig | undefined): Features {
  if (!config) return FEATURES_UNTIL_LOADED;
  const solar = Boolean(
    config.energy?.currentProduction && config.energy?.currentConsumption,
  );
  const circuits = some(config.circuits?.items);
  const printer = Boolean(config.printer);
  const vacuum = some(config.vacuums);
  return {
    lights:
      some(config.lights) || some(config.lightAreas) || some(config.scenes),
    climate: some(config.climate),
    fans: some(config.fans),
    solar,
    circuits,
    energy: solar || circuits,
    weather: Boolean(config.weather?.current),
    printer,
    vacuum,
    cameras: some(config.cameras) || Boolean(config.camera) || printer || vacuum,
    football: some(config.teamTracker),
    // Absent from a config restored from before 0.145.0: set up.
    photos: config.photos !== false,
    unraid: some(config.unraid),
  };
}
