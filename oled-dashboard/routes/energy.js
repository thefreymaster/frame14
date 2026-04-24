import { Router } from "express";
import { HA_URL, HA_TOKEN } from "../config.js";
import { ENTITIES } from "../entities.js";
import { sendCommand } from "../ha-socket.js";

const router = Router();

const PRODUCTION_ENTITY = ENTITIES.energy?.productionToday ?? "";
const CONSUMPTION_ENTITY = ENTITIES.energy?.consumptionToday ?? "";
const CURRENT_PRODUCTION_ENTITY = ENTITIES.energy?.currentProduction ?? "";
const CURRENT_CONSUMPTION_ENTITY = ENTITIES.energy?.currentConsumption ?? "";

function round2(n) {
  return Math.round(n * 100) / 100;
}

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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

router.get("/monthly", async (req, res) => {
  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return;
  }
  if (!PRODUCTION_ENTITY || !CONSUMPTION_ENTITY) {
    res.status(503).json({ error: "Energy entities not configured" });
    return;
  }

  let year, month;
  if (req.query.month) {
    const parts = req.query.month.split("-");
    if (parts.length !== 2 || parts.some((p) => isNaN(parseInt(p, 10)))) {
      res.status(400).json({ error: "month param must be YYYY-MM" });
      return;
    }
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth();
  }

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
  const lastDay = isCurrentMonth ? now.getDate() : new Date(year, month + 1, 0).getDate();

  const fetchStart = new Date(year, month, 1, 0, 0, 0);
  const fetchEnd = isCurrentMonth ? now : new Date(year, month + 1, 0, 23, 59, 59);

  try {
    // Long-term statistics via WebSocket — survives the 10-day history purge.
    // "state" type = last sensor value during each day period.
    // For "production_today" sensors that reset at midnight, last value = daily total.
    const stats = await sendCommand("recorder/statistics_during_period", {
      start_time: fetchStart.toISOString(),
      end_time: fetchEnd.toISOString(),
      statistic_ids: [PRODUCTION_ENTITY, CONSUMPTION_ENTITY],
      period: "day",
      types: ["state"],
    });

    function buildMap(arr) {
      const map = {};
      for (const s of arr ?? []) {
        if (s.state == null) continue;
        map[localDateStr(new Date(s.start))] = s.state;
      }
      return map;
    }

    const prodByDay = buildMap(stats[PRODUCTION_ENTITY]);
    const consByDay = buildMap(stats[CONSUMPTION_ENTITY]);

    const production = [];
    const consumption = [];
    const runningProduction = [];
    const runningConsumption = [];
    let runProd = 0;
    let runCons = 0;

    for (let d = 1; d <= lastDay; d++) {
      const x = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const prod = prodByDay[x] != null ? round2(prodByDay[x]) : null;
      const cons = consByDay[x] != null ? round2(consByDay[x]) : null;

      if (prod != null) runProd = round2(runProd + prod);
      if (cons != null) runCons = round2(runCons + cons);

      production.push({ x, y: prod });
      consumption.push({ x, y: cons });
      runningProduction.push({ x, y: runProd });
      runningConsumption.push({ x, y: runCons });
    }

    res.json([
      { id: "production", data: production },
      { id: "consumption", data: consumption },
      { id: "runningProduction", data: runningProduction },
      { id: "runningConsumption", data: runningConsumption },
    ]);
  } catch (err) {
    console.error("Monthly energy fetch error:", err);
    res.status(500).json({ error: "Failed to fetch monthly energy data from HA" });
  }
});

export default router;
