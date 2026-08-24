import { Router } from "express";
import { HA_URL, HA_TOKEN } from "../config.js";
import { ENTITIES } from "../entities.js";
import { sendCommand, getState } from "../ha-socket.js";

const router = Router();

const PRODUCTION_ENTITY = ENTITIES.energy?.productionToday ?? "";
const CONSUMPTION_ENTITY = ENTITIES.energy?.consumptionToday ?? "";
const CURRENT_PRODUCTION_ENTITY = ENTITIES.energy?.currentProduction ?? "";
const CURRENT_CONSUMPTION_ENTITY = ENTITIES.energy?.currentConsumption ?? "";
const LIFETIME_PRODUCTION_ENTITY = ENTITIES.energy?.lifetimeProduction ?? "";
const LIFETIME_CONSUMPTION_ENTITY = ENTITIES.energy?.lifetimeConsumption ?? "";
const TEMPERATURE_ENTITY = ENTITIES.weather?.temperature ?? "";

// The inverter's own "energy X today" sensors are unreliable: they roll over
// on the inverter's clock rather than at local midnight, and the consumption
// one drifts upward (it read 87.6 kWh for a day whose real usage was 52.3).
// When lifetime counters are configured we take each period's total as the
// difference between their end-of-day readings instead, which is the figure
// HA's own energy dashboard shows. Without them we fall back to the today
// sensors, whose end-of-day reading is itself the daily total.
//
// The statistics "change" type would be the obvious tool here, but it is
// polluted by counter resets: a single inverter reboot booked a 14,971 kWh
// jump on a 13.6 kWh day. Differencing the cumulative reading ignores those.
const USE_LIFETIME = Boolean(LIFETIME_PRODUCTION_ENTITY && LIFETIME_CONSUMPTION_ENTITY);
const PRODUCTION_STAT = USE_LIFETIME ? LIFETIME_PRODUCTION_ENTITY : PRODUCTION_ENTITY;
const CONSUMPTION_STAT = USE_LIFETIME ? LIFETIME_CONSUMPTION_ENTITY : CONSUMPTION_ENTITY;
const ENERGY_STAT_TYPE = "state";

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Lifetime counters are often reported in MWh; every figure we serve is kWh.
function kwhScale(entity) {
  const unit = getState(entity)?.attributes?.unit_of_measurement;
  if (unit === "MWh") return 1000;
  if (unit === "Wh") return 0.001;
  return 1;
}

function energyScale(entity) {
  return USE_LIFETIME ? kwhScale(entity) : 1;
}

async function fetchStatistics(statisticIds, start, end, period, types) {
  return sendCommand("recorder/statistics_during_period", {
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    statistic_ids: statisticIds,
    period,
    types,
  });
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayBefore(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

// Energy so far today: the live lifetime reading minus where it stood at the
// end of yesterday. Reads straight from the state cache, so it is current.
async function todayTotal(entity) {
  const start = startOfToday();
  const stats = await fetchStatistics([entity], dayBefore(start), start, "day", ["state"]);
  // HA includes today's own partial row in that window; the baseline is the
  // last row that closed before midnight.
  const rows = (stats?.[entity] ?? []).filter(
    (row) => row.state != null && new Date(row.start) < start,
  );
  const baseline = rows.length ? Number(rows[rows.length - 1].state) : null;
  const current = parseFloat(getState(entity)?.state);
  if (baseline == null || isNaN(baseline) || isNaN(current) || current < baseline) return null;
  return (current - baseline) * kwhScale(entity);
}

// Daily statistics rows keyed by local date.
function buildDayMap(arr, key = ENERGY_STAT_TYPE, scale = 1) {
  const map = {};
  for (const s of arr ?? []) {
    if (s[key] == null) continue;
    map[localDateStr(new Date(s.start))] = Number(s[key]) * scale;
  }
  return map;
}

// A day's total from the map of end-of-day readings. Lifetime counters are
// cumulative, so the day's energy is the step since the previous day; the
// today sensors already hold the day's own total.
function dailyTotal(map, dateStr, prevDateStr) {
  const cur = map[dateStr];
  if (cur == null) return null;
  if (!USE_LIFETIME) return cur;
  const prev = map[prevDateStr];
  if (prev == null || cur < prev) return null;
  return cur - prev;
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

  if (!PRODUCTION_STAT || !CONSUMPTION_STAT || !CURRENT_PRODUCTION_ENTITY || !CURRENT_CONSUMPTION_ENTITY) {
    res.status(503).json({ error: "Energy entities not configured" });
    return;
  }

  try {
    const [currentProduction, currentConsumption] = await Promise.all([
      fetchState(CURRENT_PRODUCTION_ENTITY),
      fetchState(CURRENT_CONSUMPTION_ENTITY),
    ]);

    let production = null;
    let consumption = null;

    if (USE_LIFETIME) {
      try {
        const [prod, cons] = await Promise.all([
          todayTotal(LIFETIME_PRODUCTION_ENTITY),
          todayTotal(LIFETIME_CONSUMPTION_ENTITY),
        ]);
        if (prod != null) production = round2(prod);
        if (cons != null) consumption = round2(cons);
      } catch (err) {
        console.error("Lifetime energy statistics failed, falling back:", err);
      }
    }

    if (production == null || consumption == null) {
      if (!PRODUCTION_ENTITY || !CONSUMPTION_ENTITY) {
        res.status(503).json({ error: "Energy entities not configured" });
        return;
      }
      const [prod, cons] = await Promise.all([
        fetchState(PRODUCTION_ENTITY),
        fetchState(CONSUMPTION_ENTITY),
      ]);
      if (production == null) production = parseFloat(prod.state);
      if (consumption == null) consumption = parseFloat(cons.state);
    }

    function toWatts(state, attrs) {
      const val = parseFloat(state);
      if (isNaN(val)) return NaN;
      const unit = attrs?.unit_of_measurement ?? "W";
      return unit === "kW" ? val * 1000 : val;
    }

    res.json({
      production,
      productionUnit: "kWh",
      consumption,
      consumptionUnit: "kWh",
      currentProduction: toWatts(currentProduction.state, currentProduction.attributes),
      currentProductionUnit: "W",
      currentConsumption: toWatts(currentConsumption.state, currentConsumption.attributes),
      currentConsumptionUnit: "W",
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
  if (!PRODUCTION_STAT || !CONSUMPTION_STAT) {
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
    // "state" is each day's last reading; the day before the window is fetched
    // too because a lifetime counter's first day needs it as its baseline.
    const statisticIds = [PRODUCTION_STAT, CONSUMPTION_STAT];
    if (TEMPERATURE_ENTITY) statisticIds.push(TEMPERATURE_ENTITY);
    const stats = await fetchStatistics(statisticIds, dayBefore(fetchStart), fetchEnd, "day", [
      ENERGY_STAT_TYPE,
      "mean",
    ]);

    const prodByDay = buildDayMap(stats[PRODUCTION_STAT], ENERGY_STAT_TYPE, energyScale(PRODUCTION_STAT));
    const consByDay = buildDayMap(stats[CONSUMPTION_STAT], ENERGY_STAT_TYPE, energyScale(CONSUMPTION_STAT));
    const tempByDay = buildDayMap(stats[TEMPERATURE_ENTITY], "mean");

    const production = [];
    const consumption = [];
    const runningProduction = [];
    const runningConsumption = [];
    const temperature = [];
    let runProd = 0;
    let runCons = 0;

    for (let d = 1; d <= lastDay; d++) {
      const x = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const prevX = localDateStr(new Date(year, month, d - 1));
      const prodRaw = dailyTotal(prodByDay, x, prevX);
      const consRaw = dailyTotal(consByDay, x, prevX);
      const prod = prodRaw != null ? round2(prodRaw) : null;
      const cons = consRaw != null ? round2(consRaw) : null;

      if (prod != null) runProd = round2(runProd + prod);
      if (cons != null) runCons = round2(runCons + cons);

      production.push({ x, y: prod });
      consumption.push({ x, y: cons });
      runningProduction.push({ x, y: runProd });
      runningConsumption.push({ x, y: runCons });
      temperature.push({ x, y: tempByDay[x] != null ? round2(tempByDay[x]) : null });
    }

    const series = [
      { id: "production", data: production },
      { id: "consumption", data: consumption },
      { id: "runningProduction", data: runningProduction },
      { id: "runningConsumption", data: runningConsumption },
    ];
    if (TEMPERATURE_ENTITY) series.push({ id: "temperature", data: temperature });
    res.json(series);
  } catch (err) {
    console.error("Monthly energy fetch error:", err);
    res.status(500).json({ error: "Failed to fetch monthly energy data from HA" });
  }
});

router.get("/yearly", async (req, res) => {
  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return;
  }
  if (!PRODUCTION_STAT || !CONSUMPTION_STAT) {
    res.status(503).json({ error: "Energy entities not configured" });
    return;
  }

  let year;
  if (req.query.year) {
    year = parseInt(req.query.year, 10);
    if (isNaN(year)) {
      res.status(400).json({ error: "year param must be YYYY" });
      return;
    }
  } else {
    year = new Date().getFullYear();
  }

  const now = new Date();
  const isCurrentYear = now.getFullYear() === year;
  const lastMonth = isCurrentYear ? now.getMonth() : 11;

  const fetchStart = new Date(year, 0, 1, 0, 0, 0);
  const fetchEnd = isCurrentYear ? now : new Date(year, 11, 31, 23, 59, 59);

  try {
    // Daily totals summed per month — derived the same way as the monthly
    // route, so the two views agree.
    const statisticIds = [PRODUCTION_STAT, CONSUMPTION_STAT];
    if (TEMPERATURE_ENTITY) statisticIds.push(TEMPERATURE_ENTITY);
    const stats = await fetchStatistics(statisticIds, dayBefore(fetchStart), fetchEnd, "day", [
      ENERGY_STAT_TYPE,
      "mean",
    ]);

    function sumByMonth(arr, scale = 1) {
      const byDay = buildDayMap(arr, ENERGY_STAT_TYPE, scale);
      const map = {};
      for (const day of Object.keys(byDay).sort()) {
        const date = new Date(`${day}T00:00:00`);
        if (date.getFullYear() !== year) continue; // the baseline day sits in the previous year
        const prevDay = localDateStr(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1));
        const total = dailyTotal(byDay, day, prevDay);
        if (total == null) continue;
        const m = date.getMonth();
        map[m] = (map[m] ?? 0) + total;
      }
      return map;
    }

    // Average of daily mean temps per month
    function avgMeanByMonth(arr) {
      const sums = {};
      const counts = {};
      for (const s of arr ?? []) {
        if (s.mean == null) continue;
        const m = new Date(s.start).getMonth();
        sums[m] = (sums[m] ?? 0) + Number(s.mean);
        counts[m] = (counts[m] ?? 0) + 1;
      }
      const map = {};
      for (const m of Object.keys(sums)) map[m] = sums[m] / counts[m];
      return map;
    }

    const prodByMonth = sumByMonth(stats[PRODUCTION_STAT], energyScale(PRODUCTION_STAT));
    const consByMonth = sumByMonth(stats[CONSUMPTION_STAT], energyScale(CONSUMPTION_STAT));
    const tempByMonth = avgMeanByMonth(stats[TEMPERATURE_ENTITY]);

    const production = [];
    const consumption = [];
    const runningProduction = [];
    const runningConsumption = [];
    const temperature = [];
    let runProd = 0;
    let runCons = 0;

    for (let m = 0; m <= lastMonth; m++) {
      const x = `${year}-${String(m + 1).padStart(2, "0")}`;
      const prod = prodByMonth[m] != null ? round2(prodByMonth[m]) : null;
      const cons = consByMonth[m] != null ? round2(consByMonth[m]) : null;

      if (prod != null) runProd = round2(runProd + prod);
      if (cons != null) runCons = round2(runCons + cons);

      production.push({ x, y: prod });
      consumption.push({ x, y: cons });
      runningProduction.push({ x, y: runProd });
      runningConsumption.push({ x, y: runCons });
      temperature.push({ x, y: tempByMonth[m] != null ? round2(tempByMonth[m]) : null });
    }

    const series = [
      { id: "production", data: production },
      { id: "consumption", data: consumption },
      { id: "runningProduction", data: runningProduction },
      { id: "runningConsumption", data: runningConsumption },
    ];
    if (TEMPERATURE_ENTITY) series.push({ id: "temperature", data: temperature });
    res.json(series);
  } catch (err) {
    console.error("Yearly energy fetch error:", err);
    res.status(500).json({ error: "Failed to fetch yearly energy data from HA" });
  }
});

export default router;
