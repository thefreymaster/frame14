import { Router } from "express";
import { HA_URL, HA_TOKEN } from "../config.js";
import { ENTITIES } from "../entities.js";

const router = Router();

const CALENDAR_EXCLUDE = new Set(["calendar.radarr"]);

const HA_HEADERS = () => ({
  Authorization: `Bearer ${HA_TOKEN}`,
  "Content-Type": "application/json",
});

function sortEvents(events) {
  return events.sort((a, b) => {
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    return (a.start ?? "").localeCompare(b.start ?? "");
  });
}

const pad2 = (n) => String(n).padStart(2, "0");
/** A local date as "YYYY-MM-DD". */
const fmtDate = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Home Assistant's calendars, less the ones no one wants on a wall. */
async function listCalendars() {
  const res = await fetch(`${HA_URL}/api/calendars`, { headers: HA_HEADERS() });
  if (!res.ok) return [];
  const calendars = await res.json();
  return calendars.filter((cal) => !CALENDAR_EXCLUDE.has(cal.entity_id));
}

/**
 * Every calendar's events between two local times ("YYYY-MM-DDTHH:MM:SS"),
 * all-day ones first then by start; a calendar that fails to answer
 * contributes none.
 */
async function fetchEvents(calendars, start, end) {
  const results = await Promise.allSettled(
    calendars.map(async (cal) => {
      const res = await fetch(
        `${HA_URL}/api/calendars/${cal.entity_id}?start=${start}&end=${end}`,
        { headers: HA_HEADERS() },
      );
      if (!res.ok) return [];
      const events = await res.json();
      return events.map((e) => ({
        summary: e.summary ?? "",
        start: e.start?.dateTime ?? e.start?.date ?? null,
        end: e.end?.dateTime ?? e.end?.date ?? null,
        allDay: !!e.start?.date,
        calendar: cal.name ?? cal.entity_id,
        calendarId: cal.entity_id,
      }));
    }),
  );
  return sortEvents(
    results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value),
  );
}

async function fetchCalendarEvents() {
  const calendars = await listCalendars();
  const now = new Date();
  const todayStr = fmtDate(now);
  const tmrwStr = fmtDate(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  );
  const [today, tomorrow] = await Promise.all([
    fetchEvents(calendars, `${todayStr}T00:00:00`, `${todayStr}T23:59:59`),
    fetchEvents(calendars, `${tmrwStr}T00:00:00`, `${tmrwStr}T23:59:59`),
  ]);
  return {
    today,
    tomorrow,
    entities: calendars.map((cal) => cal.entity_id),
  };
}

// The agenda, for /calendar: every calendar's events over the next `days`
// days, bucketed by local date — a timed event on the day it starts, an
// all-day one on each day it covers (HA's all-day `end` is the day after
// the last day).
const AGENDA_DAYS_DEFAULT = 14;
const AGENDA_DAYS_MAX = 31;

/** The local date a start or end falls on, "YYYY-MM-DD"; null for none. */
function dateOf(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  return isNaN(d) ? null : fmtDate(d);
}

async function fetchAgenda(days) {
  const calendars = await listCalendars();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayAfter = (d, n) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const dates = Array.from({ length: days }, (_, i) => fmtDate(dayAfter(start, i)));
  const end = dayAfter(start, days);
  const events = await fetchEvents(
    calendars,
    `${fmtDate(start)}T00:00:00`,
    `${fmtDate(end)}T00:00:00`,
  );

  const byDate = new Map(dates.map((date) => [date, []]));
  for (const event of events) {
    const first = dateOf(event.start);
    if (!first) continue;
    if (!event.allDay) {
      byDate.get(first)?.push(event);
      continue;
    }
    // An all-day event runs up to, not through, its end date; one without
    // an end (or ending where it starts) is the one day.
    const last = dateOf(event.end);
    const until = last && last > first ? last : null;
    for (const date of dates) {
      if (date === first || (until && date > first && date < until)) {
        byDate.get(date).push(event);
      }
    }
  }

  return {
    start: fmtDate(start),
    end: fmtDate(end),
    calendars: calendars.map((cal) => ({
      entity_id: cal.entity_id,
      name: cal.name ?? cal.entity_id,
    })),
    days: dates.map((date) => ({ date, events: sortEvents(byDate.get(date)) })),
  };
}

router.get("/calendar/agenda", async (req, res) => {
  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return;
  }
  const requested = Number.parseInt(req.query.days, 10);
  const days = Number.isFinite(requested)
    ? Math.min(AGENDA_DAYS_MAX, Math.max(1, requested))
    : AGENDA_DAYS_DEFAULT;
  try {
    res.json(await fetchAgenda(days));
  } catch (err) {
    console.error("Calendar agenda fetch error:", err);
    res.status(500).json({ error: "Failed to fetch the calendar agenda" });
  }
});

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

/**
 * One weather.get_forecasts call ("hourly" or "daily"). A failing forecast
 * costs only that list: it comes back empty, with the reason in the log.
 */
async function fetchForecast(entityId, type) {
  const res = await fetch(
    `${HA_URL}/api/services/weather/get_forecasts?return_response`,
    {
      method: "POST",
      headers: WEATHER_HEADERS(HA_TOKEN),
      body: JSON.stringify({ entity_id: entityId, type }),
    },
  );
  if (!res.ok) {
    console.warn(
      `Home weather: ${type} get_forecasts for ${entityId} responded with ${res.status}:`,
      (await res.text()).slice(0, 200),
    );
    return [];
  }
  const data = await res.json();
  return data?.service_response?.[entityId]?.forecast ?? [];
}

router.get("/weather", async (_req, res) => {
  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return;
  }
  try {
    const weatherCurrent = ENTITIES.weather?.current ?? "";
    const weatherForecast = ENTITIES.weather?.forecast ?? weatherCurrent;
    const [currentRes, hourly, daily] = await Promise.all([
      fetch(`${HA_URL}/api/states/${weatherCurrent}`, {
        headers: WEATHER_HEADERS(HA_TOKEN),
      }),
      fetchForecast(weatherForecast, "hourly"),
      fetchForecast(weatherForecast, "daily"),
    ]);
    if (!currentRes.ok) {
      res
        .status(502)
        .json({ error: `HA weather state responded with ${currentRes.status}` });
      return;
    }
    const current = await currentRes.json();
    const attrs = current.attributes ?? {};
    // The forecasts failing costs only the forecasts: the current conditions
    // still go out.
    res.json({
      state: current.state,
      temperature: attrs.temperature,
      apparentTemperature: attrs.apparent_temperature ?? null,
      temperatureUnit: attrs.temperature_unit,
      humidity: attrs.humidity,
      // The rest of the conditions, for /weather's Now card; an attribute
      // the entity lacks is null.
      windSpeed: attrs.wind_speed ?? null,
      windSpeedUnit: attrs.wind_speed_unit ?? null,
      windBearing: attrs.wind_bearing ?? null,
      pressure: attrs.pressure ?? null,
      pressureUnit: attrs.pressure_unit ?? null,
      visibility: attrs.visibility ?? null,
      visibilityUnit: attrs.visibility_unit ?? null,
      uvIndex: attrs.uv_index ?? null,
      forecast: hourly.slice(0, 8).map(mapForecast),
      // The next day of hours for /weather's Hourly tab (the cards show 8).
      forecastHours: hourly.slice(0, 24).map(mapForecast),
      // Today first (the cards' high and low), then the days after it for
      // the forecast dialog.
      forecastDaily: daily.slice(0, 10).map(mapForecast),
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
