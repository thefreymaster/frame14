import { Router } from "express";
import { HA_URL, HA_TOKEN } from "../config.js";
import { ENTITIES } from "../entities.js";

const router = Router();

const CALENDAR_EXCLUDE = new Set(["calendar.radarr"]);

function sortEvents(events) {
  return events.sort((a, b) => {
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    return (a.start ?? "").localeCompare(b.start ?? "");
  });
}

async function fetchCalendarEvents() {
  const listRes = await fetch(`${HA_URL}/api/calendars`, {
    headers: {
      Authorization: `Bearer ${HA_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  if (!listRes.ok) return { today: [], tomorrow: [] };
  const calendars = await listRes.json();

  const now = new Date();
  const pad2 = (n) => String(n).padStart(2, "0");
  const fmtDate = (d) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const todayStr = fmtDate(now);
  const tmrw = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tmrwStr = fmtDate(tmrw);

  const included = calendars.filter(
    (cal) => !CALENDAR_EXCLUDE.has(cal.entity_id),
  );

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
}

const WEATHER_HEADERS = (token) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

const mapForecast = (f) => ({
  datetime: f.datetime,
  temperature: f.temperature,
  templow: f.templow,
  condition: f.condition,
  precipitation: f.precipitation,
  precipitationProbability: f.precipitation_probability,
  windSpeed: f.wind_speed,
  windBearing: f.wind_bearing,
});

router.get("/weather", async (_req, res) => {
  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return;
  }
  try {
    const weatherCurrent = ENTITIES.weather?.current ?? "";
    const weatherForecast = ENTITIES.weather?.forecast ?? weatherCurrent;
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`${HA_URL}/api/states/${weatherCurrent}`, {
        headers: WEATHER_HEADERS(HA_TOKEN),
      }),
      fetch(
        `${HA_URL}/api/services/weather/get_forecasts?return_response`,
        {
          method: "POST",
          headers: WEATHER_HEADERS(HA_TOKEN),
          body: JSON.stringify({
            entity_id: weatherForecast,
            type: "hourly",
          }),
        },
      ),
    ]);
    if (!currentRes.ok || !forecastRes.ok) {
      res.status(502).json({ error: "HA weather fetch failed" });
      return;
    }
    const current = await currentRes.json();
    const forecastData = await forecastRes.json();
    const attrs = current.attributes ?? {};
    const forecastList =
      forecastData?.service_response?.[weatherForecast]?.forecast ?? [];
    res.json({
      state: current.state,
      temperature: attrs.temperature,
      humidity: attrs.humidity,
      forecast: forecastList.slice(0, 8).map(mapForecast),
    });
  } catch (err) {
    console.error("Home weather fetch error:", err);
    res.status(500).json({ error: "Failed to fetch weather" });
  }
});

router.get("/calendar", async (_req, res) => {
  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return;
  }
  try {
    const calendar = await fetchCalendarEvents();
    res.json(calendar);
  } catch (err) {
    console.error("Calendar fetch error:", err);
    res.status(500).json({ error: "Failed to fetch calendar" });
  }
});

export default router;
