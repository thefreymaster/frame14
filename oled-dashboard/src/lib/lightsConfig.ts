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
  md: "repeat(3, minmax(0, 1fr))",
  _landscape: "repeat(4, minmax(0, 1fr))",
};

function entityName(entityId: string): string {
  const slug = entityId.split(".")[1] ?? entityId;
  return slug
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function domainIcons(entityId: string): Pick<LightEntry, "Icon" | "ActiveIcon"> {
  const domain = entityId.split(".")[0];
  if (domain === "switch") return { Icon: MdOutlet, ActiveIcon: MdOutlet };
  return { Icon: MdOutlineLightbulb, ActiveIcon: MdLightbulb };
}

export function buildLightSections(entityIds: string[]): LightSection[] {
  const lights: LightEntry[] = [];
  const switches: LightEntry[] = [];

  for (const id of entityIds) {
    const entry: LightEntry = { entity_id: id, name: entityName(id), ...domainIcons(id) };
    if (id.startsWith("switch.")) {
      switches.push(entry);
    } else {
      lights.push(entry);
    }
  }

  const sections: LightSection[] = [];
  if (lights.length > 0) sections.push({ title: "Lights", entries: lights });
  if (switches.length > 0) sections.push({ title: "Switches", entries: switches });
  return sections;
}
