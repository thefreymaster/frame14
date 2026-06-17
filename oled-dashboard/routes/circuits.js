import { Router } from "express";
import { HA_TOKEN } from "../config.js";
import { ENTITIES } from "../entities.js";
import { getState } from "../ha-socket.js";

const router = Router();

const CIRCUITS = ENTITIES.circuits ?? { main: "", balance: "", items: [] };

// Read a numeric sensor value from the live ha-socket state cache.
function num(entityId) {
  if (!entityId) return null;
  const cached = getState(entityId);
  const val = parseFloat(cached?.state);
  return Number.isFinite(val) ? val : null;
}

// The Emporia Vue integration names each circuit's daily energy sensor by
// swapping the live-power suffix. Only surfaced when the cache has it.
function energyTodayId(powerId) {
  return powerId ? powerId.replace("_power_minute_average", "_energy_today") : "";
}

router.get("/", (_req, res) => {
  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return;
  }
  if (!CIRCUITS.items || CIRCUITS.items.length === 0) {
    res.status(503).json({ error: "Circuit entities not configured" });
    return;
  }

  const circuits = CIRCUITS.items
    .map((c) => ({
      name: c.name,
      watts: num(c.power),
      kwhToday: num(energyTodayId(c.power)),
    }))
    .sort((a, b) => (b.watts ?? 0) - (a.watts ?? 0));

  res.json({
    totalWatts: num(CIRCUITS.main),
    balanceWatts: num(CIRCUITS.balance),
    circuits,
  });
});

export default router;
