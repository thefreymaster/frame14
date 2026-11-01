import type { IconType } from "react-icons";
import { MdLightbulb, MdOutlineLightbulb, MdOutlet } from "react-icons/md";

export type LightEntry = {
  entity_id: string;
  name: string;
  Icon: IconType;
  /** The icon while on (a lit bulb); the same as Icon for a switch. */
  ActiveIcon: IconType;
};

export type LightSection = {
  title: string;
  entries: LightEntry[];
};

/** The tiles' columns (LightsSection, and LightsSkeleton standing in for it):
 *  two across on a phone, three on the frame and tablets, four in landscape. */
export const LIGHT_TILE_COLUMNS = {
  base: "repeat(2, minmax(0, 1fr))",
  // Two across on the frame and tablets too since 0.139 (three before): a
  // tile is a row — the bulb beside the name — and a third of a room card
  // broke "Backyard" in two.
  md: "repeat(2, minmax(0, 1fr))",
  _landscape: "repeat(4, minmax(0, 1fr))",
};

/** The tiles' columns where the group is a third of the screen (/lights on a
 *  desktop, 0.123): as many 8rem-or-wider tiles as the group's own width
 *  holds, sharing it — three in a 1920px window, two in a 1280px one —
 *  rather than the viewport's four, which cut the names short there. */
export const LIGHT_TILE_COLUMNS_FLUID = "repeat(auto-fill, minmax(8rem, 1fr))";

/**
 * A light's name as the tile shows it (0.139, the user: "drop the word lights
 * from any room that has it"): "Kitchen Cabinet Lights" is "Kitchen Cabinet",
 * "Kid's Hatch Light" "Kid's Hatch" — the word is the page's; a name that is
 * only that word keeps it.
 */
export function displayLightName(name: string): string {
  const trimmed = name
    .replace(/\s*\blights?\b\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return trimmed || name;
}

function entityName(entityId: string): string {
  const slug = entityId.split(".")[1] ?? entityId;
  return slug
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function domainIcons(
  entityId: string,
): Pick<LightEntry, "Icon" | "ActiveIcon"> {
  const domain = entityId.split(".")[0];
  if (domain === "switch") return { Icon: MdOutlet, ActiveIcon: MdOutlet };
  return { Icon: MdOutlineLightbulb, ActiveIcon: MdLightbulb };
}

/** A room as GET /api/entities gives it (useEntitiesConfig's LightRoom). */
export type LightRoomLike = { id: string; name: string; lights: string[] };

/**
 * The page's groups: a section per room (0.122: Home Assistant's areas, in
 * the server's order, each holding the configured lights and switches in
 * it), then the lights in no room ("Lights" when there are no rooms — the
 * page's one untitled group, as before — else "Other lights") and the
 * switches in no room ("Switches").
 */
export function buildLightSections(
  entityIds: string[],
  rooms: LightRoomLike[] = [],
): LightSection[] {
  const entry = (id: string): LightEntry => ({
    entity_id: id,
    name: entityName(id),
    ...domainIcons(id),
  });
  const ids = new Set(entityIds);
  const placed = new Set<string>();
  const sections: LightSection[] = [];

  for (const room of rooms) {
    const entries = room.lights
      .filter((id) => ids.has(id) && !placed.has(id))
      .map(entry);
    if (entries.length === 0) continue;
    for (const e of entries) placed.add(e.entity_id);
    sections.push({ title: room.name, entries });
  }

  const lights: LightEntry[] = [];
  const switches: LightEntry[] = [];
  for (const id of entityIds) {
    if (placed.has(id)) continue;
    (id.startsWith("switch.") ? switches : lights).push(entry(id));
  }
  if (lights.length > 0) {
    sections.push({
      title: sections.length > 0 ? "Other lights" : "Lights",
      entries: lights,
    });
  }
  if (switches.length > 0)
    sections.push({ title: "Switches", entries: switches });
  return sections;
}

/**
 * The sections with their entries in alphabetical order of `labelOf` — the
 * name each tile shows (Home Assistant's friendly name once known) — ignoring
 * case, with numbers in order ("Lamp 2" before "Lamp 10"). Since 0.101.
 */
export function sortLightSections(
  sections: LightSection[],
  labelOf: (entry: LightEntry) => string,
): LightSection[] {
  const collator = new Intl.Collator(undefined, {
    sensitivity: "base",
    numeric: true,
  });
  return sections.map((section) => ({
    ...section,
    entries: [...section.entries].sort((a, b) =>
      collator.compare(labelOf(a), labelOf(b)),
    ),
  }));
}
