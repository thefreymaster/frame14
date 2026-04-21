# Frame14

Home dashboard with clock, weather, Immich photo slideshow, lights, climate, and energy monitoring. Built as a Home Assistant addon.

## Home Assistant Addon Setup

### 1. Add the repository

In HA → **Settings → Add-ons → Add-on Store → ⋮ → Repositories**, add:

```
https://github.com/thefreymaster/ha-oled-frame
```

### 2. Install Frame14

Find **Frame14** in the store and install it.

### 3. Configure

In the addon's **Configuration** tab, set the following:

| Field | Description | Example |
|---|---|---|
| `ha_url` | Home Assistant base URL | `http://supervisor/core` |
| `ha_token` | Long-lived access token | `eyJ0eXAiOiJKV1Q...` |
| `immich_url` | Immich server URL | `http://192.168.1.x:2283` |
| `immich_api_key` | Immich API key | |
| `port` | Server port | `4000` |
| `weather_entity` | Current conditions entity | `weather.openweathermap` |
| `weather_forecast_entity` | Hourly forecast entity | `weather.openweathermap_2` |
| `light_entities` | List of light/switch entity IDs to control | see below |
| `climate_entities` | List of climate entity IDs to display | see below |
| `energy_current_production` | Live solar production sensor | `sensor.envoy_xxx_current_power_production` |
| `energy_current_consumption` | Live power consumption sensor | `sensor.envoy_xxx_current_power_consumption` |
| `energy_production_today` | Daily solar total sensor | `sensor.envoy_xxx_energy_production_today` |
| `energy_consumption_today` | Daily consumption total sensor | `sensor.envoy_xxx_energy_consumption_today` |

**Example light_entities:**
```yaml
- light.living_room
- light.kitchen_main_lights
- switch.sonoff_1001816bdb
- light.front_yard
```

**Example climate_entities:**
```yaml
- climate.1st_floor_ac
- climate.2nd_floor_ac
- climate.3rd_floor_ac
```

Light names and icons are derived automatically from entity IDs — `light.kitchen_main_lights` becomes "Kitchen Main Lights".

### 4. Start the addon

Enable **Start on boot** and **Watchdog**, then start it. The dashboard is available via HA ingress or directly at `http://<ha-ip>:4000`.

---

## Routes

| Path | Description |
|---|---|
| `/` | Redirects to `/clock` |
| `/clock` | Portrait clock + weather display |
| `/home` | Overview: weather, climate, energy, calendar |
| `/lights` | Light and switch controls |
| `/photos` | Immich photo slideshow |
| `/radar` | Radar view (frame-only nav item) |
| `/timer` | Timer (frame-only nav item) |
| `/blank` | Black screen (motion off) |
| `/control` | Settings + remote control; use "Use as display" / "Use as remote" to set device mode |

---

## Home Assistant Automation (Motion Sensor)

Use `ha-automation.yaml` as a reference. Calls `GET /api/change/:view` to switch the display when motion is detected or times out.

---

## Local Development

```bash
npm install
```

Copy `.env.example` to `.env` and fill in your values. Create `frame14.json` in the project root with your entity config (used as fallback when not running as an HA addon):

```json
{
  "lights": ["light.living_room", "light.kitchen_main_lights"],
  "weather": {
    "current": "weather.openweathermap",
    "forecast": "weather.openweathermap_2"
  },
  "climate": ["climate.1st_floor_ac"],
  "energy": {
    "currentProduction": "sensor.envoy_xxx_current_power_production",
    "currentConsumption": "sensor.envoy_xxx_current_power_consumption",
    "productionToday": "sensor.envoy_xxx_energy_production_today",
    "consumptionToday": "sensor.envoy_xxx_energy_consumption_today"
  }
}
```

Run both processes concurrently:

```bash
npm run dev      # Vite dev server on :3000, proxies /api to :4000
node index.js    # Express server on :4000
```

Build for production:

```bash
npm run build
```

Swagger UI: `http://localhost:4000/api/docs`
