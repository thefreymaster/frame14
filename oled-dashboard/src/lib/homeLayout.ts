/**
 * Where each card sits on /home, how wide it is, and how a rearranged layout is
 * remembered.
 *
 * The page is one grid of equal columns, and the layout is an ordered list of
 * cards, each spanning some of them. How many columns depends on the screen
 * (see `homeColumnsFor`): four on a desktop or a landscape tablet, two on the
 * Frame14 in portrait, one on a phone. The four- and two-column grids keep
 * their own layouts, because widths that suit one rarely suit the other; a
 * phone shows the two-column order with every card full width.
 *
 * Saved per device in localStorage — the frame and a phone in remote mode are
 * arranged independently. Nothing is written until someone actually moves or
 * resizes a card, so a device that never customises keeps following the
 * defaults below.
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
export type HomeColumns = 1 | 2 | 4;
/** The grids that keep a layout of their own; a one-column phone reads the two-column one. */
export type HomeGrid = 2 | 4;
export type HomeCardPlacement = { id: HomeCardId; span: number };
export type HomeLayout = HomeCardPlacement[];

/** Shown while arranging — for a card that is hidden right now, the hint says when it appears. */
export const HOME_CARDS: Record<
  HomeCardId,
  { label: string; hiddenHint?: string }
> = {
  header: { label: "Time & weather" },
  teamTracker: { label: "Football", hiddenHint: "Shows around game day" },
  radar: { label: "Rain radar", hiddenHint: "Shows while it's raining" },
  energy: { label: "Energy" },
  climate: { label: "Climate" },
  fan: { label: "Fans", hiddenHint: "Shows when fans are set up" },
  calendar: { label: "Calendar" },
  printer: { label: "3D printer", hiddenHint: "Shows while printing" },
  vacuum: { label: "Vacuum", hiddenHint: "Shows while cleaning" },
  statusStrip: {
    label: "Status chips",
    hiddenHint: "Shows idle printer and vacuum",
  },
};

/** Phones (below Chakra's md) get one column. */
export const HOME_ONE_COLUMN_QUERY = "(max-width: 767.98px)";
/** Desktops and landscape tablets (Chakra's lg and up, held sideways) get four. */
export const HOME_FOUR_COLUMN_QUERY =
  "(orientation: landscape) and (min-width: 1024px)";

/**
 * "Desktop" as a css-prop key: the four-column screens. Cards sit `md` apart
 * here and `xs` apart everywhere else (phones, the frame in portrait).
 */
export const DESKTOP_MEDIA = `@media ${HOME_FOUR_COLUMN_QUERY}`;

/** Columns for the current screen; everything else — the frame in portrait, a phone on its side — gets two. */
export function homeColumnsFor(
  oneColumn: boolean,
  fourColumns: boolean,
): HomeColumns {
  if (oneColumn) return 1;
  return fourColumns ? 4 : 2;
}

export function homeGridFor(columns: HomeColumns): HomeGrid {
  return columns === 4 ? 4 : 2;
}

/** Widths a card can take on a grid, as fractions of the row. */
export const HOME_WIDTHS: Record<HomeGrid, { span: number; label: string }[]> =
  {
    2: [
      { span: 1, label: "½" },
      { span: 2, label: "Full" },
    ],
    4: [
      { span: 1, label: "¼" },
      { span: 2, label: "½" },
      { span: 3, label: "¾" },
      { span: 4, label: "Full" },
    ],
  };

// The arrangement /home had before cards could change width: in portrait the
// clock, the game and the active-only cards across the top and bottom, climate
// beside a rail of energy and calendar; in landscape two equal columns.
const DEFAULTS: Record<HomeGrid, HomeLayout> = {
  2: [
    { id: "header", span: 2 },
    { id: "teamTracker", span: 2 },
    { id: "climate", span: 1 },
    { id: "radar", span: 1 },
    { id: "energy", span: 1 },
    { id: "calendar", span: 1 },
    { id: "printer", span: 2 },
    { id: "vacuum", span: 2 },
    { id: "fan", span: 2 },
    { id: "statusStrip", span: 2 },
  ],
  4: [
    { id: "header", span: 2 },
    { id: "climate", span: 2 },
    { id: "teamTracker", span: 2 },
    { id: "fan", span: 2 },
    { id: "radar", span: 2 },
    { id: "calendar", span: 2 },
    { id: "energy", span: 2 },
    { id: "statusStrip", span: 2 },
    { id: "printer", span: 2 },
    { id: "vacuum", span: 2 },
  ],
};

const STORAGE_PREFIX = "home-layout:";
const storageKey = (grid: HomeGrid) => `${STORAGE_PREFIX}${grid}col`;
// Layouts saved before widths, as zones of card ids per orientation.
const LEGACY_KEY: Record<HomeGrid, string> = {
  2: `${STORAGE_PREFIX}portrait`,
  4: `${STORAGE_PREFIX}landscape`,
};

const isCardId = (v: unknown): v is HomeCardId =>
  typeof v === "string" && (HOME_CARD_IDS as readonly string[]).includes(v);

export function defaultHomeLayout(grid: HomeGrid): HomeLayout {
  return structuredClone(DEFAULTS[grid]);
}

/**
 * Trusts nothing it reads back: unknown ids and duplicates are dropped, a width
 * is clamped to the grid, and any card missing from the saved layout — one
 * added in a later version, say — is appended at its default width rather than
 * vanishing.
 */
function normalize(grid: HomeGrid, saved: unknown): HomeLayout {
  const fallback = defaultHomeLayout(grid);
  if (!Array.isArray(saved)) return fallback;

  const seen = new Set<HomeCardId>();
  const layout: HomeLayout = [];
  for (const entry of saved) {
    const id = (entry as { id?: unknown } | null)?.id;
    if (!isCardId(id) || seen.has(id)) continue;
    seen.add(id);
    const span = Math.round(Number((entry as { span?: unknown }).span));
    layout.push({
      id,
      span: Number.isFinite(span) ? Math.min(Math.max(span, 1), grid) : 1,
    });
  }
  for (const card of fallback) {
    if (!seen.has(card.id)) layout.push(card);
  }
  return layout;
}

/**
 * A layout saved before widths existed was zones per orientation. Keep its
 * order: bands become full-width cards, and the two columns become half-width
 * cards taken alternately, left then right. The grid packs them by height, so
 * a card can end up on the other side from its old column; the order and the
 * widths are what carry over.
 */
function fromZones(grid: HomeGrid, zones: unknown): HomeLayout | null {
  if (!zones || typeof zones !== "object") return null;
  const z = zones as Record<string, unknown>;
  const ids = (name: string) =>
    Array.isArray(z[name]) ? (z[name] as unknown[]) : [];
  const half = grid / 2;
  const layout: { id: unknown; span: number }[] = [];
  for (const id of ids("top")) layout.push({ id, span: grid });
  const left = ids("left");
  const right = ids("right");
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    if (i < left.length) layout.push({ id: left[i], span: half });
    if (i < right.length) layout.push({ id: right[i], span: half });
  }
  for (const id of ids("bottom")) layout.push({ id, span: grid });
  return normalize(grid, layout);
}

export function loadHomeLayout(grid: HomeGrid): HomeLayout {
  try {
    const raw = localStorage.getItem(storageKey(grid));
    if (raw) return normalize(grid, JSON.parse(raw));
    const legacy = localStorage.getItem(LEGACY_KEY[grid]);
    if (legacy)
      return fromZones(grid, JSON.parse(legacy)) ?? defaultHomeLayout(grid);
  } catch {
    // Unreadable or blocked storage — the defaults still render.
  }
  return defaultHomeLayout(grid);
}

export function saveHomeLayout(grid: HomeGrid, layout: HomeLayout) {
  try {
    localStorage.setItem(storageKey(grid), JSON.stringify(layout));
  } catch {
    // ignore
  }
}

export function clearHomeLayout(grid: HomeGrid) {
  try {
    localStorage.removeItem(storageKey(grid));
    localStorage.removeItem(LEGACY_KEY[grid]);
  } catch {
    // ignore
  }
}
