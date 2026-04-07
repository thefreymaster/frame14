import { Router } from "express";
import { HA_URL, HA_TOKEN } from "../config.js";

const router = Router();

router.get("/", async (_req, res) => {
  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return;
  }

  try {
    const response = await fetch(`${HA_URL}/api/states/weather.kbos`, {
      headers: {
        Authorization: `Bearer ${HA_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    console.log(response.body);

    if (!response.ok) {
      res.status(502).json({ error: `HA responded with ${response.status}` });
      return;
    }

    const data = await response.json();
    const attrs = data.attributes ?? {};

    res.json({
      state: data.state,
      temperature: attrs.temperature,
      temperatureUnit: attrs.temperature_unit,
      humidity: attrs.humidity,
      windSpeed: attrs.wind_speed,
      windBearing: attrs.wind_bearing,
      pressure: attrs.pressure,
      visibility: attrs.visibility,
      forecast: (attrs.forecast ?? []).slice(0, 8).map((f) => ({
        datetime: f.datetime,
        temperature: f.temperature,
        templow: f.templow,
        condition: f.condition,
        precipitation: f.precipitation,
        precipitationProbability: f.precipitation_probability,
        windSpeed: f.wind_speed,
        windBearing: f.wind_bearing,
      })),
    });
  } catch (err) {
    console.error("Weather fetch error:", err);
    res.status(500).json({ error: "Failed to fetch weather from HA" });
  }
});

export default router;
