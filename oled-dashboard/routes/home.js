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
  { id: "person.evan", name: "Evan" },
  { id: "person.elizabeth", name: "Elizabeth" },
];

const PRINTER_ENTITIES = [
  "sensor.a1_03919c442700723_print_status",
  "sensor.a1_03919c442700723_print_progress",
  "sensor.a1_03919c442700723_remaining_time",
  "sensor.a1_03919c442700723_task_name",
  "sensor.a1_finish_time",
];

const WEATHER_SENSORS = [
  "sensor.kbos_temperature",
  "sensor.kbos_relative_humidity",
  "sensor.kbos_barometric_pressure",
  "sensor.kbos_wind_speed",
  "sensor.kbos_wind_direction",
];

const PING_ENTITY = "binary_sensor.1_1_1_1";

const ENERGY_ENTITIES = [
  "sensor.envoy_482518016321_current_power_production",
  "sensor.envoy_482518016321_current_power_consumption",
  "sensor.envoy_482518016321_energy_production_today",
  "sensor.envoy_482518016321_energy_consumption_today",
];

const CALENDAR_EXCLUDE = new Set([
  "calendar.radarr",
]);

function sortEvents(events) {
  return events.sort((a, b) => {
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    return (a.start ?? "").localeCompare(b.start ?? "");
  });
}

async function fetchCalendarEvents() {
  try {
    // Discover all calendars
    const listRes = await fetch(`${HA_URL}/api/calendars`, {
      headers: {
        Authorization: `Bearer ${HA_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    if (!listRes.ok) return { today: [], tomorrow: [] };
    const calendars = await listRes.json();

    // Build today + tomorrow time ranges in local time
    const now = new Date();
    const pad2 = (n) => String(n).padStart(2, "0");
    const fmtDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

    const todayStr = fmtDate(now);
    const tmrw = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tmrwStr = fmtDate(tmrw);

    // Fetch events from each calendar (excluding filtered ones)
    const included = calendars.filter((cal) => !CALENDAR_EXCLUDE.has(cal.entity_id));

    async function fetchRange(start, end) {
      const results = await Promise.allSettled(
        included.map(async (cal) => {
          const res = await fetch(
            `${HA_URL}/api/calendars/${cal.entity_id}?start=${start}&end=${end}`,
            {
              headers: {
                Authorization: `Bearer ${HA_TOKEN}`,
                "Content-Type": "application/json",
              },
            },
          );
          if (!res.ok) return [];
          const events = await res.json();
          return events.map((e) => ({
            summary: e.summary ?? "",
            start: e.start?.dateTime ?? e.start?.date ?? null,
            end: e.end?.dateTime ?? e.end?.date ?? null,
            allDay: !!e.start?.date,
            calendar: cal.name ?? cal.entity_id,
          }));
        }),
      );
      return sortEvents(
        results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value),
      );
    }

    const [today, tomorrow] = await Promise.all([
      fetchRange(`${todayStr}T00:00:00`, `${todayStr}T23:59:59`),
      fetchRange(`${tmrwStr}T00:00:00`, `${tmrwStr}T23:59:59`),
    ]);

    return { today, tomorrow };
  } catch (err) {
    console.error("Calendar fetch error:", err);
    return { today: [], tomorrow: [] };
  }
}

export async function fetchHomeData() {
  const allEntityIds = [
    "weather.kbos",
    ...WEATHER_SENSORS,
    ...CLIMATE_ENTITIES.map((e) => e.id),
    ...PERSON_ENTITIES.map((e) => e.id),
    ...PRINTER_ENTITIES,
    ...ENERGY_ENTITIES,
    PING_ENTITY,
  ];

  const [results, calendar] = await Promise.all([
    Promise.allSettled(allEntityIds.map(fetchState)),
    fetchCalendarEvents(),
  ]);

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
        temperature: parseFloat(byId["sensor.kbos_temperature"]?.state) || (wx.attributes?.temperature ?? null),
        humidity: parseFloat(byId["sensor.kbos_relative_humidity"]?.state) || (wx.attributes?.humidity ?? null),
        windSpeed: parseFloat(byId["sensor.kbos_wind_speed"]?.state) || null,
        windDirection: parseFloat(byId["sensor.kbos_wind_direction"]?.state) || null,
        pressure: parseFloat(byId["sensor.kbos_barometric_pressure"]?.state) || null,
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
      parseFloat(byId["sensor.a1_03919c442700723_print_progress"]?.state) ||
      0,
    remainingTime:
      parseFloat(byId["sensor.a1_03919c442700723_remaining_time"]?.state) ||
      0,
    taskName: byId["sensor.a1_03919c442700723_task_name"]?.state ?? null,
    finishTime: byId["sensor.a1_finish_time"]?.state ?? null,
  };

  // Energy
  const energy = {
    currentProduction:
      parseFloat(
        byId["sensor.envoy_482518016321_current_power_production"]?.state,
      ) || 0,
    currentConsumption:
      parseFloat(
        byId["sensor.envoy_482518016321_current_power_consumption"]?.state,
      ) || 0,
    productionToday:
      parseFloat(
        byId["sensor.envoy_482518016321_energy_production_today"]?.state,
      ) || 0,
    consumptionToday:
      parseFloat(
        byId["sensor.envoy_482518016321_energy_consumption_today"]?.state,
      ) || 0,
  };

  // Internet
  const pingState = byId[PING_ENTITY]?.state;
  const internet = { connected: pingState === "on" };

  return { weather, climate, people, printer, energy, calendar, internet };
}

router.get("/", async (_req, res) => {
  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return;
  }

  try {
    const data = await fetchHomeData();
    res.json(data);
  } catch (err) {
    console.error("Home fetch error:", err);
    res.status(500).json({ error: "Failed to fetch home data" });
  }
});

export default router;
