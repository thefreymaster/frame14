import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEntities, type HAState } from "./useEntity";
import { toMinutes } from "../lib/format";
import {
  HIDDEN_FAN_SPEEDS,
  VACUUM_PARTS,
  vacuumEntityIds,
  type VacuumPartKey,
} from "../lib/vacuum";

export interface VacuumMap {
  entity_id: string;
  name: string;
}

interface VacuumResponse {
  entity_id: string;
  maps?: VacuumMap[];
}

/**
 * The configured vacuums' maps, which only the server can find
 * (GET /api/home/vacuum, the same query /home's vacuum card reads).
 */
export function useVacuumMaps(): Map<string, VacuumMap[]> {
  const { data } = useQuery<VacuumResponse[]>({
    queryKey: ["home", "vacuum"],
    queryFn: async () => {
      const res = await fetch("/api/home/vacuum");
      if (!res.ok) throw new Error(`Vacuum fetch failed: ${res.status}`);
      return res.json() as Promise<VacuumResponse[]>;
    },
    staleTime: 1000 * 60 * 5,
  });
  return useMemo(
    () => new Map((data ?? []).map((v) => [v.entity_id, v.maps ?? []])),
    [data],
  );
}

export interface VacuumPart {
  key: VacuumPartKey;
  label: string;
  /** Hours of use left; negative once it's due. */
  hoursLeft: number;
  /** Roborock's interval for it, in hours. */
  lifeHours: number;
}

/** One vacuum on the /vacuum page, live from its entities. */
export interface VacuumModel {
  entityId: string;
  name: string;
  /** The vacuum entity's state: cleaning, returning, docked, paused, idle, error… */
  state: string;
  /** Configured, but its state hasn't arrived yet. */
  loading: boolean;
  charging: boolean;
  /** The integration's finer status ("segment_cleaning"), if it has one. */
  status: string | null;
  /** What went wrong, if anything ("side_brush_jammed"). */
  error: string | null;
  battery: number | null;
  progress: number | null;
  area: number | null;
  areaUnit: string;
  cleanMinutes: number | null;
  lastClean: Date | null;
  fanSpeed: string | null;
  /** The suction settings to offer (HIDDEN_FAN_SPEEDS left out). */
  fanSpeeds: string[];
  parts: VacuumPart[];
  /** Its maps, each with its image entity's state to ask for it by. */
  maps: (VacuumMap & { version: string | null })[];
  /** When the vacuum entity last changed state. */
  since: Date | null;
}

interface VacuumAttributes {
  friendly_name?: string;
  fan_speed?: string | null;
  fan_speed_list?: string[] | null;
}

const DEAD = new Set(["unknown", "unavailable", "none", ""]);

function num(state: HAState | undefined): number | null {
  if (!state || DEAD.has(state.state)) return null;
  const n = parseFloat(state.state);
  return Number.isNaN(n) ? null : n;
}

function unitOf(state: HAState | undefined): string | undefined {
  const unit = state?.attributes?.unit_of_measurement;
  return typeof unit === "string" ? unit : undefined;
}

export function useVacuum(entityId: string, maps: VacuumMap[]): VacuumModel {
  const ids = useMemo(() => vacuumEntityIds(entityId), [entityId]);
  const all = useMemo(
    () => [entityId, ...Object.values(ids), ...maps.map((m) => m.entity_id)],
    [entityId, ids, maps],
  );
  const results = useEntities(all);
  const byId = new Map<string, HAState>();
  for (const q of results) if (q.data) byId.set(q.data.entity_id, q.data);
  const get = (id: string) => (id ? byId.get(id) : undefined);

  const vacuum = get(entityId) as HAState<VacuumAttributes> | undefined;
  const attrs = vacuum?.attributes ?? {};
  const status = get(ids.status)?.state;
  const error = get(ids.error)?.state;
  const lastClean = get(ids.lastClean)?.state;
  const time = get(ids.time);

  return {
    entityId,
    name: attrs.friendly_name ?? entityId,
    state: vacuum?.state ?? "unknown",
    loading: !vacuum,
    charging: get(ids.charging)?.state === "on" || status === "charging",
    status: status && !DEAD.has(status) ? status : null,
    error: error && !DEAD.has(error) ? error : null,
    battery: num(get(ids.battery)),
    progress: num(get(ids.progress)),
    area: num(get(ids.area)),
    areaUnit: unitOf(get(ids.area)) ?? "m²",
    cleanMinutes: toMinutes(num(time), unitOf(time)),
    lastClean: lastClean && !DEAD.has(lastClean) ? new Date(lastClean) : null,
    fanSpeed: attrs.fan_speed ?? null,
    fanSpeeds: (attrs.fan_speed_list ?? []).filter(
      (s) => !HIDDEN_FAN_SPEEDS.has(s),
    ),
    parts: VACUUM_PARTS.flatMap((p) => {
      const part = get(ids[p.key]);
      const left = toMinutes(num(part), unitOf(part) ?? "h");
      return left == null
        ? []
        : [
            {
              key: p.key,
              label: p.label,
              hoursLeft: left / 60,
              lifeHours: p.hours,
            },
          ];
    }),
    maps: maps.map((m) => {
      const state = get(m.entity_id)?.state;
      return { ...m, version: state && !DEAD.has(state) ? state : null };
    }),
    since: vacuum ? new Date(vacuum.last_changed) : null,
  };
}
