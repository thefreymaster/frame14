import { useQuery } from "@tanstack/react-query";

export type NivoPoint = { x: string; y: number | null };
export type NivoSeries = { id: string; data: NivoPoint[] };

export function useEnergyMonthly(month?: string) {
  return useQuery<NivoSeries[]>({
    queryKey: ["energy", "monthly", month ?? "current"],
    queryFn: async () => {
      const url = month ? `/api/energy/monthly?month=${month}` : "/api/energy/monthly";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch monthly energy");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });
}
