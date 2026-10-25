import { Router } from "express";
import { HA_URL, HA_TOKEN } from "../config.js";
import { ENTITIES } from "../entities.js";
import { sendCommand } from "../ha-socket.js";

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

function num(value) {
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : null;
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
  // A configured label (climate_names) beats the entity's own name.
  const names = ENTITIES.climateNames ?? {};

  try {
    const states = await Promise.all(ids.map(fetchState));
    res.json(
      states.map((s) => ({
        entity_id: s.entity_id,
        name: names[s.entity_id] ?? s.attributes?.friendly_name ?? s.entity_id,
        state: s.state,
        currentTemp: s.attributes?.current_temperature ?? null,
        currentHumidity: num(s.attributes?.current_humidity),
        targetTemp: s.attributes?.temperature ?? null,
        hvacMode: s.attributes?.hvac_mode ?? s.state ?? null,
        hvacAction: s.attributes?.hvac_action ?? null,
        fanMode: s.attributes?.fan_mode ?? null,
        fanModes: s.attributes?.fan_modes ?? [],
      })),
    );
  } catch (err) {
    console.error("Climate fetch error:", err);
    res.status(500).json({ error: "Failed to fetch climate data from HA" });
  }
});

// Today's room temperature per thermostat, for the /climate page's strips:
// Home Assistant's history of each climate entity since local midnight,
// folded into quarter hours. Climate entities have no long-term statistics
// (those are for sensors), so this reads the recorder's history, which keeps
// ten days by default — more than today needs.
const QUARTER_HOUR_MS = 15 * 60e3;
const RUNNING_ACTIONS = new Set(["heating", "cooling"]);
const TARGETED_MODES = new Set(["heat", "cool", "heat_cool", "auto"]);

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * The compressed history rows of one entity (`s` state, `a` attributes, `lu`
 * last updated in seconds) as quarter hours from `startMs` to `nowMs`. Each
 * row's reading holds until the next row, so a quarter's temperature is the
 * time-weighted mean of what was reported in it, its target the last one set
 * in it, and its action whichever of heating or cooling ran longer in it.
 */
function quarterHours(rows, startMs, nowMs) {
  let attrs = {};
  const samples = rows
    .map((row) => {
      // Attributes repeat on every row when asked for; carry the last seen
      // ones forward should a row ever come without.
      if (row.a) attrs = row.a;
      return {
        t: Math.max(startMs, Math.round((row.lu ?? row.lc ?? 0) * 1000)),
        temp: num(attrs.current_temperature),
        // A unit keeps its last target while off; the strip shows one only
        // while the mode is holding the room to it.
        target: TARGETED_MODES.has(row.s) ? num(attrs.temperature) : null,
        action: attrs.hvac_action ?? null,
      };
    })
    .sort((a, b) => a.t - b.t);

  const buckets = new Map();
  const bucketOf = (t) =>
    startMs + Math.floor((t - startMs) / QUARTER_HOUR_MS) * QUARTER_HOUR_MS;
  const bucket = (q) => {
    if (!buckets.has(q)) {
      buckets.set(q, {
        tempSum: 0,
        tempMs: 0,
        target: null,
        running: { heating: 0, cooling: 0 },
      });
    }
    return buckets.get(q);
  };

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    const until = Math.min(nowMs, i + 1 < samples.length ? samples[i + 1].t : nowMs);
    let cursor = sample.t;
    while (cursor < until) {
      const q = bucketOf(cursor);
      const sliceEnd = Math.min(until, q + QUARTER_HOUR_MS);
      const ms = sliceEnd - cursor;
      const b = bucket(q);
      if (sample.temp != null) {
        b.tempSum += sample.temp * ms;
        b.tempMs += ms;
      }
      if (sample.target != null) b.target = sample.target;
      if (RUNNING_ACTIONS.has(sample.action)) b.running[sample.action] += ms;
      cursor = sliceEnd;
    }
  }

  return [...buckets.keys()]
    .sort((a, b) => a - b)
    .map((q) => {
      const b = buckets.get(q);
      const { heating, cooling } = b.running;
      return {
        time: new Date(q).toISOString(),
        temp: b.tempMs ? Math.round((b.tempSum / b.tempMs) * 10) / 10 : null,
        target: b.target,
        action:
          heating === 0 && cooling === 0
            ? null
            : heating >= cooling
              ? "heating"
              : "cooling",
      };
    });
}

router.get("/history", async (_req, res) => {
  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return;
  }

  const ids = ENTITIES.climate ?? [];
  const start = startOfToday();
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const now = new Date();

  if (ids.length === 0) {
    res.json({ start: start.toISOString(), end: end.toISOString(), units: [] });
    return;
  }

  try {
    // Every row with its attributes: a thermostat's state (its mode) rarely
    // changes, so a minimal response would drop the temperature readings.
    const history = await sendCommand("history/history_during_period", {
      start_time: start.toISOString(),
      end_time: now.toISOString(),
      entity_ids: ids,
      include_start_time_state: true,
      significant_changes_only: false,
      minimal_response: false,
      no_attributes: false,
    });
    res.json({
      start: start.toISOString(),
      end: end.toISOString(),
      units: ids.map((id) => ({
        entity_id: id,
        points: quarterHours(history?.[id] ?? [], start.getTime(), now.getTime()),
      })),
    });
  } catch (err) {
    console.error("Climate history fetch error:", err);
    res.status(500).json({ error: "Failed to fetch climate history from HA" });
  }
});

export default router;
