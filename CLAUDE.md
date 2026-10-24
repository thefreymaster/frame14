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
| `WEB_UI_URL` | (Optional) Where the add-on's Open Web UI button and sidebar entry send the browser (`web_ui_url`; see "Home Assistant Addon") |

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

The `printer` field is the printer's status sensor entity ID: ha-bambulab's `sensor.xxx_print_status` or Bambuddy's `sensor.xxx_status`. The suffix picks the integration, and all sibling printer sensors (progress, temps, layers, …) are derived from its prefix with that integration's names in `src/lib/printerEntities.ts`; fields an integration lacks stay empty. Empty string disables the printer card.

In the HA addon, these are configured via the addon's Configuration tab (`light_entities`, `climate_entities`, `vacuum_entities`, `weather_entity`, `weather_forecast_entity`, `energy_*` including the optional `energy_lifetime_production`/`energy_lifetime_consumption`, `media_player_entity`, `printer_status_entity`, `team_tracker_entities` fields in `config.yaml`).

## Frontend Routes

| Path | Component | Description |
|---|---|---|
| `/` | redirect | → `/home` |
| `/clock` | `Clock` | Analog or digital clock (tap to switch): full-screen on the frame and phones, a card (`Board fill`, on the page's black / white) inside the page gutter on a desktop (`useDesktop`), like Photos and Radar |
| `/home` | `HomeOverview` | Overview: weather, climate, energy, calendar. Cards are rearrangeable and resizable per device (press and hold) — see `HomeBoard`. A tap on the weather card (whichever face it has) opens ForecastDialog |
| `/lights` | `Lights` | Light + switch tiles (tap toggles, press and hold a dimmable light for brightness / white / colour); header shows how many are on + All off |
| `/blank` | `Blank` | Pure black screen (motion off) |
| `/photos` | `Photos` | Immich photo slideshow: full-screen on the frame and phones, a card inside the page gutter (`surface` corners, edge) on a desktop. Plays the album in order (the server's, see `/api/photos/albums/:albumId`), each device resuming where that album left off (`lib/slideshow`); frame-only nav item |
| `/album` | `Album` | A remote's Photos (remote-only nav item, labelled Photos): the album picker and every photo in the album as a grid; the photo a frame is on is highlighted, and a tap shows it on the frames that are on /photos (one on another view starts from it when it next goes there); a pick never changes a view |
| `/radar` | `Radar` | Radar view — frame-only nav item; framed like Photos on a desktop (`useDesktop`), edge to edge elsewhere |
| `/timer` | `Timer` | Timer — frame-only nav item |
| `/marquee` | `Marquee` | Plex now-playing: poster art filling the screen, no overlay text; auto-routed. Movies only — an episode (`tvshow`) or live TV (`video`/`channel`) never routes here and shows "movies only" if you navigate in |
| `/printer` | `Printer` | The 3D printer: status badge (and HMS alert) in the header, the camera live (MJPEG via /api/printer/camera/stream), the job (model thumbnail, name, progress, layer, time left, finish time; Pause/Resume and a confirmed Stop while one runs) and the temperatures. Stacked in portrait, camera left in landscape. Entities derived from the configured status sensor (lib/printerEntities). Offered on remotes but off in their nav until turned on |
| `/vacuum` | `Vacuum` | The robot vacuums, one VacuumPanel each: state and controls (battery, this clean's progress, area / time / last run, suction, Clean·Pause·Resume / Dock / Locate), the map (an image entity via /api/home/vacuum/map/:id) and the wear parts. Core Roborock naming (lib/vacuum). Map left in landscape. Offered on remotes but off in their nav until turned on |
| `/football` | `Football` | Full-screen score bug + game detail; a preview before kickoff, a scoreboard during. Up all of game day (nav tab too); auto-routed on kickoff |
| `/control` | `Control` | Settings + remote control; device mode toggle (frame vs remote); the Navigation card (this device's nav: drag to reorder, show / hide; Home stays first, Settings stays shown) |

## UI system (Chakra UI v3, native theme)

The UI is stock Chakra UI v3 — `createSystem(defaultConfig, …)` in
`components/ui/provider.tsx` with only three additions: buttons (and segmented
controls) are fully rounded; a `bg.surface` colour (#23242b in dark mode, `bg.panel` in light) for every card and both floating navs; a `surface` radius (0.75rem) that the Card recipe
uses for every card and both floating navs share, and a `border.surface` colour
for their 1px edge (gray.200 / gray.700) (tiles inside cards set
`sm` themselves, except the thermostat tiles); and spacings `xs` (0.25rem), `sm` (0.5rem), `md` (1rem) and the semantic `gutter`: the gap
between cards and the page's padding around them, always equal — md, or sm under
the theme's `phone` condition (`PHONE_MEDIA` in lib/homeLayout, the
one-column screens). /home (HomeBoard), PageShell and /control use `gutter`;
`PAGE_GUTTER` in lib/navMetrics is its CSS var for the header and rail. Dialog backdrops also blur the page (`backdropFilter` on the dialog recipe's
backdrop). No other custom tokens, variants or global styles. Components are used with
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
    Clock.tsx                     — analog / digital clock (tap toggles, kept in localStorage `clockStyle`); `framed` (`useDesktop`) puts it in a `data-page-fill` gutter box holding a `Board fill bg="bg"` (the page's black / white, not the cards' grey), the analog face sized to the card (`min(100cqw, 100cqh)`) and the digital one padded by the card instead of HOME_HERO_INSET
    HomeOverview.tsx              — home overview page; builds the card map and hands it to HomeBoard, keyed by the column count (`useHomeColumns`: 4 / 2 / 1 from the media queries in lib/homeLayout)
    Lights.tsx                    — light/switch controls (entity IDs from useEntitiesConfig)
    Blank.tsx                     — black screen
    Photos.tsx                    — Immich slideshow; `framed` (`useDesktop`) wraps it in a `data-page-fill` gutter box with card corners. The photo on screen is tracked by id, advances in order (30s each, a tap, `next_photo`, the right arrow), is saved per album (`lib/slideshow`), and on a frame-mode device is reported to the remotes (`photo_shown`, null on leaving) and follows their picks. The time and temperature are Home's clock size (HERO_SIZE), FRAMED_PHOTOS_HERO_SIZE on a desktop. The eye button (hide the nav) isn't shown on a remote
    Album.tsx                     — a remote's photo grid: PageHeader with the photo count and AlbumSelect, then a Board holding PhotoGrid (Skeletons while loading, EmptyStates for no album / load failure / no photos)
    Radar.tsx                     — radar view (frame-only); a `data-page-fill` box, framed like Photos on a desktop
    Timer.tsx                     — timer (frame-only)
    Marquee.tsx                   — Plex now-playing poster, full-bleed with no metadata overlay; movies only (`isMovie`), hides nav on mount (local only), eye button restores it (no eye on a remote, whose nav never hides)
    Printer.tsx                   — /printer: PageHeader with the status Badge, then PrinterCameraCard beside (landscape) or above (portrait) PrinterJobCard + PrinterTempsCard; an EmptyState without a configured printer
    Vacuum.tsx                    — /vacuum: PageHeader, then a VacuumPanel per configured vacuum (maps from useVacuumMaps)
    Football.tsx                  — live game page; renders every game in the route window, "no game in session" when empty (auto-routed, so it never decides whether to show itself)
    Control.tsx                   — settings + remote; device mode toggle (frame vs remote), hides remote controls (the Views grid, which also puts the frames on Printer or Vacuum) when device is frame; NavLayoutBoard (this device's nav order and visibility) after Display
  components/
    Layout.tsx                    — wraps Outlet with SocketViewListener + PageTransition; renders the StatusBanner header and the nav, and pads the page clear of both (HEADER_CLEARANCE on top; the rail or bar) On a desktop (`useDesktop`) it also renders LightStrip and pads the page bottom by LIGHT_STRIP_CLEARANCE. The mic (VoiceAssistButton) goes into StatusBanner's `voice` slot on every device
    StatusBanner.tsx              — the header on every view, shown and hidden with the nav: fixed and full width, the page's own `bg` with no edge (attached, not floating — the user rejected the 0.61 floating bar), running up through the iPhone status-bar inset with its row HEADER_TOP down; the app icon (`/favicon-96x96.png`, status-icon size) and "Frame14" at the left; running appliances, connection icon, the `voice` slot (the mic) and, on a desktop only (`useDesktop`), HeaderClock at the right (the version is on /control)
    LightStrip.tsx                — desktop only: every configured light/switch as LightStripItem in one non-wrapping row along the bottom (FLOATING_SURFACE, from the rail's edge to the right gutter, bottom in line with the rail's), scrolls sideways with the scrollbar hidden; comes and goes with the nav
    LightStripItem.tsx            — one strip entry: an on/off Chakra Toggle drawn like a rail entry (bulb over name, ENTRY_RADIUS, the rail's selected fill while on, the bulb lit in the light's colour); every button LIGHT_STRIP_ITEM_WIDTH wide, the name on one line cut off with an ellipsis (`truncate`, full name in `title`); unavailable entities render nothing
    HeaderClock.tsx               — the header's "1:45 PM", the device's time: hours and minutes as NumberFlows in a NumberFlowGroup (two-digit minutes via `minimumIntegerDigits`, tens digit `max: 5`); checks each second, re-renders only when the minute changes
    LandscapeNav.tsx              — this device's nav (useNavItems: the entries /control shows, in its order, Football only on game day). The portrait bar holds five; a longer nav keeps its first five and puts the rest under NavMoreMenu (`splitForBar`). The rail shows them all, Settings at its foot when it ends the nav. Floating bottom bar (portrait: an opaque bar inset from the screen edges by one gap (NAV_BAR_INSET = NAV_BAR_BOTTOM: `xs` on an iPhone, 1rem elsewhere), Apple Music's tab bar without the glass; the page scrolls under it. On an iPhone, detected by a home-indicator inset, its top is flat with square corners and its bottom corners follow the screen's curve (SCREEN_RADIUS 62pt less the gap, NAV_BAR_BOTTOM_RADIUS); it is NAV_BAR_LIFT taller with that room under the entries, and its entries NAV_BAR_SIDE_ROOM further in, so the end labels (Home, Settings) clear the curve; the end entries' outer bottom corners are 1rem there (NAV_BAR_END_ENTRY_RADIUS). Elsewhere it has the cards' `surface` corners) + floating left rail (landscape: the same surface, from under the header to the bottom gap); in both, the selected entry's radius is `surface` less the border and padding, so the corners are concentric, each a Chakra Tabs list (`variant="subtle"`) whose triggers navigate on click; which entries a device can have is lib/navItems (`frameOnly`, `remoteOnly`)
    NavMoreMenu.tsx               — the bar's More: an entry styled from the Tabs context (useTabsStyles + the bar's entry css; not a tab, since a tab can't also trigger a menu), selected while the view on screen is one of its own, opening a Chakra Menu of the rest: the bar's surface, its right edge on the bar's and one bar-gap above it (getAnchorElement: the bar's rect raised by its side inset; overflowPadding 0 so a phone doesn't push it in), rows 2.75rem with the entries' concentric corners, the current view filled as in the bar
    NavLayoutBoard.tsx            — /control's Navigation card: Home (locked first and on), then the other entries as SortableNavLayoutRows (dnd-kit sortable, PointerSensor + KeyboardSensor, vertical only); Settings can move but not hide; the entries the bar puts under More are badged; Reset appears once the layout differs from the default
    NavLayoutRow.tsx              — one Navigation row: handle (a padlock on Home), icon, name, note, More badge, show Switch; a hidden entry is greyed
    SortableNavLayoutRow.tsx      — NavLayoutRow dragged by its handle (useSortable; the handle has touch-action none so only it starts a drag and the rest of the row still scrolls)
    PrinterCameraCard.tsx         — the printer's camera: a plain <img> on the MJPEG proxy in a 16:9 black well, spinner under it until frames cover it, "Camera unavailable" + Retry on error
    PrinterJobCard.tsx            — the job: cover thumbnail (/api/printer/cover?v=<image state>), name, progress figure + bar in the status palette, layer / remaining / finishes (the time-left sensor's last change plus it; "—" while paused), PrinterControls while active
    PrinterControls.tsx           — Pause / Resume and Stop (alertdialog first: a stopped print can't be resumed); presses the printer's button entities; a pressed button spins until the status changes (10s cap)
    PrinterTempsCard.tsx          — nozzle, bed (with targets, "off" when the target is 0°C / 32°F) and chamber (when the printer has the sensor) as Stats
    VacuumPanel.tsx               — one vacuum's cards in a grid (useVacuum): status, map, care; map on the left in landscape
    VacuumStatusCard.tsx          — name + state Badge (Charging while docked and charging), error Alert, battery figure + bar, the integration's finer status and since when, this clean's progress while out, area / time / last run, suction SegmentedControl (vacuum.set_fan_speed), Clean·Pause·Resume / Dock / Locate
    VacuumMapCard.tsx             — the map image entity in a 4:3 contain well (?v=<image state> refetches it when it changes), Live while out, a picker for several maps
    VacuumCareCard.tsx            — main brush, side brush, filter, sensors: hours left against Roborock's intervals, orange in the last tenth, red and full once overdue; header sums it up
    PageTransition.tsx            — fade+scale animation on route mount
    PixelShift.tsx                — slow pixel offset to prevent OLED burn-in
    SocketViewListener.tsx        — listens for change_view, navigates (skips /control; ignored entirely on a remote-mode device, which goes only where its user takes it — the user asked that kitchen-motion restores and other broadcasts never move the phone)
    AlbumSelect.tsx               — the slideshow album NativeSelect (HA's input_select.smart_frame_album options, named from Immich; POST /api/photos/config); on /control and /album
    PhotoGrid.tsx                 — /album's grid: square tiles of Immich's small thumbnails (`?size=thumbnail`, lazy), the frames' photo (`usePhotosShown`) ringed with an "On frame" badge, a tap calls `showPhoto`; scrolls to the frames' photo once per album
    WeatherForecast.tsx           — hourly forecast strip of Buttons; each opens ForecastDetailModal
    PhotoSlide.tsx                — full-bleed crossfade image slide
    MarqueeArt.tsx                — full-bleed poster, backgroundSize cover (absolute, not fixed — PageTransition leaves a transform on an ancestor)
    DoorbellCard.tsx              — front-door pop-up for 30s on the person sensor's rising edge (bottom right; above the lights strip on a desktop): CameraVideo, falling back to stills one at a time (/api/camera/snapshot, next asked after the last loads or fails), then a "Camera unavailable" overlay when nothing has shown
    CameraVideo.tsx               — the camera's live HLS: GET /api/camera/hls, then hls.js (dynamic import; MSE, lowLatencyMode) or native HLS; onPlaying / onFail (once: start error, fatal hls error, <video> error, or not playing within 15s)
    LightsSection.tsx             — a group of LightControl tiles (2 across on a phone, 3 on the frame / tablets, 4 in landscape) and the one LightDialog they open
    LightControl.tsx              — single light/switch tile (outline Card as a button): a round badge filled with the light's own rgb_color and the status ("80%" / "On" / "Off") across the top, the name below; an on tile is washed with its colour and filled from the left to the brightness. Tap toggles; press and hold on a dimmable light opens LightDialog
    LightDialog.tsx               — a dimmable light's controls (stock Dialog), laid out like the fan's: bulb in the light's colour, % and power Switch beside a vertical brightness Slider filled in the light's colour (sends on release); white presets if it does colour temperature, colour presets if it does colour
    LightsAllOffButton.tsx        — the Lights page header's action: turns off every light/switch that's on; spins until HA reports them off (10s cap)
    EnergySection.tsx             — energy card (coverage Progress, grid Badge) + detail modal (PanelDialog, Stats)
    PrinterSection.tsx            — 3D printer card (Progress) + click-to-open detail modal (PanelDialog: temps, layers, ETA, filament as Stats)
    PanelDialog.tsx               — shell of the detail modals: a stock Chakra Dialog with title, body and close button. `scrollBehavior="inside"` (a tall panel scrolls its body; the title and close stay put) and the positioner padded by the safe-area insets plus the gutter, content `maxH="100%"`: on an iPhone a full-height panel had its close button under the status bar, with no outside left to tap
    ForecastDetailModal.tsx       — one forecast period as a PanelDialog of Stats
    TeamTracker.tsx               — TeamTracker sports card; tapping a score bug opens /football; one chip per tracked team (matchup, kickoff time / live score with period + clock / final); renders only for PRE/IN/POST, hidden on BYE/NOT_FOUND. On a narrow card (container query, `NARROW`) the broadcast row re-flows to one team per row with the clock between. Card-sized rendering only — the game model is in `src/lib/teamTracker.ts`
    FootballScoreboard.tsx        — the /football score bug at scoreboard scale; same anatomy as TeamTracker's chip, its own vmin sizes (the card's are tuned for a bento tile)
    FootballDetail.tsx            — band under the scoreboard: full down & distance, last play, network/venue, records. Dim by design — it sits still for three hours
    VacuumSection.tsx             — vacuum card; renders only when a vacuum is active (cleaning/returning); shows name + cleaning progress %
    RadarSection.tsx              — Windy radar card, collapsible (`board-collapsed:radar`), above energy in both layouts; renders only while the current weather condition is rain (rainy/pouring/lightning-rainy/snowy-rainy); iframe is pointer-events none so it can't trap page scroll
    ClimateSection.tsx            — one compact tile per thermostat: a Card rendered as a button holding a Stat (name, mode icon, room temperature, status line). A unit that's on gets the dialog's ring, a 0.25rem border in `hvacPalette`'s ring colour, with the icon and status line in its accent ("Heating to 70°" with a pulsing icon while running, "Heat · set 70°" idle); an off unit is the outline card with a grey "Off" Badge; the tiles keep the Card recipe's `surface` corners, the same as the climate card's (the user's call, not concentric); columns come from the card's width (container query, `climateGridCss`); a tap opens ClimateDialog. While any unit is on (`isClimateOn`: any mode but off, so auto and dry count), the header carries ClimateAllOffButton
    ClimateAllOffButton.tsx       — the climate card's header action: sets every unit that's on to off; spins until HA reports them off (10s cap)
    ClimateDialog.tsx             — thermostat modal: a stock Chakra Dialog holding a draggable ThermostatDial, a SegmentGroup (Heat / Cool / Fan / Off) and a fan-speed Slider
    ThermostatDial.tsx            — ClimateDialog's Nest-style face: ring, live pulse, 120° tick arc in the mode's Chakra palette colour; with `control` the arc drags/taps and commits on pointerup. The one hand-drawn control (geometry in lib/thermostatArc.ts)
    FanSpeedSlider.tsx            — Chakra Slider over a climate entity's fan_modes, commits on release
    FanSection.tsx                — fan Buttons + modal (stock Dialog: vertical Slider for speed, Switch for power)
    VoiceAssistButton.tsx         — the mic, rendered from Layout into StatusBanner's `voice` slot on every device (no floating button since 0.61.1), so it hides with the nav: a square-cornered (`l2`) IconButton at the header's right, after the status icons and before the desktop clock
    VoiceAssistOverlay.tsx        — full-screen voice session UI, a stock Chakra Dialog, always mounted and open while a session runs; keeps the last live snapshot for the exit animation (listening / thinking / speaking / done / error); done swaps the mic for a checkmark. The reply is spoken (or a tone plays), not written — its text shows only when the audio couldn't play (`audioBlocked`)
    VoiceLevelRing.tsx            — mic level ring; writes transform in a rAF loop, never through React state
    VoiceStatusBoard.tsx          — read-only voice diagnostics on /control (DataList, Alerts)
    HomeBoard.tsx                 — /home's rearrangeable layout: one CSS grid of `columns` equal columns (4 desktop / landscape tablet, 2 frame portrait, 1 phone), each card spanning its saved width, packed by height with `usePackedRows`. Press-and-hold enters arranging; dnd-kit sorts the single list live in onDragOver (no sortable transforms — the grid re-packs and shows the landing spot), with a travel threshold so two cards don't flip back and forth; dashed lanes show the columns. Saves via lib/homeLayout; Done/Escape/90s idle leaves. DragOverlay and toolbar are portalled to body (PageTransition's transform would offset fixed elements)
    HomeCardSlot.tsx              — sortable grid item per card (`grid-column: span n`); inert (no listeners) outside arranging; carries the width picker while arranging on 2+ columns
    HomeCardWidthPicker.tsx       — the width SegmentedControl (¼ ½ ¾ Full / ½ Full) straddling a card's bottom edge; stops pointer and key events so it never starts a drag
    HomeCardFace.tsx              — card body + drag grip + stand-in for a card that is hidden right now (shown/hidden by CSS `:has`/`:empty`, see "Home layout" in src/index.css)
    HomeLayoutToolbar.tsx         — Reset / Done bar shown while arranging — a Chakra ActionBar that ignores outside presses and Escape (HomeBoard owns Escape)
    Board.tsx                     — stock Chakra Card (size sm below Chakra's md breakpoint, i.e. phones, with `--card-padding` cut further to spacing.3; md above; the theme's `surface` corners from the Card recipe, the same as both navs'; the tiles inside cards use the smaller `sm`, so none is rounder than its card, except the thermostat tiles, which keep `surface`) with an optional Collapsible header; collapse state persists in localStorage under `board-collapsed:<key>`; Collapsible animates open/close and rotates the chevron indicator; accepts ReactNode `title` so sections can show summary stats (event count, printer %, energy kW) when collapsed, an `onClick` (with a `label` for screen readers) that makes a non-collapsible card one big button (role, tab stop, Enter / Space, focus ring), and an `action` (a control at the right of the header, before the chevron); `bg` overrides the card's colour (and drops DARK_RAISED), used only by the framed clock. On a collapsible board only the title is the trigger button, stretched over the header with ::after, so the action isn't a button inside a button and a tap anywhere else still toggles
    HomeHeader.tsx                — /home's first card on the frame (two columns, not a desktop): the date, the clock and the weather now; once the weather has landed the whole card is a button (Board `onClick`) that opens ForecastDialog
    HomeWeatherCard.tsx           — /home's first card on a phone (one column), in place of HomeHeader: weather icon + temperature, condition + humidity, one row; no clock and no bird; a tap opens ForecastDialog. Same card id (`header`), so saved layouts keep its place
    HomeForecastCard.tsx          — /home's first card on a desktop (`useDesktop`), in place of HomeHeader (the header has the clock there): a collapsible Board (`weather`) titled Weather with today's H · L, the condition's icon and the temperature (7xl) with the words beside, then HourlyForecast. A container query shrinks the figures on a narrow (¼) card. A tap on the body (the header collapses) opens ForecastDialog. Same card id (`header`)
    ForecastDialog.tsx            — the forecast (PanelDialog): the weather now with today's H · L, HourlyForecast, DailyForecast; an EmptyState when the forecast entity answered with neither list. Each weather card renders it beside its Board, not inside: clicks in the portalled dialog would bubble through React to the card and reopen it
    HourlyForecast.tsx            — the next hours as columns in a subtle `sm` well (hour, icon, rain chance from RAIN_SHOWN_FROM, temperature); a container query drops the later hours in a narrow well (¼ card, phone)
    DailyForecast.tsx             — the days ahead as one grid of rows in a subtle `sm` well: day ("Today", then weekday), the day's icon (midday's, since WeatherKit stamps days at midnight), rain chance, low, a low-to-high bar on the whole list's scale with a blue-to-orange gradient sized to the track (so a cold day reads bluer), high; today's bar has a dot at the temperature now
    StatusChip.tsx                — ambient chip (Chakra Tag, `surface` variant) for the status strip and the bird detection
    skeletons/                    — per-card loading placeholders for /home, built from stock Chakra Skeleton: each is a card's body, shown under the card's real (collapsible) header while that card's `loading` flag from useHomeData is set. Thermostat, fan and chip counts come from /api/entities
    ui/                           — Chakra CLI snippets (close-button, color-mode, data-list, empty-state, native-select, provider, segmented-control, slider, status, switch, toaster, tooltip, toggle-tip)
  hooks/
    useWeather.ts                 — fetches /api/weather, refetches every 5min
    useDesktop.ts                 — a desktop: HOME_FOUR_COLUMN_QUERY and not a phone/Android user agent (`isMobileUserAgent` in lib/deviceMode; the kitchen frame is an Android tablet). Not device mode: desktop browsers default to frame mode. Photos and Radar are framed like cards there, and the header shows HeaderClock
    useHomeData.ts                — weather+climate+energy+calendar+people+printer+vacuum; climate polls /api/home/climate every 60s, energy polls /api/energy every 30s. Returns `loading` per data source (weather, climate, energy, calendar, fan, vacuum), true only until the first answer — the REST snapshot, or live socket states for every entity; energy waits for /api/energy. There is no page-wide loading state: /home renders the board at once and each card shows its own placeholder
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
    usePackedRows.ts              — masonry packing for a CSS grid: 2px auto rows, each child measured (ResizeObserver) and given `grid-row-end: span n`; used by HomeBoard. Measures `offsetHeight`, never getBoundingClientRect: /home mounts under PageTransition's scale-in, and a transformed measurement comes out short and eats the gap below the card
    useVoiceAssist.ts             — voice session snapshot + start/cancel (useSyncExternalStore over lib/voiceAssist)
    usePrinter.ts                 — the /printer page's live printer model: every printer entity (sensors + printerPartIds) through useEntities; time left in minutes whatever the unit; "offline" from Bambuddy's online sensor; cover version and camera presence
    useVacuum.ts                  — useVacuumMaps (GET /api/home/vacuum, the same query /home's vacuum card reads) and useVacuum(id, maps): the vacuum entity plus its Roborock sensors and maps, live
    useAssistConfig.ts            — fetches /api/assist/config, staleTime: Infinity
    useSocket.ts                  — socket.io-client connection status
    useReady.ts                   — reloads page on socket "ready" event (server restart)
    useRegionLuminance.ts         — samples top-left region of an image to determine dark/light
  lib/
    queryClient.ts                — TanStack QueryClient singleton
    socket.ts                     — socket.io-client singleton (connects to window.location.origin)
    lightsConfig.ts               — buildLightSections(ids): derives name (slug→title case) and icons (domain-based; a lit bulb while on) from entity IDs; no static registry
    lightModel.ts                 — what a light can do and shows: features from supported_color_modes, brightness %, its colour (rgb_color, amber fallback), white / colour presets and which one is live
    floatingSurface.ts            — FLOATING_SURFACE (the navs' and lights strip's fixed surface: the cards' `bg.surface` colour, `border.surface`, `surface` radius, shadow, NAV_PAD), ENTRY_RADIUS (their entries' concentric corners) and DARK_RAISED (dark-mode shade overrides for anything on gray.800: the cards)
    deviceMode.ts                 — localStorage key "device-mode"; values "frame" | "controller"; auto-detects from UA on first visit; getDeviceMode() / setDeviceMode(), and useDeviceMode() which re-renders when /control switches it
    navItems.ts                   — every nav entry in the default order (path, label, icons; `frameOnly`, `remoteOnly`, `remoteOff` (offered on a remote but off there until turned on: printer, vacuum), `gameDay` (Football)); HOME_PATH / SETTINGS_PATH; `navItemsFor(mode)`; `splitForBar` (≤ NAV_BAR_ENTRIES (5) all in the bar, else first five + More)
    navLayout.ts                  — this device's nav order and visibility, localStorage `nav-layout:<frame|controller>` (the modes offer different entries); written only once the user changes something, so untouched devices follow the defaults; normalised on read (unknown entries dropped, new ones added before a trailing Settings, Home first, Home and Settings shown); `useNavLayout`, `useNavItems(gameDay)`, save / reset
    printerEntities.ts            — the printer's sensor IDs from the configured status sensor, per integration (`printerEntityIds`), and its other entities (`printerPartIds`: online, HMS, cover image, camera, pause / resume / stop buttons), mirrored server-side by printer-entities.js
    printerIcons.ts               — MDI's printer-3d-nozzle (filled, outline) as react-icons IconTypes (GenIcon): the printer's nav entry, page and /home card
    printerStatus.ts              — the status sensor in words + palette (Bambuddy's upper-case gcode_state lower-cased, or ha-bambulab's), `isPrintActive`, `heaterOn`
    vacuum.ts                     — Roborock entity IDs from the vacuum's (`vacuumEntityIds`), state words + palette, suction names (gentle / off / custom left out), the wear parts and their intervals
    format.ts                     — `toMinutes` (duration sensors by unit), `fmtDuration`, `fmtClock`, `fmtWhen`, `sentenceCase`
    navVisibility.ts              — the frames' nav show/hide setting, synced over socket; setNavVisible broadcasts, setNavVisibleLocal does not (used by routes that auto-hide). Only frame-mode devices act on it: `useNavVisible` is always true on a remote, whose /control switch reads and sets the frames' value (`useFramesNavVisible`)
    slideshow.ts                  — Photos between devices: per-album position in localStorage (`photos-position:<albumId>`), `onPhotoPicked` (a frame saves a remote's pick as the position, then tells a mounted slideshow), `showPhoto` (a remote: `show_photo` only, no view change), `reportPhotoShown`, and `usePhotosShown` (the frames' photos from `photos_shown`)
    themeMode.ts                  — Auto / Bright / Dark preference storage and socket sync, mapped onto Chakra's light/dark colour mode by the provider; "auto" uses daylight window 07:00–19:00
    navMetrics.ts                 — `PAGE_GUTTER` (spacing.gutter, the page's padding around the cards and the gap between them, which the header icons and the rail also keep to); HEADER_TOP (iPhone status-bar inset + blur band, above the header's row) / HEADER_CLEARANCE (screen top to the header's bottom); nav bar height, side inset (= the bottom gap), bottom gap, the bar's iPhone shape (NAV_BAR_TOP_RADIUS / NAV_BAR_BOTTOM_RADIUS, NAV_BAR_LIFT, NAV_BAR_SIDE_ROOM, NAV_BAR_END_ENTRY_RADIUS, all switched on the home-indicator inset) and `NAV_BAR_CLEARANCE` (screen bottom to the bar's top) / rail width, shared by Layout, the header, the arranging bar and the Photos/Marquee eye button; LIGHT_STRIP_ITEM_WIDTH, LIGHT_STRIP_HEIGHT (the portrait bar's) and LIGHT_STRIP_CLEARANCE for the desktop lights strip
    hvac.ts                       — thermostat model shared by the climate card and modal: modes, hvac colours (Chakra palettes), action detection, `isClimateOn`, and the card's tile columns (`climateGridCss`)
    thermostatArc.ts              — geometry of the thermostat's 120° tick arc
    forecast.ts                   — RAIN_SHOWN_FROM (20%: rain chances below aren't shown) and `roundTemp`, shared by the hourly and daily forecasts
    weatherIcons.ts               — HA weather condition → react-icons element (day/night) and → words (`conditionLabel`)
    plexMedia.ts                  — Plex media_player attribute helpers: artUrl (cache-busted proxy URL), title/subtitle, elapsed + progress extrapolation, isMovie (the marquee's content-type gate, mirrored by the media watcher in ha-socket.js)
    teamTracker.ts                — the TeamTracker game model shared by the home card, /football and its nav item: attribute types, `sides()` (away-first split), `stateLabel()`, and the two visibility windows — `inWindow` (card: rolling 24h pre / 6h post) and `inRouteWindow` (route: the whole local day of the game, keyed on kickoff)
    callService.ts                — callService(entityId, service): emits entity:call socket event for light/switch domains; callLightService sends light.turn_on with brightness_pct and a colour (color_temp_kelvin or rgb_color, never both — ha-socket.js validates and rejects both)
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
printer-entities.js — the printer's camera, cover image and buttons, derived from ENTITIES.printer like src/lib/printerEntities.ts (keep in step)
ha-proxy.js       — HA pictures through the server's token: sendHaImage (image_proxy) and pipeHaMjpeg (camera_proxy_stream, aborted when the page lets go)
ha-socket.js      — persistent HA WebSocket: state cache, entity rooms, motion/album/media/football watchers. The media watcher routes to /marquee only for `media_content_type: movie` — episodes and live TV are ignored, and a marquee already up hands the panel back when playback rolls into one — so it fires on content-type changes as well as state changes; exports TRANSIENT_VIEWS (views never persisted as the last route). The football watcher routes every panel to /football on the flip to `IN` and back 5min after the last game leaves it (to /marquee instead if Plex is still playing). It also runs once after the cache prime: priming bypasses publishState, and a live game holds `IN` while only attributes change, so a restart at kickoff would otherwise miss the whole game. Also carries assist_pipeline runs, which are subscriptions rather than one-shot commands — pendingSubscriptions must be checked before the entity_id guard in the event branch, or every pipeline event is dropped
routes/
  health.js       — GET /api
  docs.js         — GET /api/docs, GET /api/docs/openapi.json
  weather.js      — GET /api/weather (entity IDs from entities.js)
  home.js         — GET /api/home/weather, GET /api/home/calendar
  climate.js      — GET /api/home/climate (fetches HA states for ENTITIES.climate array)
  energy.js       — GET /api/energy, /api/energy/monthly, /api/energy/yearly (entity IDs from entities.js)
  vacuum.js       — GET /api/home/vacuum (fetches HA states for ENTITIES.vacuums array, each with its maps from the state cache), GET /api/home/vacuum/map/:entityId
  printer.js      — GET /api/printer/camera/stream, GET /api/printer/cover
  entities.js     — GET /api/entities (serves ENTITIES object to frontend)
  photos.js       — GET /api/photos/config|albums|albums/:id|asset/:id/thumbnail
  marquee.js      — GET /api/marquee/art (full-res poster from Plex via media_content_id when PLEX_URL/PLEX_TOKEN are set; falls back to proxying the media player's entity_picture from the HA state cache)
  camera.js       — GET /api/camera/hls (WebSocket camera/stream, format hls → our proxy URL), GET /api/camera/hls/:token/*file (HA's HLS files only: playlists, init.mp4, segment/<n>[.<part>].m4s; only _HLS_msn/_HLS_part forwarded; no bearer), GET /api/camera/snapshot (camera_proxy), GET /api/camera/stream (camera_proxy_stream MJPEG, unused by the client: HA builds it from stills, which an RTSP-only Generic camera lacks)
  assist.js       — GET /api/assist/config, GET /api/assist/tts/:id, plus attachAssistSocket() for the voice session
  ingress.js      — not under /api: index.js serves it alone on INGRESS_PORT. Every request gets a page that moves the whole tab (`window.top.location.replace`) to `web_ui_url`, or says how to set it
  views.js        — GET /api/change/:view (broadcasts change_view via io from app.locals)
  videos.js       — GET /api/videos/list, GET /videos/:file
```

## API Endpoints

- `GET /api` — health check
- `GET /api/entities` — returns entity ID config (from options.json or frame14.json)
- `GET /api/weather` — current weather + forecast from HA (entity from `ENTITIES.weather`)
- `GET /api/home/weather` — weather used by HomeOverview: current state, temperature and unit, humidity, `forecast` (next 8 hours) and `forecastDaily` (up to 10 days from today: today's gives the cards their high and low, the rest are the forecast dialog's), from two weather.get_forecasts calls; a failing forecast leaves only its list empty
- Both weather routes fail only when the current-conditions entity does: a failing `get_forecasts` on the forecast entity is logged and leaves the forecast empty (the Photos/Clock temperature must not depend on it)
- `GET /api/home/climate` — climate states for all entities in `ENTITIES.climate`
- `GET /api/home/vacuum` — vacuum states for all entities in `ENTITIES.vacuums` (state, cleaning_progress, battery_level — both attributes gone from recent HA, so /vacuum reads the Roborock sensors instead) and `maps`: the image entities named after each vacuum (`image.<vacuum>_<map>`)
- `GET /api/home/vacuum/map/:entityId` — one of those maps (HA image_proxy); any other ID is a 404
- `GET /api/printer/camera/stream` — the printer camera's MJPEG (HA camera_proxy_stream of `camera.<printer>_camera`); `GET /api/printer/cover` — the job's model thumbnail (the cover image entity). Both derive the entity from the configured printer, never from the client
- `GET /api/home/calendar` — today + tomorrow calendar events from all HA calendars
- `GET /api/energy` — solar production/consumption from HA (entity IDs from `ENTITIES.energy`). Today's kWh totals are the change in the lifetime meters since the end of yesterday when `lifetimeProduction`/`lifetimeConsumption` are set — the inverter's own "today" sensors drift and reset on the inverter's clock, so they are only the fallback
- `GET /api/energy/monthly?month=YYYY-MM` — daily production/consumption + running totals for a month (HA long-term statistics; each day is the difference between end-of-day lifetime readings, which the statistics `change` type cannot be used for — counter resets corrupt it); defaults to current month
- `GET /api/energy/yearly?year=YYYY` — monthly production/consumption + running totals for a year (daily stats summed per month); defaults to current year
- `GET /api/photos/config` — returns `{ defaultAlbumId }` from config
- `GET /api/photos/albums` — Immich album list
- `GET /api/photos/albums/:albumId` — assets in an album (images only), in the album's order: Immich albums have no order of their own beyond date taken, newest first unless the album is set to oldest first (`order: "asc"`), which is what Immich shows. Sorted on `fileCreatedAt` here because metadata search ignores the album's setting
- `GET /api/photos/asset/:assetId/thumbnail` — proxies Immich thumbnail (hides API key); `?size=thumbnail` for Immich's small one (the remote's grid), the 1440px preview otherwise
- `GET /api/marquee/art?v=<cachekey>` — poster art of the configured media player. With `PLEX_URL`/`PLEX_TOKEN` set it renders the poster at 1280x1920 through Plex's transcoder, keyed on the `media_content_id` (Plex ratingKey) from the HA state cache; otherwise it proxies the entity's `entity_picture`. The client never supplies a URL; `v` is ignored and exists only for cache busting
- `GET /api/camera/hls` — starts/joins HA's live HLS stream of the configured camera and returns the master playlist under `/api/camera/hls/<token>/…`, which proxies HA's `/api/hls/<token>/…` files (allow-listed) for the browser
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
- `SocketViewListener` navigates on `change_view` but ignores it on `/control`, and always on a remote-mode device. The motion watcher re-broadcasts the last route on every kitchen motion `on`, so a remote that followed it was yanked back to that view every time someone walked past
- `nav_visibility` is the frames' setting: remote-mode devices relay it (the /control switch) but keep their own nav up
- Photos: a frame-mode slideshow emits `photo_shown` (asset id, or null when it leaves); the server keeps one per socket (dropped on disconnect) and sends everyone `photos_shown` (the distinct ids), also on connect. A remote's grid emits `show_photo` `{ albumId, assetId }`, which the server broadcasts to the others; frames save it as the album's position and a slideshow on screen jumps to it. No view change goes with it
- Voice assist: client emits `assist:start` (with ack), `assist:audio` (binary Int16LE PCM), `assist:audio_end`, `assist:cancel`; server emits `assist:event` (the HA pipeline event, with the TTS path swapped for an opaque `audioUrl`) and `assist:error`. The server adds `cue` (`"success"` / `"failure"` / `null`) to `intent-end`: a non-null cue means the panel plays a tone instead of the speech, and that turn's `tts-end` carries no `audioUrl`. Local intents are judged by their `response_type`; LLM turns by the tool results streamed in `intent-progress`, because an LLM agent labels every reply `action_done`. One run at a time across all clients
- `entity:call` takes `vacuum` (start, pause, return_to_base, locate, set_fan_speed with a shape-checked `fan_speed`) for the configured vacuums only, and `button.press` for the configured printer's pause / resume / stop buttons only (`deviceControlData` in ha-socket.js): those domains reach further than the domain + service allow-list can tell apart
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
- Ingress (`ingress: true`, `ingress_port: 8099`) is only a doorway: HA's Open Web UI button and the sidebar entry load the add-on in an iframe under `/api/hassio_ingress/<token>/`, and the dashboard can't run under that prefix (root-relative assets, API and socket). So index.js listens on `ingress_port` (read from config.yaml by `config.js`, add-on only) with `routes/ingress.js`, which sends the tab on to the `web_ui_url` option. With `host_network: true` that port is on the HA host itself; nothing listening there is what gave the Cloudflare "Bad gateway" before 0.60.0
- `CHANGELOG.md` — addon changelog, rendered in the Home Assistant addon UI
- `run.sh` — entry point; exports scalar env vars via bashio (arrays read directly from options.json by entities.js)
- `Dockerfile` — multi-stage build; the runtime stage copies the server's root files **by name** (plus `routes/`), so a new root module (e.g. `ha-proxy.js`, `printer-entities.js`) must be added to that COPY line or the add-on dies on start
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
