import {
  dehydrate,
  hydrate,
  type DehydratedState,
  type Query,
  type QueryClient,
} from "@tanstack/react-query";
import { RUNNING_VERSION } from "./appVersion";

/**
 * The query cache, kept in localStorage between launches so the page opens
 * on what it last knew — the cards drawn from the last visit's weather,
 * thermostats, energy, calendar and entity states while the live answers are
 * fetched — instead of on skeletons. Apple Home does the same: last known
 * state at once, then the refresh.
 *
 * Keyed by the app's version, since a new build may change the shapes: the
 * first launch after an update starts from nothing. Only the home and entity
 * queries are kept (PERSISTED, by the key's first word), not the photo albums
 * or the camera pictures, and never more than MAX_BYTES. Everything restored
 * is marked invalidated, so each query refetches as soon as something mounts
 * it; the entity queries get their live state over the socket instead
 * (useEntity subscribes on mount, and the server answers with its state).
 */

const PREFIX = "query-cache:";
const KEY = `${PREFIX}${RUNNING_VERSION}`;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_BYTES = 1_000_000;
// Saves are coalesced: the live states change the cache many times a minute.
const SAVE_DELAY_MS = 2000;
const PERSISTED = new Set([
  "entities-config",
  "entity",
  "home",
  "energy",
  "assist-config",
]);

function persisted(query: Query): boolean {
  const head = query.queryKey[0];
  return (
    typeof head === "string" &&
    PERSISTED.has(head) &&
    query.state.status === "success" &&
    query.state.data !== undefined
  );
}

/** Before the first render: the last launch's queries, as a starting point. */
export function restoreQueries(client: QueryClient) {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX) && key !== KEY) localStorage.removeItem(key);
    }
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as {
      savedAt?: unknown;
      state?: DehydratedState;
    };
    if (
      typeof saved.savedAt !== "number" ||
      Date.now() - saved.savedAt > MAX_AGE_MS ||
      !saved.state
    ) {
      return;
    }
    hydrate(client, saved.state);
    // Last known, not current: stale from the start, whatever its staleTime.
    void client.invalidateQueries({ refetchType: "none" });
  } catch {
    // An unreadable cache is no cache: the page fetches as it always did.
  }
}

/** Keep saving the cache as it changes, and on the way to the background. */
export function persistQueries(client: QueryClient) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function save() {
    if (timer != null) clearTimeout(timer);
    timer = null;
    try {
      const state = dehydrate(client, {
        shouldDehydrateQuery: persisted,
        shouldDehydrateMutation: () => false,
      });
      const raw = JSON.stringify({ savedAt: Date.now(), state });
      if (raw.length > MAX_BYTES) return;
      localStorage.setItem(KEY, raw);
    } catch {
      // Full or unavailable storage: the next launch fetches.
    }
  }

  client.getQueryCache().subscribe((event) => {
    if (
      event.type === "added" ||
      event.type === "updated" ||
      event.type === "removed"
    ) {
      timer ??= setTimeout(save, SAVE_DELAY_MS);
    }
  });
  // iOS drops a backgrounded page without warning: save on the way out.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") save();
  });
  window.addEventListener("pagehide", save);
}
