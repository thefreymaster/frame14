import { useQuery } from "@tanstack/react-query";

export interface EnergyTodayPoint {
  /** The quarter hour's start. */
  time: string;
  /** Mean solar production, W. */
  production: number | null;
  /** Mean home consumption, W. */
  consumption: number | null;
}

export interface EnergyToday {
  /** Local midnight today and tomorrow. */
  start: string;
  end: string;
  points: EnergyTodayPoint[];
  /** kWh of today's solar the house used itself. */
  selfConsumed: number | null;
}

/**
 * /api/energy/today: today's power curve in quarter hours. Only fetched while
 * `enabled` (the energy dialog is open); HA compiles the statistics every
 * five minutes, so it refetches at that pace.
 */
export function useEnergyToday(enabled: boolean) {
  return useQuery<EnergyToday>({
    queryKey: ["energy", "today"],
    queryFn: async () => {
      const res = await fetch("/api/energy/today");
      if (!res.ok) throw new Error(`Today's power fetch failed: ${res.status}`);
      return res.json();
    },
    enabled,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
