import { useQuery } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { socket } from "../lib/socket";

/** A room (a Home Assistant area) and the configured lights and switches in it. */
export interface LightRoom {
  id: string;
  name: string;
  lights: string[];
  /**
   * The configured cameras in it (0.144): a camera's full screen carries the
   * room's lights. Absent from a config a page restored from before it.
   */
  cameras?: string[];
}

export interface EntitiesConfig {
  /** The configured lights and switches, plus every light in `lightAreas`. */
  lights: string[];
  /** The `light_areas` option, as configured. */
  lightAreas?: string[];
  /** The lights by room (ha-areas.js, since 0.122): /lights' groups. */
  rooms?: LightRoom[];
  weather: { current: string; forecast: string };
  climate: string[];
  /** Labels for thermostats whose `friendly_name` shouldn't show, by entity id. */
  climateNames?: Record<string, string>;
  energy: {
    currentProduction: string;
    currentConsumption: string;
    productionToday: string;
    consumptionToday: string;
    lifetimeProduction?: string;
    lifetimeConsumption?: string;
  };
  vacuums: string[];
  fans: string[];
  /** The marquee's media player. */
  mediaPlayer: string;
  printer: string;
  teamTracker: string[];
  person: string;
  /** The doorbell card's camera. */
  camera: string;
  /** The Cameras page's (`camera_entities`); the doorbell's when empty. */
  cameras: string[];
  /** The lights and switches the All off buttons leave on (`light_all_off_exclude`, 0.145.0). */
  lightAllOffExclude?: string[];
  /**
   * Whether Immich is set up (0.145.0): without it the Photos pages, their
   * nav entries, the remote's Photos view and the album picker are left out.
   * Absent from a config restored from before it: set up.
   */
  photos?: boolean;
}

async function fetchEntitiesConfig(): Promise<EntitiesConfig> {
  const res = await fetch("/api/entities");
  if (!res.ok) throw new Error(`Entities config fetch failed: ${res.status}`);
  return res.json() as Promise<EntitiesConfig>;
}

// The server sends the config again when Home Assistant's rooms resolve or
// change (ha-areas.js): take it as the query's answer, so /lights regroups
// without a reload.
socket.on("entities", (config: EntitiesConfig) => {
  queryClient.setQueryData(["entities-config"], config);
});

export function useEntitiesConfig() {
  return useQuery<EntitiesConfig>({
    queryKey: ["entities-config"],
    queryFn: fetchEntitiesConfig,
    staleTime: Infinity,
  });
}
