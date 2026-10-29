// The lights by room (0.122). Home Assistant keeps rooms as areas, and which
// area an entity is in lives in its registries, not its state: the entity
// registry gives an entity its own area or its device, and the device registry
// the device's area. Once the socket is primed (index.js wires startHaSocket's
// `onPrimed` here) the three registries are read over it, and:
//   - every `light.*` in a configured area (`light_areas`: an area's id or its
//     name, case and punctuation aside) joins the lights after the explicit
//     `light_entities` — unless the registry disables or hides it, or it is a
//     config / diagnostic entity (a smart plug's indicator LED);
//   - every light and switch, explicit or found, is put in its room, for
//     /lights to group them: `rooms` in GET /api/entities, the configured
//     areas first in their configured order, then any other area an explicit
//     entity is in, by name. One in no area stays in `lights` and no room.
// HA pushes a registry change as an event; the socket hands it to
// scheduleLightAreasRefresh, which re-reads a second later, and either way a
// changed answer goes to every page over io ("entities"), which takes it as
// its /api/entities answer. Until HA answers, or when it can't (an old core,
// a token that may not read the registries), it is the explicit list and no
// rooms, as before 0.122.
import { ENTITIES } from "./entities.js";
import { isHaConnected, sendCommand } from "./ha-socket.js";

let resolved = { lights: [...ENTITIES.lights], rooms: [] };

/** The lights and rooms as last resolved (GET /api/entities' `lights` / `rooms`). */
export function lightsConfig() {
  return resolved;
}

/** What GET /api/entities answers, and what io "entities" carries. */
export function entitiesPayload() {
  return { ...ENTITIES, lights: resolved.lights, rooms: resolved.rooms };
}

// "Living Room", "living room" and "living_room" all name the same area.
const norm = (s) =>
  String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

function resolve(areas, devices, entities) {
  const areaById = new Map(
    areas.map((a) => [a.area_id, { id: a.area_id, name: a.name }]),
  );
  // The configured areas, as area ids, in their configured order.
  const wanted = [];
  for (const entry of ENTITIES.lightAreas) {
    const key = norm(entry);
    const area =
      areas.find((a) => a.area_id === entry) ??
      areas.find((a) => norm(a.area_id) === key || norm(a.name) === key);
    if (!area) {
      console.warn(`[ha-areas] no area "${entry}" in Home Assistant`);
      continue;
    }
    if (!wanted.includes(area.area_id)) wanted.push(area.area_id);
  }

  const deviceArea = new Map(devices.map((d) => [d.id, d.area_id ?? null]));
  const areaOf = new Map(); // entity_id -> area_id
  const found = [];
  for (const e of entities) {
    const areaId =
      e.area_id ?? (e.device_id ? deviceArea.get(e.device_id) : null) ?? null;
    if (areaId) areaOf.set(e.entity_id, areaId);
    if (!e.entity_id.startsWith("light.")) continue;
    if (!areaId || !wanted.includes(areaId)) continue;
    if (e.disabled_by || e.hidden_by || e.entity_category) continue;
    found.push(e.entity_id);
  }
  found.sort();

  const lights = [...ENTITIES.lights];
  for (const id of found) if (!lights.includes(id)) lights.push(id);

  const rooms = new Map(
    wanted.map((id) => [id, { ...areaById.get(id), lights: [] }]),
  );
  for (const id of lights) {
    const areaId = areaOf.get(id);
    if (!areaId || !areaById.has(areaId)) continue;
    if (!rooms.has(areaId))
      rooms.set(areaId, { ...areaById.get(areaId), lights: [] });
    rooms.get(areaId).lights.push(id);
  }
  const collator = new Intl.Collator(undefined, {
    sensitivity: "base",
    numeric: true,
  });
  const rank = (room) => {
    const i = wanted.indexOf(room.id);
    return i === -1 ? wanted.length : i;
  };
  const ordered = [...rooms.values()]
    .filter((room) => room.lights.length > 0)
    .sort((a, b) => rank(a) - rank(b) || collator.compare(a.name, b.name));
  return { lights, rooms: ordered };
}

let refreshing = null;
let timer = null;

/**
 * Read HA's registries and resolve the lights and rooms; a changed answer is
 * sent to every page. One read at a time; nothing without the socket.
 */
export function refreshLightAreas(io) {
  if (!isHaConnected()) return Promise.resolve();
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const [areas, devices, entities] = await Promise.all([
        sendCommand("config/area_registry/list", {}),
        sendCommand("config/device_registry/list", {}),
        sendCommand("config/entity_registry/list", {}),
      ]);
      if (![areas, devices, entities].every(Array.isArray))
        throw new Error("the registries didn't come back as lists");
      const next = resolve(areas, devices, entities);
      const changed = JSON.stringify(next) !== JSON.stringify(resolved);
      resolved = next;
      console.log(
        `[ha-areas] ${next.lights.length} lights and switches in ${next.rooms.length} rooms (${ENTITIES.lightAreas.length} areas configured)`,
      );
      if (changed) io.emit("entities", entitiesPayload());
    } catch (e) {
      console.warn("[ha-areas] couldn't read the registries:", e.message);
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** A registry changed: re-read once it has settled (a rename touches several). */
export function scheduleLightAreasRefresh(io, delayMs = 1000) {
  clearTimeout(timer);
  timer = setTimeout(() => void refreshLightAreas(io), delayMs);
}
