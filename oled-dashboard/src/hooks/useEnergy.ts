import { useQuery } from "@tanstack/react-query";

export interface EnergyData {
  production: number;
  productionUnit: string;
  consumption: number;
  consumptionUnit: string;
}

async function fetchEnergy(): Promise<EnergyData> {
  const res = await fetch("/api/energy");
  if (!res.ok) throw new Error(`Energy fetch failed: ${res.status}`);
  return res.json() as Promise<EnergyData>;
}

export function useEnergy() {
  return useQuery({
    queryKey: ["energy"],
    queryFn: fetchEnergy,
    refetchInterval: 1000 * 60 * 5,
  });
}
