import { useQuery } from "@tanstack/react-query";

/** GET /api/connection: what the server knows about this client and itself. */
export interface ConnectionInfo {
  client: {
    /** This device's address as the server sees it (null if unknown). */
    address: string | null;
  };
  server: {
    hostname: string;
    /** The server's LAN addresses (IPv4, non-loopback). */
    addresses: string[];
    /** The installed add-on version (the page may be running an older one). */
    version: string;
    uptimeSeconds: number;
  };
  homeAssistant: {
    /** The host of the configured HA URL ("supervisor" in the add-on). */
    host: string;
    /** Whether the server's HA WebSocket is up right now. */
    connected: boolean;
  };
}

async function fetchConnectionInfo(): Promise<ConnectionInfo> {
  const res = await fetch("/api/connection");
  if (!res.ok) throw new Error(`Connection info fetch failed: ${res.status}`);
  return res.json() as Promise<ConnectionInfo>;
}

/**
 * The connection menu's server-side facts, fetched while the menu is open
 * (`enabled`) and refreshed every few seconds in case the HA link changes.
 */
export function useConnectionInfo(enabled: boolean) {
  return useQuery<ConnectionInfo>({
    queryKey: ["connection-info"],
    queryFn: fetchConnectionInfo,
    enabled,
    refetchInterval: enabled ? 5_000 : false,
    staleTime: 0,
    retry: false,
  });
}
