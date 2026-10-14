/**
 * Where each card sits on /home, and how a rearranged layout is remembered.
 *
 * The page is a set of zones, each an ordered list of card ids. Portrait has a
 * full-width band above and below the two columns, so the clock can keep the
 * whole width; landscape is just two columns. Each orientation keeps its own
 * layout, because a card order that suits one rarely suits the other.
 *
 * Saved per device in localStorage — the frame and a phone in remote mode are
 * arranged independently. Nothing is written until someone actually moves a
 * card, so a device that never customises keeps following the defaults below.
 */

export const HOME_CARD_IDS = [
  "header",
  "teamTracker",
  "radar",
  "energy",
  "climate",
  "fan",
  "calendar",
  "printer",
  "vacuum",
  "statusStrip",
] as const;

export type HomeCardId = (typeof HOME_CARD_IDS)[number];
export type HomeOrientation = "portrait" | "landscape";
export type HomeZoneId = "top" | "left" | "right" | "bottom";
export type HomeLayout = Partial<Record<HomeZoneId, HomeCardId[]>>;

/** Shown while arranging — for a card that is hidden right now, the hint says when it appears. */
export const HOME_CARDS: Record<HomeCardId, { label: string; hiddenHint?: string }> = {
  header: { label: "Time & weather" },
  teamTracker: { label: "Football", hiddenHint: "Shows around game day" },
  radar: { label: "Rain radar", hiddenHint: "Shows while it's raining" },
  energy: { label: "Energy" },
  climate: { label: "Climate" },
  fan: { label: "Fans", hiddenHint: "Shows when fans are set up" },
  calendar: { label: "Calendar" },
  printer: { label: "3D printer", hiddenHint: "Shows while printing" },
  vacuum: { label: "Vacuum", hiddenHint: "Shows while cleaning" },
  statusStrip: { label: "Status chips", hiddenHint: "Shows idle printer and vacuum" },
};

export const HOME_ZONES: Record<HomeOrientation, HomeZoneId[]> = {
  portrait: ["top", "left", "right", "bottom"],
  landscape: ["left", "right"],
};

export const HOME_ZONE_LABELS: Record<HomeZoneId, string> = {
  top: "Full width",
  left: "Left column",
  right: "Right column",
  bottom: "Full width",
};

// The arrangement /home had before it could be rearranged.
const DEFAULTS: Record<HomeOrientation, HomeLayout> = {
  portrait: {
    top: ["header", "teamTracker"],
    left: ["climate"],
    right: ["radar", "energy", "calendar"],
    bottom: ["printer", "vacuum", "fan", "statusStrip"],
  },
  landscape: {
    left: ["header", "teamTracker", "radar", "energy", "printer", "vacuum"],
    right: ["climate", "fan", "calendar", "statusStrip"],
  },
};

const STORAGE_PREFIX = "home-layout:";
const isCardId = (v: unknown): v is HomeCardId =>
  typeof v === "string" && (HOME_CARD_IDS as readonly string[]).includes(v);

export function defaultHomeLayout(orientation: HomeOrientation): HomeLayout {
  return structuredClone(DEFAULTS[orientation]);
}

/**
 * Trusts nothing it reads back: unknown ids and duplicates are dropped, and any
 * card missing from the saved layout — one added in a later version, say — goes
 * back to its default zone rather than vanishing.
 */
function normalize(orientation: HomeOrientation, saved: unknown): HomeLayout {
  const zones = HOME_ZONES[orientation];
  const fallback = defaultHomeLayout(orientation);
  if (!saved || typeof saved !== "object") return fallback;

  const seen = new Set<HomeCardId>();
  const layout: HomeLayout = {};
  for (const zone of zones) {
    const ids = (saved as Record<string, unknown>)[zone];
    layout[zone] = (Array.isArray(ids) ? ids : []).filter((id): id is HomeCardId => {
      if (!isCardId(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
  for (const zone of zones) {
    for (const id of fallback[zone] ?? []) {
      if (!seen.has(id)) layout[zone]!.push(id);
    }
  }
  return layout;
}

export function loadHomeLayout(orientation: HomeOrientation): HomeLayout {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + orientation);
    if (raw) return normalize(orientation, JSON.parse(raw));
  } catch {
    // Unreadable or blocked storage — the defaults still render.
  }
  return defaultHomeLayout(orientation);
}

export function saveHomeLayout(orientation: HomeOrientation, layout: HomeLayout) {
  try {
    localStorage.setItem(STORAGE_PREFIX + orientation, JSON.stringify(layout));
  } catch {
    // ignore
  }
}

export function clearHomeLayout(orientation: HomeOrientation) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + orientation);
  } catch {
    // ignore
  }
}
