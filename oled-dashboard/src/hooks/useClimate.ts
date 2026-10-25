import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEntitiesConfig } from "./useEntitiesConfig";
import { useEntities, type HAState } from "./useEntity";
import type { HomeClimate } from "./useHomeData";

interface ClimateAttributes {
  friendly_name?: string;
  current_temperature?: number | string | null;
  current_humidity?: number | string | null;
  temperature?: number | string | null;
  hvac_mode?: string | null;
  hvac_action?: string | null;
  fan_mode?: string | null;
  fan_modes?: string[] | null;
}

interface ClimateResponse {
  entity_id: string;
  name: string;
  state: string;
  currentTemp: number | null;
  currentHumidity?: number | null;
  targetTemp: number | null;
  hvacMode: string | null;
  hvacAction: string | null;
  fanMode: string | null;
  fanModes: string[] | null;
}

// A stable empty list while the config loads: useEntities re-subscribes when
// the array changes identity.
const NO_IDS: string[] = [];
const NO_NAMES: Record<string, string> = {};

function parseFloatOrNull(
  value: number | string | undefined | null,
): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

function mapClimateResponse(climate: ClimateResponse): HomeClimate {
  return {
    entity_id: climate.entity_id,
    name: climate.name,
    state: climate.state,
    currentTemp: climate.currentTemp,
    currentHumidity: climate.currentHumidity ?? null,
    targetTemp: climate.targetTemp,
    hvacMode: climate.hvacMode,
    hvacAction: climate.hvacAction,
    fanMode: climate.fanMode ?? null,
    fanModes: climate.fanModes ?? [],
  };
}

function mapClimateState(
  state: HAState<ClimateAttributes>,
  /** Configured labels (the add-on's climate_names), over the entity's own. */
  names: Record<string, string>,
): HomeClimate {
  return {
    entity_id: state.entity_id,
    name:
      names[state.entity_id] ??
      state.attributes?.friendly_name ??
      state.entity_id,
    state: state.state,
    currentTemp: parseFloatOrNull(state.attributes?.current_temperature),
    currentHumidity: parseFloatOrNull(state.attributes?.current_humidity),
    targetTemp: parseFloatOrNull(state.attributes?.temperature),
    hvacMode: state.attributes?.hvac_mode ?? state.state ?? null,
    hvacAction: state.attributes?.hvac_action ?? null,
    fanMode: state.attributes?.fan_mode ?? null,
    fanModes: state.attributes?.fan_modes ?? [],
  };
}

async function fetchClimate(): Promise<ClimateResponse[]> {
  const res = await fetch("/api/home/climate");
  if (!res.ok) throw new Error(`Climate fetch failed: ${res.status}`);
  return res.json() as Promise<ClimateResponse[]>;
}

/** Every entity has pushed a live state, so the REST snapshot isn't needed. */
function allLive(states: { data?: unknown }[]): boolean {
  return states.length > 0 && states.every((state) => state.data != null);
}

/**
 * The thermostats, live: /api/home/climate once for a snapshot (named by the
 * add-on's climate_names), then each configured climate entity over the
 * socket, in the config's order. `loading` holds until the snapshot or a live
 * state for every unit, whichever comes first. Shared by /home's climate card
 * (useHomeData) and /climate, which read one query and one set of
 * subscriptions.
 */
export function useClimate(): { climate: HomeClimate[]; loading: boolean } {
  const entitiesQuery = useEntitiesConfig();
  const configuredIds = entitiesQuery.data?.climate;
  const ids = useMemo(
    () => (configuredIds ? [...new Set(configuredIds)] : NO_IDS),
    [configuredIds],
  );
  const names = entitiesQuery.data?.climateNames ?? NO_NAMES;

  const query = useQuery<ClimateResponse[]>({
    queryKey: ["home", "climate"],
    queryFn: fetchClimate,
    staleTime: Infinity,
  });
  const states = useEntities<ClimateAttributes>(ids);

  const fallback = (query.data ?? []).map(mapClimateResponse);
  const climate: HomeClimate[] =
    ids.length === 0
      ? fallback
      : (() => {
          const fallbackById = new Map(
            fallback.map((unit) => [unit.entity_id, unit]),
          );
          return ids
            .map((entityId, index) => {
              const liveState = states[index]?.data;
              return liveState
                ? mapClimateState(liveState, names)
                : (fallbackById.get(entityId) ?? null);
            })
            .filter((unit): unit is HomeClimate => unit != null);
        })();

  return { climate, loading: query.isPending && !allLive(states) };
}
