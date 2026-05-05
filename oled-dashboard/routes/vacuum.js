import { Router } from "express";
import { HA_URL, HA_TOKEN } from "../config.js";
import { ENTITIES } from "../entities.js";

const router = Router();

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
      })),
    );
  } catch (err) {
    console.error("Vacuum fetch error:", err);
    res.status(500).json({ error: "Failed to fetch vacuum data from HA" });
  }
});

export default router;
