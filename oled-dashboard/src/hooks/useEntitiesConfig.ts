import { useQuery } from "@tanstack/react-query";

export interface EntitiesConfig {
  lights: string[];
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
  /** The Media page's (`media_player_entities`); the marquee's when empty. */
  mediaPlayers: string[];
  printer: string;
  teamTracker: string[];
  person: string;
  /** The doorbell card's camera. */
  camera: string;
  /** The Cameras page's (`camera_entities`); the doorbell's when empty. */
  cameras: string[];
}

async function fetchEntitiesConfig(): Promise<EntitiesConfig> {
  const res = await fetch("/api/entities");
  if (!res.ok) throw new Error(`Entities config fetch failed: ${res.status}`);
  return res.json() as Promise<EntitiesConfig>;
}

export function useEntitiesConfig() {
  return useQuery<EntitiesConfig>({
    queryKey: ["entities-config"],
    queryFn: fetchEntitiesConfig,
    staleTime: Infinity,
  });
}
