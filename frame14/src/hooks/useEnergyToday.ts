import { useQuery } from "@tanstack/react-query";
import { useFeatureData } from "./useFeatures";

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
 * /api/energy/today: today's power curve in quarter hours. The energy card
 * draws it, so it's fetched whenever /home is up; the dialog reads the same
 * query. HA compiles the statistics every five minutes, so it refetches at
 * that pace. Only once the config says the solar sensors are set up
 * (lib/features): until then, or without them, it stays pending.
 */
export function useEnergyToday() {
  const { enabled } = useFeatureData("solar");
  return useQuery<EnergyToday>({
    queryKey: ["energy", "today"],
    enabled,
    queryFn: async () => {
      const res = await fetch("/api/energy/today");
      if (!res.ok) throw new Error(`Today's power fetch failed: ${res.status}`);
      return res.json();
    },
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
