import { useSyncExternalStore } from "react";

// This device's favourite lights (0.153.0, the user's ask: "Allow the user to
// specify favorite lights when they long press"): the star in a light's
// drawer. Kept in localStorage (`light-favorites`, a list of entity ids) per
// device, as the Home and nav layouts are — the kitchen frame's favourites
// are the kitchen's, a phone's its user's. /home's Lights card shows them in
// place of the lights that are on, and /lights puts them in a card of their
// own at the top. The list keeps every id it is given: one that isn't a
// configured light (yet, or any more) is left out where it's shown, not here.

const STORAGE_KEY = "light-favorites";

const EMPTY: string[] = [];

/** A stored list made safe to use: entity ids only, each once, in order. */
function parse(raw: string | null): string[] {
  if (!raw) return EMPTY;
  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    return EMPTY;
  }
  if (!Array.isArray(saved)) return EMPTY;
  const ids = saved.filter(
    (id): id is string => typeof id === "string" && id.includes("."),
  );
  return ids.length > 0 ? [...new Set(ids)] : EMPTY;
}

// The last list read, so the store hands React the same array until the
// stored one changes.
let cache: { raw: string | null; favorites: string[] } | null = null;

export function loadLightFavorites(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  if (cache && cache.raw === raw) return cache.favorites;
  const favorites = parse(raw);
  cache = { raw, favorites };
  return favorites;
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Star (or unstar) a light on this device. */
export function setLightFavorite(entityId: string, favorite: boolean) {
  const current = loadLightFavorites();
  if (current.includes(entityId) === favorite) return;
  const next = favorite
    ? [...current, entityId]
    : current.filter((id) => id !== entityId);
  try {
    if (next.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  listeners.forEach((cb) => cb());
}

/** This device's favourite lights, in the order they were starred. */
export function useLightFavorites(): string[] {
  return useSyncExternalStore(subscribe, loadLightFavorites, () => EMPTY);
}
