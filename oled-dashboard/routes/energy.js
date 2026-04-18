import { Router } from "express";
import { HA_URL, HA_TOKEN } from "../config.js";
import { ENTITIES } from "../entities.js";

const router = Router();

const PRODUCTION_ENTITY = ENTITIES.energy?.productionToday ?? "";
const CONSUMPTION_ENTITY = ENTITIES.energy?.consumptionToday ?? "";
const CURRENT_PRODUCTION_ENTITY = ENTITIES.energy?.currentProduction ?? "";
const CURRENT_CONSUMPTION_ENTITY = ENTITIES.energy?.currentConsumption ?? "";

async function fetchState(entity) {
  const response = await fetch(`${HA_URL}/api/states/${entity}`, {
    headers: {
      Authorization: `Bearer ${HA_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) throw new Error(`HA responded with ${response.status} for ${entity}`);
  return response.json();
}

router.get("/", async (_req, res) => {
  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return;
  }

  if (!PRODUCTION_ENTITY || !CONSUMPTION_ENTITY || !CURRENT_PRODUCTION_ENTITY || !CURRENT_CONSUMPTION_ENTITY) {
    res.status(503).json({ error: "Energy entities not configured" });
    return;
  }

  try {
    const [production, consumption, currentProduction, currentConsumption] = await Promise.all([
      fetchState(PRODUCTION_ENTITY),
      fetchState(CONSUMPTION_ENTITY),
      fetchState(CURRENT_PRODUCTION_ENTITY),
      fetchState(CURRENT_CONSUMPTION_ENTITY),
    ]);

    res.json({
      production: parseFloat(production.state),
      productionUnit: production.attributes?.unit_of_measurement ?? "kWh",
      consumption: parseFloat(consumption.state),
      consumptionUnit: consumption.attributes?.unit_of_measurement ?? "kWh",
      currentProduction: parseFloat(currentProduction.state),
      currentProductionUnit: currentProduction.attributes?.unit_of_measurement ?? "W",
      currentConsumption: parseFloat(currentConsumption.state),
      currentConsumptionUnit: currentConsumption.attributes?.unit_of_measurement ?? "W",
    });
  } catch (err) {
    console.error("Energy fetch error:", err);
    res.status(500).json({ error: "Failed to fetch energy data from HA" });
  }
});

export default router;
