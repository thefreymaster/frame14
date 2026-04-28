import { useEffect, useMemo } from "react";
import {
  useQueries,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { socket } from "../lib/socket";

export interface HAState<A = Record<string, unknown>> {
  entity_id: string;
  state: string;
  attributes: A;
  last_changed: string;
  last_updated: string;
}

const refCounts = new Map<string, number>();

function normalizeEntityIds(entityIds: readonly string[]) {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const entityId of entityIds) {
    if (!entityId || seen.has(entityId)) continue;
    seen.add(entityId);
    normalized.push(entityId);
  }

  return normalized;
}

function refSubscribe(entityId: string) {
  const cur = refCounts.get(entityId) ?? 0;
  refCounts.set(entityId, cur + 1);
  if (cur === 0) socket.emit("entity:subscribe", entityId);
}

function refUnsubscribe(entityId: string) {
  const cur = refCounts.get(entityId) ?? 0;
  if (cur <= 0) return;
  const next = cur - 1;
  if (next === 0) {
    refCounts.delete(entityId);
    socket.emit("entity:unsubscribe", entityId);
  } else {
    refCounts.set(entityId, next);
  }
}

// Re-subscribe everything after a reconnect so rooms survive socket drops.
socket.on("connect", () => {
  for (const entityId of refCounts.keys()) {
    socket.emit("entity:subscribe", entityId);
  }
});

export function useEntity<A = Record<string, unknown>>(entityId: string) {
  const qc = useQueryClient();

  useEffect(() => {
    function onUpdate(data: HAState<A>) {
      qc.setQueryData<HAState<A>>(["entity", entityId], data);
    }

    socket.on(entityId, onUpdate);
    refSubscribe(entityId);

    return () => {
      refUnsubscribe(entityId);
      socket.off(entityId, onUpdate);
    };
  }, [entityId, qc]);

  return useQuery<HAState<A> | undefined>({
    queryKey: ["entity", entityId],
    queryFn: () => qc.getQueryData<HAState<A>>(["entity", entityId]),
    enabled: false,
    staleTime: Infinity,
  });
}

export function useEntities<A = Record<string, unknown>>(
  entityIds: readonly string[],
) {
  const qc = useQueryClient();
  const entityKey = entityIds.join("\0");
  const normalizedEntityIds = useMemo(
    () => normalizeEntityIds(entityIds),
    [entityKey],
  );

  useEffect(() => {
    const handlers = new Map<string, (data: HAState<A>) => void>();

    for (const entityId of normalizedEntityIds) {
      const onUpdate = (data: HAState<A>) => {
        qc.setQueryData<HAState<A>>(["entity", entityId], data);
      };

      handlers.set(entityId, onUpdate);
      socket.on(entityId, onUpdate);
      refSubscribe(entityId);
    }

    return () => {
      for (const [entityId, onUpdate] of handlers) {
        refUnsubscribe(entityId);
        socket.off(entityId, onUpdate);
      }
    };
  }, [normalizedEntityIds, qc]);

  return useQueries({
    queries: normalizedEntityIds.map((entityId) => ({
      queryKey: ["entity", entityId],
      queryFn: () => qc.getQueryData<HAState<A>>(["entity", entityId]),
      enabled: false,
      staleTime: Infinity,
    })),
  }) as UseQueryResult<HAState<A> | undefined>[];
}
