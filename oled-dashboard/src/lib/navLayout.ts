import { useMemo, useSyncExternalStore } from "react";
import { useDeviceMode, type DeviceMode } from "./deviceMode";
import {
  HOME_PATH,
  NAV_ITEM_BY_PATH,
  RENAMED_PATHS,
  SETTINGS_PATH,
  navItemsFor,
  type NavItem,
} from "./navItems";

// This device's nav: which entries it shows and in what order, set on
// /control. Kept per device mode in localStorage (`nav-layout:frame`,
// `nav-layout:controller`), as the two modes offer different entries, and
// written only once the user changes something, so an untouched device
// follows the defaults as they change.

export interface NavEntry {
  path: string;
  shown: boolean;
}

const storageKey = (mode: DeviceMode) => `nav-layout:${mode}`;

/**
 * Every entry for the mode, in NAV_ITEMS order, all shown but those a remote
 * keeps out until asked (`remoteOff`).
 */
export function defaultNavLayout(mode: DeviceMode): NavEntry[] {
  return navItemsFor(mode).map((i) => ({
    path: i.path,
    shown: mode === "frame" || !i.remoteOff,
  }));
}

/**
 * A saved layout made safe to use: entries this mode doesn't offer (or no
 * longer exist) dropped, a renamed entry kept in its place (two that became
 * one shown if either was), entries added since it was saved put at the end
 * (before Settings, if that ends it) as they default, Home first, and Home and
 * Settings shown.
 */
function normalize(mode: DeviceMode, saved: unknown): NavEntry[] {
  const defaults = defaultNavLayout(mode);
  if (!Array.isArray(saved)) return defaults;
  const offered = new Set(defaults.map((e) => e.path));
  const out: NavEntry[] = [];
  for (const e of saved as Partial<NavEntry>[]) {
    if (typeof e?.path !== "string") continue;
    const path = RENAMED_PATHS[e.path] ?? e.path;
    if (!offered.has(path)) continue;
    const shown = e.shown !== false;
    const had = out.find((o) => o.path === path);
    if (had) {
      had.shown ||= shown;
      continue;
    }
    out.push({ path, shown });
  }
  const added = defaults.filter((e) => !out.some((o) => o.path === e.path));
  const settingsLast = out.at(-1)?.path === SETTINGS_PATH;
  out.splice(settingsLast ? out.length - 1 : out.length, 0, ...added);
  return [
    { path: HOME_PATH, shown: true },
    ...out
      .filter((e) => e.path !== HOME_PATH)
      .map((e) => (e.path === SETTINGS_PATH ? { ...e, shown: true } : e)),
  ];
}

// The last layout read, so the store hands React the same array until the
// stored one changes.
let cache: { mode: DeviceMode; raw: string | null; layout: NavEntry[] } | null =
  null;

export function loadNavLayout(mode: DeviceMode): NavEntry[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey(mode));
  } catch {
    // ignore
  }
  if (cache && cache.mode === mode && cache.raw === raw) return cache.layout;
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    // ignore
  }
  const layout = normalize(mode, parsed);
  cache = { mode, raw, layout };
  return layout;
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function saveNavLayout(mode: DeviceMode, layout: NavEntry[]) {
  try {
    localStorage.setItem(
      storageKey(mode),
      JSON.stringify(normalize(mode, layout)),
    );
  } catch {
    // ignore
  }
  listeners.forEach((cb) => cb());
}

/** Back to the defaults (and to following them). */
export function resetNavLayout(mode: DeviceMode) {
  try {
    localStorage.removeItem(storageKey(mode));
  } catch {
    // ignore
  }
  listeners.forEach((cb) => cb());
}

export function sameNavLayout(a: NavEntry[], b: NavEntry[]): boolean {
  return (
    a.length === b.length &&
    a.every((e, i) => e.path === b[i].path && e.shown === b[i].shown)
  );
}

/** This device's layout (for its current mode), re-rendering when it changes. */
export function useNavLayout(): NavEntry[] {
  const mode = useDeviceMode();
  const get = () => loadNavLayout(mode);
  return useSyncExternalStore(subscribe, get, get);
}

/**
 * This device's nav: the entries it shows, in its order. Football only while
 * a game is on (`gameDay`).
 */
export function useNavItems(gameDay: boolean): NavItem[] {
  const layout = useNavLayout();
  return useMemo(() => shownNavItems(layout, gameDay), [layout, gameDay]);
}

export function shownNavItems(layout: NavEntry[], gameDay: boolean): NavItem[] {
  return layout
    .filter((e) => e.shown)
    .map((e) => NAV_ITEM_BY_PATH.get(e.path))
    .filter((i): i is NavItem => i != null && (gameDay || !i.gameDay));
}
