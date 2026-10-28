import { useQuery } from "@tanstack/react-query";

/** GET /api/system: the versions the desktop footer shows. */
export interface SystemInfo {
  /** The installed add-on version (the page may be running an older one). */
  version: string;
  homeAssistant: {
    /** Whether the server's Home Assistant WebSocket is up right now. */
    connected: boolean;
    /** Home Assistant Core's version, e.g. "2026.10.3" (null if unknown). */
    coreVersion: string | null;
    /** Home Assistant OS's version, e.g. "16.2" (null off HAOS). */
    osVersion: string | null;
  };
}

async function fetchSystemInfo(): Promise<SystemInfo> {
  const res = await fetch("/api/system");
  if (!res.ok) throw new Error(`System info fetch failed: ${res.status}`);
  return res.json() as Promise<SystemInfo>;
}

/**
 * The footer's facts, fetched while it is up (`enabled`) and refreshed every
 * minute: the versions change on an update and the HA link can drop.
 */
export function useSystemInfo(enabled: boolean) {
  return useQuery<SystemInfo>({
    queryKey: ["system-info"],
    queryFn: fetchSystemInfo,
    enabled,
    refetchInterval: enabled ? 60_000 : false,
    staleTime: 30_000,
    retry: 1,
  });
}
