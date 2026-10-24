import { useMemo } from "react";
import { useEntitiesConfig } from "./useEntitiesConfig";
import { useEntities, type HAState } from "./useEntity";
import { toMinutes } from "../lib/format";
import { printerEntityIds, printerPartIds } from "../lib/printerEntities";

export interface PrinterTemp {
  value: number | null;
  target: number | null;
  /** "°C" or "°F", as the sensor reports it. */
  unit: string;
}

/** The /printer page's printer, live from its entities. */
export interface PrinterModel {
  /** A printer status sensor is configured. */
  configured: boolean;
  /** Configured, but its status hasn't arrived yet. */
  loading: boolean;
  /** Lower case (see lib/printerStatus); "offline" while it's unreachable. */
  status: string;
  /** The printer reports HMS errors. */
  hms: boolean;
  progress: number | null;
  remainingMinutes: number | null;
  /** When the job should end: the time-left sensor's last reading plus it. */
  finishesAt: Date | null;
  taskName: string | null;
  currentLayer: number | null;
  totalLayers: number | null;
  nozzle: PrinterTemp;
  bed: PrinterTemp;
  chamber: PrinterTemp | null;
  /**
   * The cover image entity's state (when it last changed) while it has a
   * picture, to ask for it by: /api/printer/cover?v=…
   */
  coverVersion: string | null;
  hasCamera: boolean;
  /** Button entity IDs, where the printer has them. */
  pause: string | null;
  resume: string | null;
  stop: string | null;
}

const DEAD = new Set(["unknown", "unavailable", ""]);

function num(state: HAState | undefined): number | null {
  if (!state || DEAD.has(state.state)) return null;
  const n = parseFloat(state.state);
  return Number.isNaN(n) ? null : n;
}

function text(state: HAState | undefined): string | null {
  return state && !DEAD.has(state.state) ? state.state : null;
}

function unitOf(state: HAState | undefined): string | undefined {
  const unit = state?.attributes?.unit_of_measurement;
  return typeof unit === "string" ? unit : undefined;
}

export function usePrinter(): PrinterModel {
  const { data: config } = useEntitiesConfig();
  const ids = useMemo(
    () => printerEntityIds(config?.printer),
    [config?.printer],
  );
  const parts = useMemo(
    () => printerPartIds(config?.printer),
    [config?.printer],
  );
  const all = useMemo(
    () => [...Object.values(ids), ...Object.values(parts)].filter(Boolean),
    [ids, parts],
  );
  const results = useEntities(all);
  const byId = new Map<string, HAState>();
  for (const q of results) if (q.data) byId.set(q.data.entity_id, q.data);
  const get = (id: string) => (id ? byId.get(id) : undefined);

  const temp = (value: string, target: string): PrinterTemp => ({
    value: num(get(value)),
    target: num(get(target)),
    unit: unitOf(get(value)) ?? unitOf(get(target)) ?? "°",
  });

  const statusState = get(ids.status);
  const online = get(parts.online);
  const cover = get(parts.cover);
  const camera = get(parts.camera);
  const exists = (id: string) => (get(id) ? id : null);
  const chamber = get(ids.chamberTemp);
  const remainingState = get(ids.remainingTime);
  const remainingMinutes = toMinutes(
    num(remainingState),
    unitOf(remainingState),
  );

  return {
    configured: ids.status !== "",
    loading: ids.status !== "" && !statusState,
    status:
      online?.state === "off"
        ? "offline"
        : (statusState?.state ?? "unknown").toLowerCase(),
    hms: get(parts.hmsErrors)?.state === "on",
    progress: num(get(ids.progress)),
    remainingMinutes,
    finishesAt:
      remainingState && remainingMinutes != null && remainingMinutes > 0
        ? new Date(
            Date.parse(remainingState.last_changed) + remainingMinutes * 60_000,
          )
        : null,
    taskName: text(get(ids.taskName)),
    currentLayer: num(get(ids.currentLayer)),
    totalLayers: num(get(ids.totalLayers)),
    nozzle: temp(ids.nozzleTemp, ids.nozzleTarget),
    bed: temp(ids.bedTemp, ids.bedTarget),
    chamber: chamber
      ? { value: num(chamber), target: null, unit: unitOf(chamber) ?? "°" }
      : null,
    coverVersion: cover && !DEAD.has(cover.state) ? cover.state : null,
    hasCamera: camera != null && camera.state !== "unavailable",
    pause: exists(parts.pause),
    resume: exists(parts.resume),
    stop: exists(parts.stop),
  };
}
