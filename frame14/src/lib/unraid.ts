import type { HAState } from "../hooks/useEntity";

// The Unraid page's model (0.151.0): the servers Home Assistant's Unraid
// integration has, as the server found them in the registries (unraid.js,
// GET /api/entities' `unraid`), and how their entities read.

/** One container: its switch (read for its state and status), and its usage while enabled. */
export interface UnraidContainer {
  /** As Unraid names it ("Plex", "AdGuard-Home"). */
  name: string;
  switch: string;
  /** Its CPU sensor (%), while enabled in Home Assistant. */
  cpu: string | null;
  /** Its memory-used sensor, while enabled in Home Assistant. */
  memory: string | null;
}

/** One VM: its switch, read for its state. */
export interface UnraidVm {
  /** As Unraid names it ("Home Assistant"). */
  name: string;
  switch: string;
}

/** A container or a VM: what the page shows the status of. */
export type GuestKind = "container" | "vm";

/** One server: its sensors' ids (null where it has none), its containers and VMs. */
export interface UnraidServer {
  id: string;
  name: string;
  cpu: string | null;
  cpuTemperature: string | null;
  cpuPower: string | null;
  memory: string | null;
  memoryUsed: string | null;
  dockerCpu: string | null;
  dockerMemoryUsed: string | null;
  upSince: string | null;
  version: string | null;
  containers: UnraidContainer[];
  /** Absent from a config restored from before VMs (0.151.0's first cut). */
  vms?: UnraidVm[];
}

/** A container's or VM's switch attributes the page reads. */
export interface GuestAttrs {
  /** A container's, Docker's: RUNNING, PAUSED, EXITED, CREATED, RESTARTING, DEAD. */
  status?: string;
  /** A VM's, libvirt's: RUNNING, PAUSED, SHUTOFF, PMSUSPENDED, … */
  state?: string;
  icon_url?: string;
}

export type ContainerStatus = {
  label: string;
  palette: "green" | "orange" | "blue" | "gray";
  running: boolean;
};

/**
 * How a container or VM reads: the switch is on while it runs (paused counts
 * — it still holds its memory), and Docker's status (a container's
 * `status`) or libvirt's (a VM's `state`) says the rest.
 */
export function guestStatus(
  kind: GuestKind,
  state: HAState<GuestAttrs> | undefined,
): ContainerStatus {
  if (!state || state.state === "unavailable" || state.state === "unknown")
    return { label: "Unavailable", palette: "gray", running: false };
  const raw = kind === "vm" ? state.attributes.state : state.attributes.status;
  const status = String(raw ?? "").toUpperCase();
  if (state.state !== "on")
    return { label: "Stopped", palette: "gray", running: false };
  if (status === "PAUSED")
    return { label: "Paused", palette: "orange", running: true };
  if (status === "PMSUSPENDED")
    return { label: "Suspended", palette: "orange", running: true };
  if (status === "RESTARTING")
    return { label: "Restarting", palette: "blue", running: true };
  return { label: "Running", palette: "green", running: true };
}

/** How a container reads (guestStatus's). */
export const containerStatus = (state: HAState<GuestAttrs> | undefined) =>
  guestStatus("container", state);

/** The container's icon from its Unraid template, an https URL, or null. */
export function containerIcon(
  state: HAState<GuestAttrs> | undefined,
): string | null {
  const url = state?.attributes.icon_url;
  return typeof url === "string" && /^https:\/\//.test(url) ? url : null;
}

/** A sensor's state as a number, or null (unavailable, unknown, missing). */
export function sensorNumber(state: HAState | undefined): number | null {
  if (!state) return null;
  const n = Number.parseFloat(state.state);
  return Number.isFinite(n) ? n : null;
}

/** A figure to a sensible precision: 512, 25.6, 8.56 → 8.6, 0.25. */
function figure(n: number): string {
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 0 : abs >= 1 ? 1 : 2;
  return String(Number(n.toFixed(digits)));
}

/** A percentage sensor: "13.7%", "—" without a reading. */
export function fmtPercent(state: HAState | undefined): string {
  const n = sensorNumber(state);
  return n == null ? "—" : `${figure(n)}%`;
}

/**
 * A sensor with its unit — a size, a temperature, a power: "8.6 GiB",
 * "75.2°F", "16.6 W", "—" without a reading.
 */
export function fmtReading(
  state: HAState<{ unit_of_measurement?: string }> | undefined,
): string {
  const n = sensorNumber(state);
  if (n == null) return "—";
  const unit = state?.attributes.unit_of_measurement ?? "";
  const gap = unit && !unit.startsWith("°") && unit !== "%" ? " " : "";
  return `${figure(n)}${gap}${unit}`;
}

/** How long since `since` (the server's "Up since"): "1d 19h", "5h 12m", "4m". */
export function fmtUptime(since: string | undefined, now: Date): string {
  const start = since ? new Date(since).getTime() : NaN;
  if (!Number.isFinite(start) || start > now.getTime()) return "—";
  const minutes = Math.floor((now.getTime() - start) / 60_000);
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** The RAM sensor's detail line: "5.5 GB available of 31.1 GB". */
export function memoryDetail(
  state: HAState<{ total?: string; available?: string }> | undefined,
): string | null {
  const { total, available } = state?.attributes ?? {};
  if (typeof total !== "string") return null;
  return typeof available === "string"
    ? `${available} available of ${total}`
    : `${total} in all`;
}

/** The CPU sensor's detail line: "10 cores · 16 threads". */
export function cpuDetail(
  state: HAState<{ cpu_cores?: number; cpu_threads?: number }> | undefined,
): string | null {
  const { cpu_cores: cores, cpu_threads: threads } = state?.attributes ?? {};
  const parts = [
    typeof cores === "number" && `${cores} ${cores === 1 ? "core" : "cores"}`,
    typeof threads === "number" &&
      `${threads} ${threads === 1 ? "thread" : "threads"}`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
