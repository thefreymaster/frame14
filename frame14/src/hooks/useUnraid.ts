import type { UnraidServer } from "../lib/unraid";
import { useEntitiesConfig } from "./useEntitiesConfig";

// A stable empty while the config loads, or without the integration.
const NO_SERVERS: UnraidServer[] = [];

/**
 * The Unraid servers Home Assistant's integration has (0.151.0), from
 * /api/entities' `unraid` — the server finds them in the registries, so they
 * arrive with the rooms, and again when the integration's entities change.
 */
export function useUnraidServers() {
  const { data, isPending } = useEntitiesConfig();
  return { servers: data?.unraid ?? NO_SERVERS, isPending };
}

/**
 * Whether there is an Unraid server: the nav's Unraid entry. False until the
 * config says so — most installs have none, and an entry that shows and then
 * goes would be worse than one that arrives.
 */
export function useUnraidEnabled(): boolean {
  return useUnraidServers().servers.length > 0;
}
