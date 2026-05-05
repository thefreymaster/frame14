import { useQuery } from "@tanstack/react-query";

export interface EntitiesConfig {
  lights: string[];
  weather: { current: string; forecast: string };
  climate: string[];
  energy: {
    currentProduction: string;
    currentConsumption: string;
    productionToday: string;
    consumptionToday: string;
  };
  vacuums: string[];
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
