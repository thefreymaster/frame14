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

**Client** (`src/`) — Vite + React 19 + TypeScript. Entry: `src/main.tsx`. Providers: `Provider` (`src/components/ui/provider.tsx` — `ChakraProvider value={defaultSystem}` + Chakra's colour mode) + `QueryClientProvider` (TanStack Query), plus the Chakra `Toaster`. See "UI system" below. Built output (`dist/`) is served statically by Express in production.

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
| `PLEX_URL` | (Optional) Plex server URL for full-res marquee posters; must be the `plex.direct` hostname (a bare IP fails TLS verification) |
| `PLEX_TOKEN` | (Optional) Plex token; without it marquee art falls back to HA's 200x300 thumbnail |
| `PORT` | Express server port (default 4000) |
| `ASSIST_PIPELINE_ID` | (Optional) Assist pipeline the mic button runs; empty uses HA's preferred pipeline |
| `ASSIST_SPEAKER` | (Optional) `media_player` to also speak the assist reply on |

### Entity IDs (`entities.js`)
Priority: `/data/options.json` fields (HA addon) → `frame14.json` (local dev).

`frame14.json` schema:
```json
{
  "lights": ["light.living_room", "switch.sonoff_xxx"],
  "weather": { "current": "weather.systems_weatherkit", "forecast": "weather.systems_weatherkit" },
  "climate": ["climate.1st_floor_ac"],
  "energy": {
    "currentProduction": "sensor.envoy_xxx_current_power_production",
    "currentConsumption": "sensor.envoy_xxx_current_power_consumption",
    "productionToday": "sensor.envoy_xxx_energy_production_today",
    "consumptionToday": "sensor.envoy_xxx_energy_consumption_today",
    "lifetimeProduction": "sensor.envoy_xxx_lifetime_energy_production",
    "lifetimeConsumption": "sensor.envoy_xxx_lifetime_energy_consumption"
  },
  "vacuums": ["vacuum.roborock_q5_pro"],
  "mediaPlayer": "media_player.plex_xxx",
  "printer": "sensor.a1_xxx_print_status",
  "teamTracker": ["sensor.teamtracker_fsu"]
}
```

The `printer` field is the printer's `print_status` sensor entity ID; all sibling printer sensors (progress, temps, layers, …) are derived from its prefix in `src/lib/printerEntities.ts`. Empty string disables the printer card.

In the HA addon, these are configured via the addon's Configuration tab (`light_entities`, `climate_entities`, `vacuum_entities`, `weather_entity`, `weather_forecast_entity`, `energy_*` including the optional `energy_lifetime_production`/`energy_lifetime_consumption`, `media_player_entity`, `printer_status_entity`, `team_tracker_entities` fields in `config.yaml`).

## Frontend Routes

| Path | Component | Description |
|---|---|---|
| `/` | redirect | → `/home` |
| `/clock` | `Clock` | Portrait display: clock + NWS weather |
| `/home` | `HomeOverview` | Overview: weather, climate, energy, calendar. Cards are rearrangeable and resizable per device (press and hold) — see `HomeBoard` |
| `/lights` | `Lights` | Light + switch controls |
| `/blank` | `Blank` | Pure black screen (motion off) |
| `/photos` | `Photos` | Immich photo slideshow |
| `/radar` | `Radar` | Radar view — frame-only nav item |
| `/timer` | `Timer` | Timer — frame-only nav item |
| `/marquee` | `Marquee` | Plex now-playing: poster art filling the screen, no overlay text; auto-routed. Movies only — an episode (`tvshow`) or live TV (`video`/`channel`) never routes here and shows "movies only" if you navigate in |
| `/football` | `Football` | Full-screen score bug + game detail; a preview before kickoff, a scoreboard during. Up all of game day (nav tab too); auto-routed on kickoff |
| `/control` | `Control` | Settings + remote control; device mode toggle (frame vs remote) |

## UI system (Chakra UI v3, native theme)

The UI is stock Chakra UI v3: `ChakraProvider value={defaultSystem}` with no
custom tokens, recipes, variants or global styles. Components are used with
their built-in variants, sizes and `colorPalette`s — Card, Collapsible, Dialog,
Tabs, SegmentGroup, Slider, Switch, CheckboxCard, Progress / ProgressCircle,
Stat, Badge, Tag, Skeleton, EmptyState, Alert, ActionBar, DataList,
NativeSelect, Status, Tooltip, Toaster, Button / IconButton / CloseButton —
with Chakra's own fonts, radii, shadows, borders and colours.

- **One scale knob.** `src/index.css` sets `html { font-size: clamp(16px, 1.75vmin, 32px) }`. Chakra sizes
  everything in rem, so this scales the whole UI together (28px root on the 1600x2400 frame) and keeps native
  proportions. Size things with Chakra's scales (`textStyle="2xl"`, `fontSize="9xl"`, `p="4"`, `size="lg"`),
  not vmin or px. The rest of `index.css` is layout only: the full-height shell and the /home hide-when-empty
  rules (see "Home layout" there).
- **Colour mode.** `lib/themeMode.ts` keeps the Auto / Bright / Dark preference, the 07:00–19:00 daylight window
  and the socket sync; `components/ui/provider.tsx` feeds the effective mode to Chakra's colour mode (the
  `color-mode` snippet, next-themes, `forcedTheme`). Bright is Chakra's light mode, Dark is Chakra's dark mode.
- **Colour from tokens.** Use semantic tokens (`fg`, `fg.muted`, `bg.muted`, `border`, `fg.success`, …) or a
  `colorPalette`. Where a raw CSS string is needed (SVG strokes in the climate dialog's dial and the analog
  clock), use the variable, e.g. `var(--chakra-colors-orange-solid)`; nivo needs literals, so Solar resolves
  palette colours with `defaultSystem.token()`.
- **Bespoke graphics stay hand-drawn**: the thermostat arc dial in the climate dialog (`ThermostatDial`; the
  Home card itself is stock Card / Stat / Badge tiles), the analog clock, the TeamTracker / football score bug
  and the nivo chart. They take their colours from Chakra tokens; team colours are data and stay as delivered.
- `src/components/ui/` holds Chakra CLI snippets (`npx @chakra-ui/cli snippet add <name>`).

## Component Rules

- Every React component lives in its own file under `src/components/<ComponentName>.tsx` (or a subfolder).
- Route files in `src/routes/` compose components — they must not define multiple sibling components inline. Anti-pattern: `src/routes/HomeOverview.tsx` containing `Header`, `PrinterSection`, `EventList`, `CalendarSection`, etc. Extract each into `src/components/`.
- Small helpers (formatters, type guards) used by one component stay in that component's file. Shared helpers go in `src/lib/`.

## Frontend Structure

```
src/
  main.tsx                        — Provider (Chakra defaultSystem + colour mode) + QueryClientProvider + Toaster
  index.css                       — the one global scale knob (root font-size) + full-height shell + /home hide-when-empty rules
  App.tsx                         — RouterProvider
  router.tsx                      — createBrowserRouter, Layout wraps all routes
  routes/
    Clock.tsx                     — clock + weather page
    HomeOverview.tsx              — home overview page; builds the card map and hands it to HomeBoard, keyed by the column count (`useHomeColumns`: 4 / 2 / 1 from the media queries in lib/homeLayout)
    Lights.tsx                    — light/switch controls (entity IDs from useEntitiesConfig)
    Blank.tsx                     — black screen
    Photos.tsx                    — Immich slideshow
    Radar.tsx                     — radar view (frame-only)
    Timer.tsx                     — timer (frame-only)
    Marquee.tsx                   — Plex now-playing poster, full-bleed with no metadata overlay; movies only (`isMovie`), hides nav on mount (local only), eye button restores it
    Football.tsx                  — live game page; renders every game in the route window, "no game in session" when empty (auto-routed, so it never decides whether to show itself)
    Control.tsx                   — settings + remote; device mode toggle (frame vs remote), hides remote controls when device is frame
  components/
    Layout.tsx                    — wraps Outlet with SocketViewListener + PageTransition
    LandscapeNav.tsx              — bottom bar (portrait) + left sidebar (landscape), each a Chakra Tabs list (`variant="subtle"`) whose triggers navigate on click; radar/timer hidden on non-frame devices
    PageTransition.tsx            — fade+scale animation on route mount
    PixelShift.tsx                — slow pixel offset to prevent OLED burn-in
    SocketViewListener.tsx        — listens for change_view, navigates (skips /control)
    WeatherForecast.tsx           — hourly forecast strip of Buttons; each opens ForecastDetailModal
    PhotoSlide.tsx                — full-bleed crossfade image slide
    MarqueeArt.tsx                — full-bleed poster, backgroundSize cover (absolute, not fixed — PageTransition leaves a transform on an ancestor)
    LightsSection.tsx             — renders a group of LightEntry controls
    LightControl.tsx              — single light/switch: a Chakra CheckboxCard (yellow palette); the whole card toggles
    EnergySection.tsx             — energy card (coverage Progress, grid Badge) + detail modal (PanelDialog, Stats)
    PrinterSection.tsx            — 3D printer card (Progress) + click-to-open detail modal (PanelDialog: temps, layers, ETA, filament as Stats)
    PanelDialog.tsx               — shell of the detail modals: a stock Chakra Dialog with title, body and close button
    ForecastDetailModal.tsx       — one forecast period as a PanelDialog of Stats
    TeamTracker.tsx               — TeamTracker sports card; tapping a score bug opens /football; one chip per tracked team (matchup, kickoff time / live score with period + clock / final); renders only for PRE/IN/POST, hidden on BYE/NOT_FOUND. On a narrow card (container query, `NARROW`) the broadcast row re-flows to one team per row with the clock between. Card-sized rendering only — the game model is in `src/lib/teamTracker.ts`
    FootballScoreboard.tsx        — the /football score bug at scoreboard scale; same anatomy as TeamTracker's chip, its own vmin sizes (the card's are tuned for a bento tile)
    FootballDetail.tsx            — band under the scoreboard: full down & distance, last play, network/venue, records. Dim by design — it sits still for three hours
    VacuumSection.tsx             — vacuum card; renders only when a vacuum is active (cleaning/returning); shows name + cleaning progress %
    RadarSection.tsx              — Windy radar card, collapsible (`board-collapsed:radar`), above energy in both layouts; renders only while the current weather condition is rain (rainy/pouring/lightning-rainy/snowy-rainy); iframe is pointer-events none so it can't trap page scroll
    ClimateSection.tsx            — one compact tile per thermostat: a Card rendered as a button holding a Stat (name, mode icon, room temperature, status line). A unit that's on gets the dialog's ring, a 0.25rem border in `hvacPalette`'s ring colour, with the icon and status line in its accent ("Heating to 70°" with a pulsing icon while running, "Heat · set 70°" idle); an off unit is the outline card with a grey "Off" Badge; columns come from the card's width (container query, `climateGridCss`); a tap opens ClimateDialog
    ClimateDialog.tsx             — thermostat modal: a stock Chakra Dialog holding a draggable ThermostatDial, a SegmentGroup (Heat / Cool / Fan / Off) and a fan-speed Slider
    ThermostatDial.tsx            — ClimateDialog's Nest-style face: ring, live pulse, 120° tick arc in the mode's Chakra palette colour; with `control` the arc drags/taps and commits on pointerup. The one hand-drawn control (geometry in lib/thermostatArc.ts)
    FanSpeedSlider.tsx            — Chakra Slider over a climate entity's fan_modes, commits on release
    FanSection.tsx                — fan Buttons + modal (stock Dialog: vertical Slider for speed, Switch for power)
    VoiceAssistButton.tsx         — fixed mic FAB; rendered from Layout so it exists on every view, hidden with the nav
    VoiceAssistOverlay.tsx        — full-screen voice session UI, a stock Chakra Dialog, always mounted and open while a session runs; keeps the last live snapshot for the exit animation (listening / thinking / speaking / done / error); done swaps the mic for a checkmark
    VoiceLevelRing.tsx            — mic level ring; writes transform in a rAF loop, never through React state
    VoiceStatusBoard.tsx          — read-only voice diagnostics on /control (DataList, Alerts)
    HomeBoard.tsx                 — /home's rearrangeable layout: one CSS grid of `columns` equal columns (4 desktop / landscape tablet, 2 frame portrait, 1 phone), each card spanning its saved width, packed by height with `usePackedRows`. Press-and-hold enters arranging; dnd-kit sorts the single list live in onDragOver (no sortable transforms — the grid re-packs and shows the landing spot), with a travel threshold so two cards don't flip back and forth; dashed lanes show the columns. Saves via lib/homeLayout; Done/Escape/90s idle leaves. DragOverlay and toolbar are portalled to body (PageTransition's transform would offset fixed elements)
    HomeCardSlot.tsx              — sortable grid item per card (`grid-column: span n`); inert (no listeners) outside arranging; carries the width picker while arranging on 2+ columns
    HomeCardWidthPicker.tsx       — the width SegmentedControl (¼ ½ ¾ Full / ½ Full) straddling a card's bottom edge; stops pointer and key events so it never starts a drag
    HomeCardFace.tsx              — card body + drag grip + stand-in for a card that is hidden right now (shown/hidden by CSS `:has`/`:empty`, see "Home layout" in src/index.css)
    HomeLayoutToolbar.tsx         — Reset / Done bar shown while arranging — a Chakra ActionBar that ignores outside presses and Escape (HomeBoard owns Escape)
    Board.tsx                     — stock Chakra Card (size sm below Chakra's md breakpoint, i.e. phones; md above; `borderRadius="sm"`, which every card and the tiles inside cards share) with an optional Collapsible header; collapse state persists in localStorage under `board-collapsed:<key>`; Collapsible animates open/close and rotates the chevron indicator; accepts ReactNode `title` so sections can show summary stats (event count, printer %, energy kW) when collapsed
    StatusChip.tsx                — ambient chip (Chakra Tag, `surface` variant) for the status strip and the bird detection
    skeletons/                    — /home loading placeholders built from stock Chakra Skeleton / SkeletonCircle
    ui/                           — Chakra CLI snippets (close-button, color-mode, data-list, empty-state, native-select, provider, segmented-control, slider, status, switch, toaster, tooltip, toggle-tip)
  hooks/
    useWeather.ts                 — fetches /api/weather, refetches every 5min
    useHomeData.ts                — weather+climate+energy+calendar+people+printer+vacuum; climate polls /api/home/climate every 60s, energy polls /api/energy every 30s
    useEntitiesConfig.ts          — fetches /api/entities (entity ID config), staleTime: Infinity
    useEntity.ts                  — subscribes to a single HA entity via Socket.IO room
    useLiveGame.ts                — tracked games worth showing now; `useGames(window)` takes the window predicate, `useLiveGame()` is the route's tighter one. Ticks every 60s so windows open/close on the clock
    useEnergy.ts                  — fetches /api/energy, refetches every 5min
    useThemeMode.ts               — reads/writes theme preference (auto/bright/dark), syncs via socket
    useScreenType.ts              — fetches /api for screenType field ("oled" | "lcd")
    useImmichAlbums.ts            — fetches /api/photos/albums
    useAlbumPhotos.ts             — fetches /api/photos/albums/:id
    usePhotosConfig.ts            — fetches /api/photos/config (pinned album ID)
    useLongPress.ts               — press-and-hold pointer handlers; movement cancels, ignores portal events, swallows the release click
    usePackedRows.ts              — masonry packing for a CSS grid: 2px auto rows, each child measured (ResizeObserver) and given `grid-row-end: span n`; used by HomeBoard and its skeleton
    useVoiceAssist.ts             — voice session snapshot + start/cancel (useSyncExternalStore over lib/voiceAssist)
    useAssistConfig.ts            — fetches /api/assist/config, staleTime: Infinity
    useSocket.ts                  — socket.io-client connection status
    useReady.ts                   — reloads page on socket "ready" event (server restart)
    useRegionLuminance.ts         — samples top-left region of an image to determine dark/light
  lib/
    queryClient.ts                — TanStack QueryClient singleton
    socket.ts                     — socket.io-client singleton (connects to window.location.origin)
    lightsConfig.ts               — buildLightSections(ids): derives name (slug→title case) and icon (domain-based) from entity IDs; no static registry
    deviceMode.ts                 — localStorage key "device-mode"; values "frame" | "controller"; auto-detects from UA on first visit; getDeviceMode() / setDeviceMode()
    navVisibility.ts              — nav show/hide store synced over socket; setNavVisible broadcasts, setNavVisibleLocal does not (used by routes that auto-hide)
    themeMode.ts                  — Auto / Bright / Dark preference storage and socket sync, mapped onto Chakra's light/dark colour mode by the provider; "auto" uses daylight window 07:00–19:00
    navMetrics.ts                 — nav bar height / rail width in rem, shared by Layout, the mic button and the arranging bar
    hvac.ts                       — thermostat model shared by the climate card and modal: modes, hvac colours (Chakra palettes), action detection, and the card's tile columns (`climateGridCss`)
    thermostatArc.ts              — geometry of the thermostat's 120° tick arc
    weatherIcons.ts               — HA weather condition → react-icons element (day/night)
    plexMedia.ts                  — Plex media_player attribute helpers: artUrl (cache-busted proxy URL), title/subtitle, elapsed + progress extrapolation, isMovie (the marquee's content-type gate, mirrored by the media watcher in ha-socket.js)
    teamTracker.ts                — the TeamTracker game model shared by the home card, /football and its nav item: attribute types, `sides()` (away-first split), `stateLabel()`, and the two visibility windows — `inWindow` (card: rolling 24h pre / 6h post) and `inRouteWindow` (route: the whole local day of the game, keyed on kickoff)
    callService.ts                — callService(entityId, service): emits entity:call socket event for light/switch domains
    voiceRecorder.ts              — mic capture; AudioContext at 16kHz so the browser resamples, worklet does Float32→Int16
    voiceAssist.ts                — voice session state machine + socket protocol (module store, like navVisibility)
    homeLayout.ts                 — /home card ids, column rules (`homeColumnsFor` and its media queries), widths per grid (`HOME_WIDTHS`), default layouts for 2 and 4 columns (a phone reads the 2-column one at full width), and localStorage `home-layout:<2|4>col` as an ordered list of `{ id, span }`; written only after a card is moved or resized, normalised on read (unknown ids dropped, spans clamped, missing cards appended at their default width); a pre-0.51 zone layout (`home-layout:portrait|landscape`) is converted on read
    voiceCue.ts                   — synthesised success/failure tones (Web Audio, no asset files) that stand in for a spoken reply
```

## Backend Structure

```
index.js          — app setup, Socket.IO, mounts routers
config.js         — reads credentials from /data/options.json or .env
entities.js       — reads entity IDs from /data/options.json (HA addon) or frame14.json (local dev)
frame14.json      — local dev entity ID config (not used in HA addon)
openapi.js        — OpenAPI document + Swagger UI renderer
ha-socket.js      — persistent HA WebSocket: state cache, entity rooms, motion/album/media/football watchers. The media watcher routes to /marquee only for `media_content_type: movie` — episodes and live TV are ignored, and a marquee already up hands the panel back when playback rolls into one — so it fires on content-type changes as well as state changes; exports TRANSIENT_VIEWS (views never persisted as the last route). The football watcher routes every panel to /football on the flip to `IN` and back 5min after the last game leaves it (to /marquee instead if Plex is still playing). It also runs once after the cache prime: priming bypasses publishState, and a live game holds `IN` while only attributes change, so a restart at kickoff would otherwise miss the whole game. Also carries assist_pipeline runs, which are subscriptions rather than one-shot commands — pendingSubscriptions must be checked before the entity_id guard in the event branch, or every pipeline event is dropped
routes/
  health.js       — GET /api
  docs.js         — GET /api/docs, GET /api/docs/openapi.json
  weather.js      — GET /api/weather (entity IDs from entities.js)
  home.js         — GET /api/home/weather, GET /api/home/calendar
  climate.js      — GET /api/home/climate (fetches HA states for ENTITIES.climate array)
  energy.js       — GET /api/energy, /api/energy/monthly, /api/energy/yearly (entity IDs from entities.js)
  vacuum.js       — GET /api/home/vacuum (fetches HA states for ENTITIES.vacuums array)
  entities.js     — GET /api/entities (serves ENTITIES object to frontend)
  photos.js       — GET /api/photos/config|albums|albums/:id|asset/:id/thumbnail
  marquee.js      — GET /api/marquee/art (full-res poster from Plex via media_content_id when PLEX_URL/PLEX_TOKEN are set; falls back to proxying the media player's entity_picture from the HA state cache)
  assist.js       — GET /api/assist/config, GET /api/assist/tts/:id, plus attachAssistSocket() for the voice session
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
- `GET /api/energy` — solar production/consumption from HA (entity IDs from `ENTITIES.energy`). Today's kWh totals are the change in the lifetime meters since the end of yesterday when `lifetimeProduction`/`lifetimeConsumption` are set — the inverter's own "today" sensors drift and reset on the inverter's clock, so they are only the fallback
- `GET /api/energy/monthly?month=YYYY-MM` — daily production/consumption + running totals for a month (HA long-term statistics; each day is the difference between end-of-day lifetime readings, which the statistics `change` type cannot be used for — counter resets corrupt it); defaults to current month
- `GET /api/energy/yearly?year=YYYY` — monthly production/consumption + running totals for a year (daily stats summed per month); defaults to current year
- `GET /api/photos/config` — returns `{ defaultAlbumId }` from config
- `GET /api/photos/albums` — Immich album list
- `GET /api/photos/albums/:albumId` — assets in an album (images only)
- `GET /api/photos/asset/:assetId/thumbnail` — proxies Immich thumbnail (hides API key)
- `GET /api/marquee/art?v=<cachekey>` — poster art of the configured media player. With `PLEX_URL`/`PLEX_TOKEN` set it renders the poster at 1280x1920 through Plex's transcoder, keyed on the `media_content_id` (Plex ratingKey) from the HA state cache; otherwise it proxies the entity's `entity_picture`. The client never supplies a URL; `v` is ignored and exists only for cache busting
- `GET /api/assist/config` — resolves the configured Assist pipeline to a name + engines, or reports why voice is unavailable (`unknown_pipeline` / `ha_unreachable`); cached 60s
- `GET /api/assist/tts/:id` — proxies one reply's Piper audio from HA so the panel plays it from this origin (mixed content otherwise). The id is minted server-side; the client never supplies a URL
- `GET /api/change/:view` — broadcasts `change_view` to all Socket.IO clients
- `GET /api/videos/list` — lists `./videos/`
- `GET /api/docs` — Swagger UI

## Socket.IO

- Client emits `change` with a view name → server broadcasts `change_view` to all **other** clients
- Client emits `entity:subscribe` / `entity:unsubscribe` → joins/leaves Socket.IO room `entity:<id>`
- HA WebSocket pushes state updates → server fans out to `entity:<id>` rooms
- `GET /api/change/:view` broadcasts to **all** clients (used by HA automations)
- `SocketViewListener` navigates on `change_view` but ignores it on `/control`
- Voice assist: client emits `assist:start` (with ack), `assist:audio` (binary Int16LE PCM), `assist:audio_end`, `assist:cancel`; server emits `assist:event` (the HA pipeline event, with the TTS path swapped for an opaque `audioUrl`) and `assist:error`. The server adds `cue` (`"success"` / `"failure"` / `null`) to `intent-end`: a non-null cue means the panel plays a tone instead of the speech, and that turn's `tts-end` carries no `audioUrl`. Local intents are judged by their `response_type`; LLM turns by the tool results streamed in `intent-progress`, because an LLM agent labels every reply `action_done`. One run at a time across all clients
- `io` instance is passed to route handlers via `app.locals.io`

## Design Constraints (OLED)

> **On this branch (ui/chakra) the UI follows Chakra UI's native theme.** The OLED palette rules below —
> `#000000` background, no borders or dividers, the custom dim surface ladder — do **not** apply here: the page
> uses Chakra's own light/dark colours (dark is Chakra's near-black `bg`), card borders and shadows. The portrait
> layout guidance still applies.

**The frame is a portrait panel — 1600x2400.** Design every view portrait-first
and check it at that aspect before calling it done. A layout that reads well in
a landscape browser window can be unusable on the device: a horizontal row of
five elements that looks like a broadcast graphic on a desktop gets crushed into
1600px of width, because `vmin` is the *width* in portrait, so anything sized in
`vmin` that sits side by side is competing for the short axis. Prefer stacking
down the long axis, and use `@media (orientation: portrait|landscape)` to
re-flow rather than shipping one arrangement for both (`LandscapeNav`,
`PageShell` and `FootballScoreboard` all do this).

The height is the axis with room to spare. Views should fill it rather than sit
centred in a band of black — but fill it with *content*, scaling type and
artwork up to match. Stretching a saturated block down 2400px behind a couple of
lines of small text is the failure mode: it reads as sparse and it is the
burn-in case below. If a view cannot fill the height without doing that, the
sizes are wrong, not the layout.

**Look at the view before calling it done.** Layout bugs here are not subtle and
not catchable by reading the JSX — a horizontal arrangement that reads fine in
source is unusable at 1600x2400. Render it headlessly:

```bash
npx @puppeteer/browsers install chrome-headless-shell@stable
# Ubuntu needs the runtime libs and at least one font, or Chrome either refuses
# to start or renders every glyph blank — text silently disappears from the
# screenshot while the boxes still draw. Without root, `apt-get download` +
# `dpkg -x` into a scratch dir with LD_LIBRARY_PATH set works:
#   libatk1.0-0t64 libatk-bridge2.0-0t64 libxcomposite1 libxdamage1 libxfixes3
#   libxrandr2 libgbm1 libasound2t64 libatspi2.0-0t64 libxkbcommon0 libpango-1.0-0
#   libcairo2 libcups2t64 libnspr4 libnss3 libdrm2 libxrender1 libxi6 libxres1
#   fonts-dejavu-core  (copy the .ttf files to ~/.local/share/fonts)
```

Then drive the real server against a stub Home Assistant WebSocket (see
`src/CLAUDE.md` for the shape) and screenshot at `1600x2400`, plus `1920x1080`
to confirm landscape still works.

- Background is always `#000000`
- Avoid static bright elements — they cause burn-in
- No dividers or decorative borders
- Font: Chakra's default font stack (no webfont is loaded, so it resolves to the platform's system UI font)
- All sizes on `/clock` use `vw` units to scale to any portrait resolution
- `/clock` layout is portrait-optimised: clock fills the top, weather below

## Home Assistant Addon

- `config.yaml` — addon manifest (arch, ports, options schema including all entity ID fields)
- `CHANGELOG.md` — addon changelog, rendered in the Home Assistant addon UI
- `run.sh` — entry point; exports scalar env vars via bashio (arrays read directly from options.json by entities.js)
- `Dockerfile` — multi-stage build; copies `entities.js` and `frame14.json` into image
- `ha-automation.yaml` — example motion sensor automation

## Changelog (required for every user-visible change)

Home Assistant renders `oled-dashboard/CHANGELOG.md` in the addon's Changelog tab, so **always** update it — never leave a version bump undocumented.

1. Bump `version` in `oled-dashboard/config.yaml` (semver; patch for fixes, minor for features).
2. Add a new section at the **top** of `oled-dashboard/CHANGELOG.md`:
   ```markdown
   ## 0.33.0

   - Added: <what the user now sees or can do>
   - Fixed: <what was broken>
   - Changed: <behaviour that moved>
   ```
3. Heading must be `## <version>` matching `config.yaml` exactly — HA matches sections by version string.
4. Write entries user-facing: what changed on screen or in config, not which file was edited. Skip internal refactors that change nothing for the user.
5. If a change adds or renames a `config.yaml` option, say so explicitly — users must re-configure the addon.

## Adding API Endpoints

1. Add the route handler in the appropriate `routes/*.js` file (or create a new one)
2. Mount it in `index.js` — mount more-specific paths before less-specific (e.g. `/api/home/climate` before `/api/home`)
3. Document it in `openapi.js`

## Adding Entity IDs

1. Add the field to `frame14.json` for local dev
2. Add the field to `config.yaml` options + schema for the HA addon
3. Read it in `entities.js` from `options` (addon path) and export it on `ENTITIES`
4. Use `ENTITIES.yourField` in the relevant route handler
