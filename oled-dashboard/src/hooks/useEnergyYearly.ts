import { useQuery } from "@tanstack/react-query";
import type { NivoSeries } from "./useEnergyMonthly";

export function useEnergyYearly(year?: number) {
  return useQuery<NivoSeries[]>({
    queryKey: ["energy", "yearly", year ?? "current"],
    queryFn: async () => {
      const url = year ? `/api/energy/yearly?year=${year}` : "/api/energy/yearly";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch yearly energy");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });
}
