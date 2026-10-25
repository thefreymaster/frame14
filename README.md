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
| `weather_entity` | Current conditions entity | `weather.systems_weatherkit` |
| `weather_forecast_entity` | Hourly forecast entity | `weather.systems_weatherkit` |
| `light_entities` | List of light/switch entity IDs to control | see below |
| `climate_entities` | List of climate entity IDs to display | see below |
| `climate_names` | Optional labels for thermostats, by entity ID (otherwise the entity's name) | see below |
| `energy_current_production` | Live solar production sensor | `sensor.envoy_xxx_current_power_production` |
| `energy_current_consumption` | Live power consumption sensor | `sensor.envoy_xxx_current_power_consumption` |
| `energy_production_today` | Daily solar total sensor | `sensor.envoy_xxx_energy_production_today` |
| `energy_consumption_today` | Daily consumption total sensor | `sensor.envoy_xxx_energy_consumption_today` |
| `camera_entity` | The doorbell card's camera (shown when `person_entity` turns on) | `camera.front_porch_high` |
| `camera_entities` | The Cameras page's cameras; the doorbell's when empty | `- camera.front_porch_rtsp` |
| `media_player_entity` | The marquee's Plex player (its poster fills the frame while a movie plays) | `media_player.plex_plex_for_apple_tv_apple_tv` |
| `media_player_entities` | The Media page's players; the marquee's when empty | `- media_player.living_room_tv` |

**Example light_entities:**
```yaml
- light.living_room
- light.kitchen_main_lights
- switch.sonoff_1001816bdb
- light.front_yard
```

**Example climate_entities:**
```yaml
- climate.samsung_airconditioner_1
- climate.samsung_airconditioner_2
- climate.samsung_airconditioner_3rd_flr
```

**Example climate_names** (a thermostat without an entry shows its Home Assistant name):
```yaml
- entity: climate.samsung_airconditioner_1
  name: 1st Floor AC
- entity: climate.samsung_airconditioner_2
  name: 2nd Floor AC
```

Light names and icons are derived automatically from entity IDs — `light.kitchen_main_lights` becomes "Kitchen Main Lights".

### 4. Start the addon

Enable **Start on boot** and **Watchdog**, then start it. The dashboard is available via HA ingress or directly at `http://<ha-ip>:4000`.

---

## Routes

| Path | Description |
|---|---|
| `/` | Redirects to `/home` |
| `/home` | Overview: weather, climate, energy, calendar, printer, vacuum, fans; cards rearrange per device (press and hold) |
| `/clock` | Analog or digital clock (tap to switch); frame-only nav item |
| `/lights` | Light and switch controls |
| `/climate` | The thermostats: dial, mode and fan controls, with today's room temperature under each |
| `/energy` | Power flow now, with Solar (month / year history) and Circuits (per-circuit draw) as tabs; `/solar` and `/power` redirect here |
| `/printer` | The 3D printer: camera, job progress and controls, temperatures; off by default in a remote's nav |
| `/vacuum` | The robot vacuums: state, controls, map, wear parts; off by default in a remote's nav |
| `/cameras` | Every camera live (stills when the stream won't start), the printer's camera and the vacuum maps; off by default in a remote's nav |
| `/photos` | Immich photo slideshow; frame-only nav item |
| `/album` | A remote's Photos: the album as a grid, tap a photo to show it on the frames |
| `/weather` | Now (conditions + advisories from the forecast), with Hourly, Daily and Radar as tabs; `/radar` redirects to the Radar tab |
| `/calendar` | The next two weeks across every Home Assistant calendar, a card per day |
| `/media` | The media players: what is playing, transport, volume and source |
| `/timer` | Timer; frame-only nav item |
| `/marquee` | Plex now-playing poster art; auto-routed while a movie plays |
| `/football` | Score bug + game detail for a tracked team; in the nav and auto-routed on game day |
| `/blank` | Black screen (motion off) |
| `/control` | Settings + remote control; use "Use as display" / "Use as remote" to set device mode, and arrange this device's nav |

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
    "current": "weather.systems_weatherkit",
    "forecast": "weather.systems_weatherkit"
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
