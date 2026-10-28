import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEntity } from "./useEntity";

/** GET /api/software: the installed add-on and what the add-on store has. */
export interface SoftwareInfo {
  /** The installed add-on's version (the page may run an older one). */
  installed: string;
  /**
   * The add-on's update entity in Home Assistant, null outside the add-on:
   * the Supervisor keeps it, `available` while the store has a newer version.
   */
  update: SoftwareUpdate | null;
}

export interface SoftwareUpdate {
  entityId: string;
  installed: string | null;
  latest: string | null;
  available: boolean;
  releaseUrl: string | null;
}

interface UpdateAttributes {
  installed_version?: string | null;
  latest_version?: string | null;
  release_url?: string | null;
}

async function fetchSoftware(): Promise<SoftwareInfo> {
  const res = await fetch("/api/software");
  if (!res.ok) throw new Error(`Software fetch failed: ${res.status}`);
  return res.json() as Promise<SoftwareInfo>;
}

/**
 * POST /api/software/check: Home Assistant's "Check for updates" from here —
 * the Supervisor reloads the add-on store and the update entity is
 * refreshed. Resolves to the software as it stands after that (a store
 * reload takes a few seconds).
 */
async function checkSoftware(): Promise<SoftwareInfo> {
  const res = await fetch("/api/software/check", { method: "POST" });
  const body = (await res.json().catch(() => ({}))) as SoftwareInfo & {
    error?: string;
  };
  if (!res.ok) throw new Error(body.error ?? `Check failed: ${res.status}`);
  return body;
}

/**
 * POST /api/software/install: asks Home Assistant to install the store's
 * newer version. Resolves to the version asked for once the request is in;
 * the add-on then restarts, so nothing more comes back from it.
 */
export async function installSoftware(): Promise<string | null> {
  const res = await fetch("/api/software/install", { method: "POST" });
  const body = (await res.json().catch(() => ({}))) as {
    version?: string | null;
    error?: string;
  };
  if (!res.ok) throw new Error(body.error ?? `Install failed: ${res.status}`);
  return body.version ?? null;
}

/**
 * The Software card's facts: /api/software (every five minutes and on each
 * return to the page), with the update entity it names followed live over
 * the socket, so a newer version shows the moment Home Assistant sees it.
 */
export function useSoftware(): {
  loading: boolean;
  installed: string;
  update: SoftwareUpdate | null;
  /** Checks the store now (checkSoftware) and takes the answer as the facts. */
  check: () => Promise<SoftwareInfo>;
} {
  const qc = useQueryClient();
  const check = useCallback(async () => {
    const info = await checkSoftware();
    qc.setQueryData(["software"], info);
    return info;
  }, [qc]);
  const query = useQuery<SoftwareInfo>({
    queryKey: ["software"],
    queryFn: fetchSoftware,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
  const update = query.data?.update ?? null;
  const live = useEntity<UpdateAttributes>(update?.entityId ?? "");
  const state = live.data;
  return {
    check,
    loading: query.isPending,
    installed: query.data?.installed ?? "",
    update:
      update && state
        ? {
            ...update,
            installed: state.attributes.installed_version ?? update.installed,
            latest: state.attributes.latest_version ?? update.latest,
            available: state.state === "on",
            releaseUrl: state.attributes.release_url ?? update.releaseUrl,
          }
        : update,
  };
}
