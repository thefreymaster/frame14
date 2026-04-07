import { Router } from "express";
import { HA_URL, HA_TOKEN } from "../config.js";

const router = Router();

async function fetchState(entity) {
  const response = await fetch(`${HA_URL}/api/states/${entity}`, {
    headers: {
      Authorization: `Bearer ${HA_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) throw new Error(`HA ${response.status} for ${entity}`);
  return response.json();
}

const CLIMATE_ENTITIES = [
  { id: "climate.1st_floor_ac", name: "1st Floor" },
  { id: "climate.2nd_floor_ac", name: "2nd Floor" },
  { id: "climate.3rd_floor_ac", name: "3rd Floor" },
  { id: "climate.guest_room_ac", name: "Guest" },
];

const PERSON_ENTITIES = [
  { id: "sensor.evan", name: "Evan" },
  { id: "sensor.elizabeth", name: "Elizabeth" },
];

const PRINTER_ENTITIES = [
  "sensor.a1_03919c442700723_print_status",
  "sensor.a1_03919c442700723_print_progress",
  "sensor.a1_03919c442700723_remaining_time",
  "sensor.a1_03919c442700723_task_name",
  "sensor.a1_finish_time",
];

const ENERGY_ENTITIES = [
  "sensor.envoy_482518016321_current_power_production",
  "sensor.envoy_482518016321_current_power_consumption",
  "sensor.envoy_482518016321_energy_production_today",
  "sensor.envoy_482518016321_energy_consumption_today",
];

router.get("/", async (_req, res) => {
  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return;
  }

  try {
    const allEntityIds = [
      "weather.kbos",
      ...CLIMATE_ENTITIES.map((e) => e.id),
      ...PERSON_ENTITIES.map((e) => e.id),
      ...PRINTER_ENTITIES,
      ...ENERGY_ENTITIES,
    ];

    const results = await Promise.allSettled(allEntityIds.map(fetchState));

    const byId = {};
    allEntityIds.forEach((id, i) => {
      if (results[i].status === "fulfilled") {
        byId[id] = results[i].value;
      }
    });

    // Weather
    const wx = byId["weather.kbos"];
    const weather = wx
      ? {
          state: wx.state,
          temperature: wx.attributes?.temperature ?? null,
          humidity: wx.attributes?.humidity ?? null,
        }
      : null;

    // Climate
    const climate = CLIMATE_ENTITIES.map(({ id, name }) => {
      const d = byId[id];
      return {
        name,
        state: d?.state ?? "unknown",
        currentTemp: d?.attributes?.current_temperature ?? null,
        targetTemp: d?.attributes?.temperature ?? null,
        hvacMode: d?.attributes?.hvac_mode ?? d?.state ?? null,
      };
    });

    // People
    const people = PERSON_ENTITIES.map(({ id, name }) => ({
      name,
      state: byId[id]?.state ?? "unknown",
    }));

    // Printer
    const printerStatus =
      byId["sensor.a1_03919c442700723_print_status"]?.state ?? "unknown";
    const printer = {
      status: printerStatus,
      progress:
        parseFloat(
          byId["sensor.a1_03919c442700723_print_progress"]?.state
        ) || 0,
      remainingTime:
        parseFloat(
          byId["sensor.a1_03919c442700723_remaining_time"]?.state
        ) || 0,
      taskName:
        byId["sensor.a1_03919c442700723_task_name"]?.state ?? null,
      finishTime: byId["sensor.a1_finish_time"]?.state ?? null,
    };

    // Energy
    const energy = {
      currentProduction:
        parseFloat(
          byId["sensor.envoy_482518016321_current_power_production"]?.state
        ) || 0,
      currentConsumption:
        parseFloat(
          byId["sensor.envoy_482518016321_current_power_consumption"]?.state
        ) || 0,
      productionToday:
        parseFloat(
          byId["sensor.envoy_482518016321_energy_production_today"]?.state
        ) || 0,
      consumptionToday:
        parseFloat(
          byId["sensor.envoy_482518016321_energy_consumption_today"]?.state
        ) || 0,
    };

    res.json({ weather, climate, people, printer, energy });
  } catch (err) {
    console.error("Home fetch error:", err);
    res.status(500).json({ error: "Failed to fetch home data" });
  }
});

export default router;
