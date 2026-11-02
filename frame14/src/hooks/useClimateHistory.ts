import { useQuery } from "@tanstack/react-query";

export interface ClimateHistoryPoint {
  /** The quarter hour's start. */
  time: string;
  /** The room temperature over the quarter hour, time-weighted, in HA's unit. */
  temp: number | null;
  /** The target at the end of the quarter hour; null while the unit was off. */
  target: number | null;
  /** What the unit mostly did in the quarter hour, if it ran at all. */
  action: "heating" | "cooling" | null;
}

export interface ClimateHistoryUnit {
  entity_id: string;
  points: ClimateHistoryPoint[];
}

export interface ClimateHistory {
  /** Local midnight today and tomorrow. */
  start: string;
  end: string;
  units: ClimateHistoryUnit[];
}

/**
 * /api/home/climate/history: today's room temperature, target and running
 * time per thermostat, in quarter hours since midnight. Only /climate draws
 * it, so it is fetched there alone; refetched every five minutes, as the
 * energy curve is.
 */
export function useClimateHistory() {
  return useQuery<ClimateHistory>({
    queryKey: ["climate", "history"],
    queryFn: async () => {
      const res = await fetch("/api/home/climate/history");
      if (!res.ok)
        throw new Error(`Climate history fetch failed: ${res.status}`);
      return res.json();
    },
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
