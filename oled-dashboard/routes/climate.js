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

  const ids = ENTITIES.climate ?? [];
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
        currentTemp: s.attributes?.current_temperature ?? null,
        targetTemp: s.attributes?.temperature ?? null,
        hvacMode: s.attributes?.hvac_mode ?? s.state ?? null,
      })),
    );
  } catch (err) {
    console.error("Climate fetch error:", err);
    res.status(500).json({ error: "Failed to fetch climate data from HA" });
  }
});

export default router;
