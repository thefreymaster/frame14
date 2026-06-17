import { useQuery } from "@tanstack/react-query";

export interface Circuit {
  name: string;
  watts: number | null;
  kwhToday: number | null;
}

export interface CircuitsData {
  totalWatts: number | null;
  balanceWatts: number | null;
  circuits: Circuit[];
}

async function fetchCircuits(): Promise<CircuitsData> {
  const res = await fetch("/api/circuits");
  if (!res.ok) throw new Error(`Circuits fetch failed: ${res.status}`);
  return res.json() as Promise<CircuitsData>;
}

export function useCircuits() {
  return useQuery({
    queryKey: ["circuits"],
    queryFn: fetchCircuits,
    refetchInterval: 10_000,
  });
}
