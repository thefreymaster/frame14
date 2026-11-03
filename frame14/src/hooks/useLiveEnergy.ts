import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEntitiesConfig } from "./useEntitiesConfig";
import { useEntities } from "./useEntity";
import type { HomeEnergy } from "./useHomeData";

interface EnergyResponse {
  production: number;
  consumption: number;
  currentProduction: number;
  currentConsumption: number;
}

async function fetchEnergy(): Promise<EnergyResponse> {
  const res = await fetch("/api/energy");
  if (!res.ok) throw new Error(`Energy fetch failed: ${res.status}`);
  return res.json() as Promise<EnergyResponse>;
}

const KEYS = [
  "currentProduction",
  "currentConsumption",
  "productionToday",
  "consumptionToday",
] as const;

function parseFloatOrNull(value: string | undefined | null): number | null {
  if (value == null) return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * The house's energy now and today, live: /api/energy every 30s for the day's
 * totals (the lifetime meters' change since yesterday, which the inverter's
 * own "today" sensors can't be trusted for), and the four energy entities
 * over the socket for the power now in W (a kW sensor is scaled). `loading`
 * holds until /api/energy's first answer. Shared by /home (useHomeData) and
 * /energy's Now card, which read one query and one set of subscriptions.
 */
export function useLiveEnergy(): { energy: HomeEnergy; loading: boolean } {
  const entitiesQuery = useEntitiesConfig();
  const entities = useMemo(
    () =>
      KEYS.map((key) => ({
        key,
        entityId: entitiesQuery.data?.energy?.[key] ?? "",
      })).filter((entity) => entity.entityId),
    [entitiesQuery.data?.energy],
  );

  const energyQuery = useQuery<EnergyResponse>({
    queryKey: ["home", "energy"],
    queryFn: fetchEnergy,
    refetchInterval: 1000 * 30,
    staleTime: 1000 * 30,
  });
  const states = useEntities(entities.map(({ entityId }) => entityId));

  const liveByKey = new Map(
    entities.map(({ key }, index) => [key, states[index]?.data]),
  );

  function liveWatts(
    key: "currentProduction" | "currentConsumption",
    fallback: number,
  ): number {
    const s = liveByKey.get(key);
    if (!s) return fallback;
    const val = parseFloatOrNull(s.state);
    if (val == null) return fallback;
    const unit = (s.attributes as Record<string, unknown>)?.unit_of_measurement;
    return unit === "kW" ? val * 1000 : val;
  }

  const energy: HomeEnergy = {
    currentProduction: liveWatts(
      "currentProduction",
      energyQuery.data?.currentProduction ?? 0,
    ),
    currentConsumption: liveWatts(
      "currentConsumption",
      energyQuery.data?.currentConsumption ?? 0,
    ),
    // /api/energy is the authority for the daily totals; the raw "today"
    // sensors are only a fallback for when that request fails.
    productionToday:
      energyQuery.data?.production ??
      parseFloatOrNull(liveByKey.get("productionToday")?.state) ??
      0,
    consumptionToday:
      energyQuery.data?.consumption ??
      parseFloatOrNull(liveByKey.get("consumptionToday")?.state) ??
      0,
  };

  return { energy, loading: energyQuery.isPending };
}
