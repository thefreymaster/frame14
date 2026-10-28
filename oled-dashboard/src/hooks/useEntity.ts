import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  notifyManager,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryClient,
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

// Whether the server has answered every subscribe so far. It acks each one,
// after the entity's cached state if it has one, so a page can tell when its
// live states are all in without waiting on an entity Home Assistant lacks.
const unanswered = new Set<string>();
let allAnswered = true;
const answeredListeners = new Set<() => void>();

function setAllAnswered(value: boolean) {
  if (allAnswered === value) return;
  allAnswered = value;
  answeredListeners.forEach((fn) => fn());
}

function answered(entityId: string) {
  if (!unanswered.delete(entityId) || unanswered.size > 0) return;
  // Through React Query's queue, behind the states that arrived ahead of the
  // acks: the flag mustn't turn true before the cards have drawn them.
  notifyManager.schedule(() => setAllAnswered(unanswered.size === 0));
}

function subscribeAnswered(fn: () => void) {
  answeredListeners.add(fn);
  return () => {
    answeredListeners.delete(fn);
  };
}

/** Whether the server has answered every entity subscribe made so far. */
export function entitiesAnswered() {
  return allAnswered;
}

export function useEntitiesAnswered() {
  return useSyncExternalStore(subscribeAnswered, entitiesAnswered);
}

// The entities whose current subscription the server has acked. Unlike the
// flag above, which is trivially true before anything has asked, an entity
// counts only once this page's subscribe for it has been answered — so a
// page can wait for its own states (useEntitiesAcked) from its first render.
const acked = new Set<string>();
const ackedListeners = new Set<() => void>();

function notifyAcked() {
  ackedListeners.forEach((fn) => fn());
}

function subscribeAcked(fn: () => void) {
  ackedListeners.add(fn);
  return () => {
    ackedListeners.delete(fn);
  };
}

/**
 * Whether the server has answered a subscribe for every one of `entityIds`
 * (sending each one's cached state first, where it has one). False until the
 * caller — or anything else — has subscribed them all.
 */
export function useEntitiesAcked(entityIds: readonly string[]) {
  return useSyncExternalStore(subscribeAcked, () =>
    entityIds.every((entityId) => !entityId || acked.has(entityId)),
  );
}

// Live states arrive in bursts — every subscribed entity's at once after a
// connect, forty-odd on /home — and applied one by one each would re-render
// the page. They are gathered and applied together, once per frame, in one
// React Query batch (one render). The subscribes' acks are answered in the
// same flush, behind the states, so `answered` never turns true before the
// cards have drawn them.
const pendingStates = new Map<
  string,
  { qc: QueryClient; entityId: string; data: HAState }
>();
const pendingAcks: (() => void)[] = [];
let flushScheduled = false;

function flush() {
  flushScheduled = false;
  const states = [...pendingStates.values()];
  pendingStates.clear();
  const acks = pendingAcks.splice(0);
  notifyManager.batch(() => {
    for (const { qc, entityId, data } of states) {
      qc.setQueryData<HAState>(["entity", entityId], data);
    }
    for (const ack of acks) ack();
  });
}

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  // A hidden page has no frames; a timer keeps the acks (and the splash) moving.
  if (document.hidden) setTimeout(flush, 0);
  else requestAnimationFrame(flush);
}

function queueState(qc: QueryClient, entityId: string, data: HAState) {
  pendingStates.set(entityId, { qc, entityId, data });
  scheduleFlush();
}

function queueAck(fn: () => void) {
  pendingAcks.push(fn);
  scheduleFlush();
}

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
  if (cur === 0) {
    unanswered.add(entityId);
    acked.delete(entityId);
    setAllAnswered(false);
    socket.emit("entity:subscribe", entityId, () => {
      // Behind the state that arrived ahead of the ack (queueState).
      queueAck(() => {
        acked.add(entityId);
        notifyManager.schedule(notifyAcked);
        answered(entityId);
      });
    });
  }
}

function refUnsubscribe(entityId: string) {
  const cur = refCounts.get(entityId) ?? 0;
  if (cur <= 0) return;
  const next = cur - 1;
  if (next === 0) {
    refCounts.delete(entityId);
    acked.delete(entityId);
    notifyManager.schedule(notifyAcked);
    answered(entityId);
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
    if (!entityId) return;

    function onUpdate(data: HAState<A>) {
      queueState(qc, entityId, data as HAState);
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
        queueState(qc, entityId, data as HAState);
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
