# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server (port 3000, proxies /api and socket.io to :4000)
node index.js        # Express server (port 4000)
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint
npm run preview      # Preview the production build
```

For full-stack development, run both `npm run dev` and `node index.js` concurrently.

## Architecture

Two separate processes:

**Client** (`src/`) — Vite + React 19 + TypeScript. Entry: `src/main.tsx`. Providers: `ChakraProvider` (Chakra UI v3) + `QueryClientProvider` (TanStack Query). Built output (`dist/`) is served statically by Express in production.

**Server** (`index.js`) — Express 5 + Socket.IO (JavaScript, not TypeScript). Config is read from `/data/options.json` (HA addon) with `.env` fallback via `config.js`. Entity IDs are read from `options.json` (HA addon) or `frame14.json` (local dev) via `entities.js`. Routes are split into `routes/` files and mounted in `index.js`. The OpenAPI document lives in `openapi.js`.

## Configuration

### Credentials (`config.js`)
Priority: `/data/options.json` (HA addon) → `.env` file (local dev). See `.env.example` for all variables.

| Variable | Description |
|---|---|
| `HA_URL` | Home Assistant base URL |
| `HA_TOKEN` | HA long-lived access token |
| `IMMICH_URL` | Immich server base URL |
| `IMMICH_API_KEY` | Immich API key |
| `IMMICH_ALBUM_ID` | (Optional) Pin a specific album for the photo slideshow |
| `PORT` | Express server port (default 4000) |

### Entity IDs (`entities.js`)
Priority: `/data/options.json` fields (HA addon) → `frame14.json` (local dev).

`frame14.json` schema:
```json
{
  "lights": ["light.living_room", "switch.sonoff_xxx"],
  "weather": { "current": "weather.openweathermap", "forecast": "weather.openweathermap_2" },
  "climate": ["climate.1st_floor_ac"],
  "energy": {
    "currentProduction": "sensor.envoy_xxx_current_power_production",
    "currentConsumption": "sensor.envoy_xxx_current_power_consumption",
    "productionToday": "sensor.envoy_xxx_energy_production_today",
    "consumptionToday": "sensor.envoy_xxx_energy_consumption_today"
  },
  "vacuums": ["vacuum.roborock_q5_pro"]
}
```

In the HA addon, these are configured via the addon's Configuration tab (`light_entities`, `climate_entities`, `vacuum_entities`, `weather_entity`, `weather_forecast_entity`, `energy_*` fields in `config.yaml`).

## Frontend Routes

| Path | Component | Description |
|---|---|---|
| `/` | redirect | → `/home` |
| `/clock` | `Clock` | Portrait display: clock + NWS weather |
| `/home` | `HomeOverview` | Overview: weather, climate, energy, calendar |
| `/lights` | `Lights` | Light + switch controls |
| `/blank` | `Blank` | Pure black screen (motion off) |
| `/photos` | `Photos` | Immich photo slideshow |
| `/radar` | `Radar` | Radar view — frame-only nav item |
| `/timer` | `Timer` | Timer — frame-only nav item |
| `/control` | `Control` | Settings + remote control; device mode toggle (frame vs remote) |

## Component Rules

- Every React component lives in its own file under `src/components/<ComponentName>.tsx` (or a subfolder).
- Route files in `src/routes/` compose components — they must not define multiple sibling components inline. Anti-pattern: `src/routes/HomeOverview.tsx` containing `Header`, `PrinterSection`, `EventList`, `CalendarSection`, etc. Extract each into `src/components/`.
- Small helpers (formatters, type guards) used by one component stay in that component's file. Shared helpers go in `src/lib/`.

## Frontend Structure

```
src/
  main.tsx                        — ChakraProvider + QueryClientProvider
  App.tsx                         — RouterProvider
  router.tsx                      — createBrowserRouter, Layout wraps all routes
  routes/
    Clock.tsx                     — clock + weather page
    HomeOverview.tsx              — home overview page
    Lights.tsx                    — light/switch controls (entity IDs from useEntitiesConfig)
    Blank.tsx                     — black screen
    Photos.tsx                    — Immich slideshow
    Radar.tsx                     — radar view (frame-only)
    Timer.tsx                     — timer (frame-only)
    Control.tsx                   — settings + remote; device mode toggle (frame vs remote), hides remote controls when device is frame
  components/
    Layout.tsx                    — wraps Outlet with SocketViewListener + PageTransition
    LandscapeNav.tsx              — bottom bar (portrait) + left sidebar (landscape); radar/timer hidden on non-frame devices
    PageTransition.tsx            — fade+scale animation on route mount
    PixelShift.tsx                — slow pixel offset to prevent OLED burn-in
    SocketViewListener.tsx        — listens for change_view, navigates (skips /control)
    ClockDisplay.tsx              — 12-hour clock + date, no seconds
    WeatherCurrent.tsx            — current conditions (emoji, temp, humidity, wind)
    WeatherForecast.tsx           — 5-period hourly forecast strip
    PhotoSlide.tsx                — full-bleed crossfade image slide
    LightsSection.tsx             — renders a group of LightEntry controls
    LightControl.tsx              — single light/switch toggle
    EnergyPanel.tsx               — solar production/consumption display
    PrinterSection.tsx            — 3D printer card + click-to-open detail modal (temps, layers, ETA, filament)
    VacuumSection.tsx             — vacuum card; renders only when a vacuum is active (cleaning/returning); shows name + cleaning progress %
    Divider.tsx                   — thin themed divider line
    ViewButton.tsx                — styled outline/solid toggle button
  hooks/
    useWeather.ts                 — fetches /api/weather, refetches every 5min
    useHomeData.ts                — weather+climate+energy+calendar+people+printer+vacuum; climate polls /api/home/climate every 60s, energy polls /api/energy every 30s
    useEntitiesConfig.ts          — fetches /api/entities (entity ID config), staleTime: Infinity
    useEntity.ts                  — subscribes to a single HA entity via Socket.IO room
    useEnergy.ts                  — fetches /api/energy, refetches every 5min
    useThemeMode.ts               — reads/writes theme preference (auto/bright/dark), syncs via socket
    useScreenType.ts              — fetches /api for screenType field ("oled" | "lcd")
    useImmichAlbums.ts            — fetches /api/photos/albums
    useAlbumPhotos.ts             — fetches /api/photos/albums/:id
    usePhotosConfig.ts            — fetches /api/photos/config (pinned album ID)
    useSocket.ts                  — socket.io-client connection status
    useReady.ts                   — reloads page on socket "ready" event (server restart)
    useRegionLuminance.ts         — samples top-left region of an image to determine dark/light
  lib/
    queryClient.ts                — TanStack QueryClient singleton
    socket.ts                     — socket.io-client singleton (connects to window.location.origin)
    lightsConfig.ts               — buildLightSections(ids): derives name (slug→title case) and icon (domain-based) from entity IDs; no static registry
    deviceMode.ts                 — localStorage key "device-mode"; values "frame" | "controller"; auto-detects from UA on first visit; getDeviceMode() / setDeviceMode()
    themeMode.ts                  — theme CSS vars, preference storage, socket sync; "auto" uses daylight window 07:00–19:00
    callService.ts                — callService(entityId, service): emits entity:call socket event for light/switch domains
```

## Backend Structure

```
index.js          — app setup, Socket.IO, mounts routers
config.js         — reads credentials from /data/options.json or .env
entities.js       — reads entity IDs from /data/options.json (HA addon) or frame14.json (local dev)
frame14.json      — local dev entity ID config (not used in HA addon)
openapi.js        — OpenAPI document + Swagger UI renderer
ha-socket.js      — persistent HA WebSocket: state cache, entity rooms, motion/album watchers
routes/
  health.js       — GET /api
  docs.js         — GET /api/docs, GET /api/docs/openapi.json
  weather.js      — GET /api/weather (entity IDs from entities.js)
  home.js         — GET /api/home/weather, GET /api/home/calendar
  climate.js      — GET /api/home/climate (fetches HA states for ENTITIES.climate array)
  energy.js       — GET /api/energy (entity IDs from entities.js)
  vacuum.js       — GET /api/home/vacuum (fetches HA states for ENTITIES.vacuums array)
  entities.js     — GET /api/entities (serves ENTITIES object to frontend)
  photos.js       — GET /api/photos/config|albums|albums/:id|asset/:id/thumbnail
  views.js        — GET /api/change/:view (broadcasts change_view via io from app.locals)
  videos.js       — GET /api/videos/list, GET /videos/:file
```

## API Endpoints

- `GET /api` — health check
- `GET /api/entities` — returns entity ID config (from options.json or frame14.json)
- `GET /api/weather` — current weather + forecast from HA (entity from `ENTITIES.weather`)
- `GET /api/home/weather` — weather used by HomeOverview
- `GET /api/home/climate` — climate states for all entities in `ENTITIES.climate`
- `GET /api/home/vacuum` — vacuum states for all entities in `ENTITIES.vacuums` (state, cleaning_progress, battery_level)
- `GET /api/home/calendar` — today + tomorrow calendar events from all HA calendars
- `GET /api/energy` — solar production/consumption from HA (entity IDs from `ENTITIES.energy`)
- `GET /api/photos/config` — returns `{ defaultAlbumId }` from config
- `GET /api/photos/albums` — Immich album list
- `GET /api/photos/albums/:albumId` — assets in an album (images only)
- `GET /api/photos/asset/:assetId/thumbnail` — proxies Immich thumbnail (hides API key)
- `GET /api/change/:view` — broadcasts `change_view` to all Socket.IO clients
- `GET /api/videos/list` — lists `./videos/`
- `GET /api/docs` — Swagger UI

## Socket.IO

- Client emits `change` with a view name → server broadcasts `change_view` to all **other** clients
- Client emits `entity:subscribe` / `entity:unsubscribe` → joins/leaves Socket.IO room `entity:<id>`
- HA WebSocket pushes state updates → server fans out to `entity:<id>` rooms
- `GET /api/change/:view` broadcasts to **all** clients (used by HA automations)
- `SocketViewListener` navigates on `change_view` but ignores it on `/control`
- `io` instance is passed to route handlers via `app.locals.io`

## Design Constraints (OLED)

- Background is always `#000000`
- Avoid static bright elements — they cause burn-in
- No dividers or decorative borders
- Font: Inter (loaded from Google Fonts in `index.html`)
- All sizes on `/clock` use `vw` units to scale to any portrait resolution
- `/clock` layout is portrait-optimised: clock fills the top, weather below

## Home Assistant Addon

- `config.yaml` — addon manifest (arch, ports, options schema including all entity ID fields)
- `run.sh` — entry point; exports scalar env vars via bashio (arrays read directly from options.json by entities.js)
- `Dockerfile` — multi-stage build; copies `entities.js` and `frame14.json` into image
- `ha-automation.yaml` — example motion sensor automation

## Adding API Endpoints

1. Add the route handler in the appropriate `routes/*.js` file (or create a new one)
2. Mount it in `index.js` — mount more-specific paths before less-specific (e.g. `/api/home/climate` before `/api/home`)
3. Document it in `openapi.js`

## Adding Entity IDs

1. Add the field to `frame14.json` for local dev
2. Add the field to `config.yaml` options + schema for the HA addon
3. Read it in `entities.js` from `options` (addon path) and export it on `ENTITIES`
4. Use `ENTITIES.yourField` in the relevant route handler
