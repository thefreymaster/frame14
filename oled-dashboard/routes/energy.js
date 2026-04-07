import { Router } from "express";
import { HA_URL, HA_TOKEN } from "../config.js";

const router = Router();

const PRODUCTION_ENTITY = "sensor.envoy_482518016321_energy_production_today";
const CONSUMPTION_ENTITY = "sensor.envoy_482518016321_energy_consumption_today";

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

  try {
    const [production, consumption] = await Promise.all([
      fetchState(PRODUCTION_ENTITY),
      fetchState(CONSUMPTION_ENTITY),
    ]);

    res.json({
      production: parseFloat(production.state),
      productionUnit: production.attributes?.unit_of_measurement ?? "kWh",
      consumption: parseFloat(consumption.state),
      consumptionUnit: consumption.attributes?.unit_of_measurement ?? "kWh",
    });
  } catch (err) {
    console.error("Energy fetch error:", err);
    res.status(500).json({ error: "Failed to fetch energy data from HA" });
  }
});

export default router;
