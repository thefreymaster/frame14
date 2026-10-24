import { Router } from "express";
import { HA_URL, HA_TOKEN } from "../config.js";
import { ENTITIES } from "../entities.js";
import { getAllStates } from "../ha-socket.js";
import { sendHaImage } from "../ha-proxy.js";

const router = Router();

const titleCase = (s) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * A vacuum's maps: the image entities its integration names after it (the
 * core Roborock integration: image.<vacuum>_<map name>), from the state cache,
 * each named from the rest of its ID ("first_floor" → "First Floor").
 */
function mapsFor(vacuumId) {
  const prefix = `image.${vacuumId.split(".")[1]}_`;
  return [...getAllStates().keys()]
    .filter((id) => id.startsWith(prefix))
    .sort()
    .map((id) => ({ entity_id: id, name: titleCase(id.slice(prefix.length)) }));
}

async function fetchState(entityId) {
  const res = await fetch(`${HA_URL}/api/states/${entityId}`, {
    headers: {
      Authorization: `Bearer ${HA_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`HA responded with ${res.status} for ${entityId}`);
  return res.json();
}

router.get("/", async (_req, res) => {
  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return;
  }

  const ids = ENTITIES.vacuums ?? [];
  if (ids.length === 0) {
    res.json([]);
    return;
  }

  try {
    const states = await Promise.all(ids.map(fetchState));
    res.json(
      states.map((s) => ({
        entity_id: s.entity_id,
        name: s.attributes?.friendly_name ?? s.entity_id,
        state: s.state,
        progress: s.attributes?.cleaning_progress ?? null,
        battery: s.attributes?.battery_level ?? null,
        maps: mapsFor(s.entity_id),
      })),
    );
  } catch (err) {
    console.error("Vacuum fetch error:", err);
    res.status(500).json({ error: "Failed to fetch vacuum data from HA" });
  }
});

/**
 * One of a configured vacuum's maps (see mapsFor). The ID must be one of
 * theirs, so the token can't be pointed at any other image in HA.
 */
router.get("/map/:entityId", (req, res) => {
  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return;
  }
  const { entityId } = req.params;
  const known = (ENTITIES.vacuums ?? []).some((v) =>
    mapsFor(v).some((m) => m.entity_id === entityId),
  );
  if (!known) {
    res.status(404).json({ error: "Not a configured vacuum's map" });
    return;
  }
  void sendHaImage(res, entityId, "vacuum");
});

export default router;
