# CLAUDE.md

Guidance for Claude Code in this repository. It describes how Frame14 works now and the rules to keep; the history is in `frame14/CHANGELOG.md` and git. `frame14/src/CLAUDE.md` holds the football subsystem's own invariants.

Frame14 is a Home Assistant add-on: a dashboard for a 1600x2400 portrait Android tablet on the kitchen wall (the **frame**, in Fully Kiosk Browser) and for phones and desktops (**remotes**). Everything lives in `frame14/` (the add-on folder); commands below run there.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server (port 3000, proxies /api and socket.io to :4000)
node index.js        # Express server (port 4000)
npm run build        # tsc -b (the app, vite.config and the tests) + Vite build + scripts/precompress.mjs
npm run lint         # ESLint — must stay at zero errors and zero warnings
npm run preview      # Preview the production build
npm test             # Vitest, client + server projects, once
npm run test:watch   # The same, re-run as files change
npm run test:e2e     # Playwright — `npm run build` first; `npx playwright install chromium` once
npm run stub         # The stub Home Assistant alone, on :8310 (STUB_PORT to move it)
```

Full-stack development: `npm run dev` and `node index.js` together.

## Process and releases

- **Every user-visible change gets a test with it** (a lib a unit test, a route a supertest one, a page an e2e spec or a step in one) and the checks must be green. Show a new test fails without the fix when it can (revert the fix, run it, put it back) — a test that can't fail proves nothing.
- `npm run lint` stays clean; fix the code rather than suppressing a rule. The `react-hooks` rules are the React Compiler's own checks — a component that fails one is one the compiler skips.
- **The user pushes to main directly until 1.0.0** (not yet: "I'm not ready for 1.0.0"). Commit or push only when asked; work on a branch and fast-forward main when told to push. The 1.0.0 plan: the "Protect The Main" ruleset (already: no deletion, no force push) gains a pull-request rule (no approvals — one maintainer — any merge method) and three required status checks — "Lint and build" (build.yml), "Unit tests" and "End-to-end tests" (test.yml), GitHub Actions' app id 15368, branch not required to be up to date. Ruleset changes are the user's to make (an agent's attempt was blocked).
- CI: `.github/workflows/build.yml` (lint + build, Node 24), `test.yml` (`unit`; `e2e` with `npx playwright install --with-deps chromium`, the report uploaded on failure), `release.yml` (on a push to main, publishes `v<version>` with the CHANGELOG section as notes when that release doesn't exist yet; a push without a bump does nothing).

### Changelog (every user-visible change)

Home Assistant renders `frame14/CHANGELOG.md` in the add-on's Changelog tab, and the section is also the GitHub release's notes.

1. Bump `version` in `frame14/config.yaml` (semver: patch for fixes, minor for features). Unrelated requests in one sitting may share one version (the user's word), one bullet each.
2. Add `## <version>` at the top — exactly config.yaml's string; HA matches on it.
3. Bullets `- Added:` / `- Changed:` / `- Fixed:`, user-facing (what changed on screen or in config, not which file), readable on their own. Skip internal refactors.
4. Say so explicitly when a `config.yaml` option is added or renamed.

## Tests

Vitest (`vitest.config.ts`: a jsdom client project and a node server project; `TZ` pinned to America/New_York, `__APP_VERSION__` defined; the client project runs the React Compiler as the build does) and Playwright (`playwright.config.ts`).

- **`tests/unit/`** (jsdom) — `src/lib` on real values, and component tests rendered by `tests/unit/helpers/render.tsx` under Chakra's defaultSystem, with `useEntity` / `useEntities`, `callService` and the toaster mocked through `vi.mock` + a `vi.hoisted` state object. `tests/setup-dom.ts` runs before React loads (an AnimationEvent stub: jsdom has none, and without it React listens for WebKit-prefixed animation events, so `fireEvent.animationEnd` reaches no `onAnimationEnd`). `tests/setup.ts`: jest-dom, matchMedia / ResizeObserver / scrollIntoView polyfills, localStorage cleared after each test. Modules with state at load (themeMode, ha-areas, theme) get a fresh module per case (`vi.resetModules` / `vi.doMock`).
- **`tests/server/`** (node) — routes through supertest with `config.js`, `entities.js`, `ha-socket.js`, `ha-areas.js` mocked as needed; the pure modules directly (`FRAME14_DATA_DIR` a temp dir); `openapi.test.js` fails an undocumented route; `ha-socket.test.js` drives the real module against the stub in-process on :8399 (fan-out, sendCommand, every callService refusal, the watchers).
- **`tests/stub/stub-ha.mjs`** — the stand-in Home Assistant, REST + WebSocket on one port: the house's states (lights, thermostats, power, a printer in both integrations' names, a vacuum, fans, TeamTracker, cameras, an Unraid server, the add-on's `update.frame14_update`), the registries, forecasts, calendars, statistics, `update/release_notes`. Service calls change states and push `state_changed`. As a module `createStub({ port })` (`setState`, `pushEvent`, `reset`, `setServiceBehaviour`, `close`); test-only endpoints `POST /_stub/state`, `/_stub/service` (`delay_ms`, `fail: { id: why }`, `silent: [ids]`), `/_stub/registry` (move an entity to an area, with the event), `/_stub/reset`. `tests/stub/frame14.test.json` is the entity config under test (`FRAME14_CONFIG` names it), `lightAreas` Living Room / Kitchen / Outside.
- **`tests/e2e/`** — the stub on :8310 and `node index.js` on :4110 (`ports.ts`), one worker (the specs share one stub; every spec that changes state calls `resetStub` in beforeEach), two projects: `desktop` (Desktop Chrome 1920x1080 — a frame, by default) and `phone` (Pixel 7 — a remote, by its Android UA). Specs by area: api, pwa, home (cards live, arranging, the Lights card), lights, climate, fans, energy, cameras, doorbell, control (Settings' cards, theme, software update flow, screen), automation (`/api/change`, `/api/screen` reaching a stubbed `window.fully`), nav, tabs (sub-routes), modals (sheet / dialog / side panel, blur, swipe), corners and cards (sweeps over every page), unraid, origin (cross-site refusal), halloween (`page.clock.setFixedTime`). State the server keeps across tests (`io.currentView`, the theme) must be put back in `finally` / afterEach.
- **`tests/e2e/helpers.ts`**: `stub()`, `resetStub()`, `pageErrors()`, `lightTile()`, `lightButtons()` (a camera full screen's light buttons in order), `splashGone()`, `dialReading(scope)`, `cornersRounderThanConcentric()`, `squareInsideRings()`.

Gotchas the suite has hit:
- The page under an open drawer is `aria-hidden`: getByRole can't see it — locate by attribute (`[data-light-entry][aria-label="…"]`).
- A dial's number is a NumberFlow that names itself through ElementInternals; getByText / getByRole don't see it — poll `dialReading`.
- PageTransition's scale-in (and a modal's) draws every box a little short and off: wait for the animations' `finished` (or poll) before measuring.
- The launch splash covers the page for about a second after a route mounts; a locator's click waits for it, a `page.mouse` gesture doesn't — `await splashGone(page)` first.
- zag machines (Collapsible, Switch, Slider) change state a tick after the event: `waitFor` / poll. A controlled Switch's hidden input can lag its control under act; read the control's `data-state`. A slider thumb is found by its `aria-label` attribute (its aria-labelledby points at nothing; it is `visibility: hidden` in jsdom).
- The React Compiler memoises: a static mock of `useEntity` doesn't re-render a tile — mock it as a small store the components subscribe to.
- jsdom has no layout: no tabbability (focus traps land on the content — check focus in e2e), no rects (mock `getBoundingClientRect`).
- Playwright's touchscreen only taps; a swipe is CDP `Input.dispatchTouchEvent`. Safe-area insets: CDP `Emulation.setSafeAreaInsetsOverride` (index.html has `viewport-fit=cover`).
- zag's presence hears a modal's exit animation end only a frame after the close; a test that finishes the animation sooner leaves the closed modal in the DOM.
- Rebuild after bumping config.yaml's version, or the run shows the "new version" toast.
- Chakra quirks: SimpleGrid takes `templateColumns` or `columns`, never both (an undefined templateColumns still overrides columns' template); a `Tabs.Content` given `display: flex` needs `&[hidden]` set back to none.
- Anything that reads html's `data-safari-bar` reads it at render, not module load (main.tsx sets it after the modules run).

Locally Playwright's Chromium needs `LD_LIBRARY_PATH` at the preview tooling's extracted libs (`~/.cache/frame14-ui-tools/chrome-libs/root/usr/lib/x86_64-linux-gnu`, the lib folder, not chrome-libs itself).

### Look at the view before calling it done

Layout bugs here aren't visible in JSX. Run the stub and the built server on free ports — `STUB_PORT=8311 node tests/stub/stub-ha.mjs` and `PORT=4111 HA_URL=http://127.0.0.1:8311 HA_TOKEN=x FRAME14_CONFIG=tests/stub/frame14.test.json node index.js` (after `npm run build`; set `FRAME14_DATA_DIR` to a scratch folder) — and screenshot with the project's Playwright at **1600x2400 with an Android user agent** (the frame: `useDesktop` and the drawers go by the UA), 1920x1080, and a phone (Pixel 7). The machine has DejaVu only, so weights under 400 render regular: to judge a light weight, `npm pack @fontsource-variable/inter` into a scratch folder, `page.route` a path to its `files/inter-latin-wght-normal.woff2`, and add `@font-face { font-family: Inter; src: url(<path>); font-weight: 100 900 }` in an init script.

## Architecture

**Client** (`src/`) — Vite + React 19 + TypeScript, compiled with the React Compiler (`babel-plugin-react-compiler` via `@rolldown/plugin-babel` and `@vitejs/plugin-react`'s `reactCompilerPreset`, in vite.config.ts and vitest.config.ts alike). react-router 8, TanStack Query, Chakra UI v3. TypeScript stays at 6.x (typescript-eslint's peer range) and `@types/node` at 24 (the runtime). Entry `src/main.tsx`: Provider (Chakra + colour mode) + QueryClientProvider + Toaster. `dist/` is served by Express.

**Server** (`index.js`) — Express 5 + Socket.IO, plain JavaScript (ESM). `config.js` reads credentials, `entities.js` the entity config, `routes/*.js` are mounted in `index.js`, `openapi.js` documents them (Swagger at `/api/docs`). One persistent WebSocket to Home Assistant (`ha-socket.js`) holds the state cache and fans states out to Socket.IO rooms.

**Docker / add-on build** — the Home Assistant host builds the image. The builder runs `npm run build` under `NODE_OPTIONS=--max-old-space-size=1024` (`tsc -b` over src + tests needs ~1 GB; when it runs out again, raise the cap — the user prefers that to splitting the typecheck out). The runtime stage copies the server's root files **by name** (`COPY index.js config.js entities.js …` plus `routes/`): a new root module must be added there or the add-on dies on start. `npm install --omit=dev` brings the server's deps (`@mdi/svg` among them).

## Configuration

### Credentials (`config.js`)
`/data/options.json` (the add-on) → `.env` (local; see `.env.example`).

| Variable | |
|---|---|
| `HA_URL` / `HA_TOKEN` | Home Assistant URL and long-lived token (an admin's: the Software card reloads the store) |
| `IMMICH_URL` / `IMMICH_API_KEY` | Optional; without both `PHOTOS_ENABLED` is false and the Photos pages are left out |
| `PLEX_URL` / `PLEX_TOKEN` | Optional full-res marquee posters; the URL must be the `plex.direct` hostname (a bare IP fails TLS). Without them, HA's 200x300 thumbnail |
| `PORT` | Express port (4000) |
| `ASSIST_PIPELINE_ID` / `ASSIST_SPEAKER` | Optional Assist pipeline (empty: HA's preferred) and a `media_player` to speak replies on |
| `WEB_UI_URL` | Where the add-on's Open Web UI button sends the browser |

`config.js` also exports `REPO_URL` (config.yaml's `url`), `ADDON_NAME` (the manifest's `name`) and the ingress port.

### Entity IDs (`entities.js`)
`/data/options.json` → `frame14.json` (local) or the file `FRAME14_CONFIG` names. Exported as `ENTITIES`.

```json
{
  "lights": ["light.living_room", "switch.sonoff_xxx"],
  "lightAreas": ["Living Room"],
  "weather": { "current": "weather.x", "forecast": "weather.x", "temperature": "sensor.x" },
  "climate": ["climate.samsung_airconditioner_1"],
  "climateNames": { "climate.samsung_airconditioner_1": "1st Floor AC" },
  "energy": { "currentProduction": "…", "currentConsumption": "…", "productionToday": "…", "consumptionToday": "…", "lifetimeProduction": "…", "lifetimeConsumption": "…" },
  "circuits": { "main": "…", "balance": "…", "items": ["…"] },
  "vacuums": ["vacuum.roborock_q5_pro"],
  "fans": ["fan.x"],
  "mediaPlayer": "media_player.plex_xxx",
  "printer": "sensor.a1_xxx_print_status",
  "teamTracker": ["sensor.teamtracker_fsu"],
  "person": "binary_sensor.front_porch_person_detected",
  "camera": "camera.front_porch_high",
  "cameras": ["camera.x"],
  "motion": "binary_sensor.kitchen_motion_sensor_motion",
  "route": "input_select.oledos_route",
  "album": "input_select.smart_frame_album",
  "lightAllOffExclude": ["light.aidens_hatch_light"],
  "calendarExclude": ["calendar.radarr"]
}
```

The add-on options are config.yaml's snake_case names (`light_entities`, `climate_names` as a list of `{ entity, name }`, `printer_status_entity`, …), mapped in entities.js. Nothing about the house is hard-coded: a helper or list left empty turns its feature off. config.yaml's defaults are this house's values, so an update needs nothing set (the Supervisor merges new defaults in).

- `light_areas`: Home Assistant areas whose lights are all included (ha-areas.js); the Lights page groups everything by room.
- `climate_names` labels a thermostat in place of its `friendly_name` (the LocalThings Samsung entities are named after their devices); both `routes/climate.js` and `mapClimateState` (useClimate) apply it.
- `printer` is the status sensor: ha-bambulab's `sensor.xxx_print_status` or Bambuddy's `sensor.xxx_status`. The suffix picks the integration and every sibling entity is derived from the prefix (`src/lib/printerEntities.ts`, mirrored by `printer-entities.js` — keep them in step). Empty disables the printer.
- Server-kept state (screen.json, theme.json) lives in `FRAME14_DATA_DIR`, else the add-on's `/data`, else `.data/` here (gitignored).

## Pages

| Path | Route | What it is |
|---|---|---|
| `/` | redirect | → `/home` |
| `/home` | HomeOverview | The rearrangeable card board (HomeBoard): weather, climate, energy, calendar, the Lights card (this device's favourites, else the lights that are on), fans, and active-only cards (printer, vacuum, radar while raining, football around game day). A tap on the weather card opens WeatherDialog |
| `/clock` | Clock | Analog / digital (tap switches, `clockStyle` in localStorage); full-screen on the frame and phones, a framed card on a desktop |
| `/lights` | Lights | A Favorites card across the top, then a collapsible card per room (Home Assistant's areas), "Other lights", "Switches"; header: count + All off; each group: its own All off and a lit icon while one is on |
| `/climate` | Climate | The thermostats as ClimateTiles in one board (square on a phone, `lg` on the frame and desktop); header count + All off |
| `/energy`, `/energy/:tab` | Energy | Now card (PowerFlow) over tabs Solar (Today + month/year history) and Circuits; `/solar`, `/power`, `?tab=` redirect |
| `/weather`, `/weather/:tab` | Weather | Now card over tabs Hourly / Daily / Radar on a phone and the frame; on a desktop no tabs — a grid with the radar at the bottom (`/weather/radar` scrolls to it); `/radar` redirects |
| `/calendar` | Calendar | 14 days of agenda cards |
| `/photos` | Photos | Immich slideshow (frame); resumes per album (lib/slideshow); reports the photo on screen to remotes |
| `/album` | Album | A remote's Photos: the album grid; a tap shows that photo on the frames |
| `/printer` | Printer | Status, camera (MJPEG), job, temperatures, chamber light; Pause / Resume / confirmed Stop |
| `/vacuum` | Vacuum | Per vacuum: status and controls, map, wear parts |
| `/cameras` | Cameras | Every camera, the printer's, and vacuum maps; full screen with the room's lights as header buttons |
| `/unraid` | Unraid | Read-only: the server's CPU / memory / figures, its VMs and containers; nav entry only while HA has a server |
| `/football` | Football | Score bug + detail all of game day; auto-routed on kickoff (see src/CLAUDE.md) |
| `/marquee` | Marquee | Plex movie poster full-bleed; auto-routed; movies only |
| `/halloween` | Halloween | Full-bleed greeting; offered Oct 30–31 only (nav entry, Settings' Navigation row, a remote's Views tile), routed all year |
| `/timer` | Timer | Frame-only |
| `/blank` | Blank | Black screen (motion off) |
| `/control`, `/control/:tab` | Control | Settings + remote: tabs Views (remote only), Display, Device; `/control` lands on the first tab the device has |

A page's tabs are always its sub-routes (the user's rule), changed with `navigate(…, { replace: true })`; a bare or unknown tab is a `<Navigate replace>`. Layout, the nav and SocketViewListener read the page through `pageOf` (lib/pagePath).

## UI system (Chakra UI v3, native theme)

Stock Chakra v3 (`createSystem(defaultConfig, …)` in `components/ui/provider.tsx`) with only these additions: buttons, segmented controls and progress bars fully rounded; progress in a `brand` palette (#18a0ff, the app icon's blue) by default; `bg.surface` (#1C1C1E-ish card grey in dark mode, `bg.panel` in light) for every card and both navs, `border.surface` for their 1px edge, the `surface` radius (0.75rem); spacings `xs` / `sm` / `md` and the semantic `gutter` (card gap = page padding: md, sm on one-column phones — `PHONE_MEDIA`); the palette tokens below; a toast recipe that keeps `bg.panel` / `fg` with a 1px border in the type's colour. No other custom tokens, variants or global styles. Use components with their built-in variants, sizes and `colorPalette`s.

- **One scale knob**: `src/index.css` sets `html { font-size: clamp(16px, 1.75vmin, 32px) }` (28px on the frame). Size with Chakra's scales (`textStyle`, `p`, `size`), never px or vmin — `vmin` only in full-bleed drawn views (football, Halloween). The rest of index.css is layout: the full-height shell, `touch-action: pan-x pan-y` (no zoom), Safari's document scroll, /home's hide-when-empty rules.
- **Colour from tokens**: semantic tokens or a `colorPalette`; in raw CSS strings (SVG strokes) the variable, `var(--chakra-colors-orange-solid)`. **Never a hex**: the palettes (lib/themePalettes: Gray, Slate, Sand, by `<html data-palette>`) redefine the gray scale and `neutral.paper` / `ink` / `card` in provider.tsx, so anything on gray follows. Each keeps Chakra gray's OKLCH lightness per step (contrast holds; themePalettes.test checks). Palette values are mode-independent — nested `_dark: { _slate }` doesn't compile in Chakra's token CSS.
- **Cards**: Board (Card at `size` sm on phones, md above), `surface` corners, the navs' `lg` shadow (SURFACE_SHADOW). **Concentric corners**: a box inside a card has its container's radius less the gap, never under `sm` — with the cards' padding that's `sm` for every tile. A ringed tile (a lit thermostat or fan: 1px border + inset shadow, `tileRing`, TILE_RING_WIDTH) is `sm` plus the ring, so the ring's inner edge is `sm`. corners.spec checks every page.
- **Modals: every modal is a `Modal`** (`import * as Modal from "./Modal"`, written like Chakra's Dialog parts). On a phone and the frame (useBottomDrawer = !useDesktop) a bottom sheet: as tall as its content, never full height, `surface` top corners, swipe down to close (`useSwipeToClose`; SWIPE_IGNORE controls and `[data-swipe-ignore]` keep their gestures), `will-change: transform`. On a desktop a centred dialog; `side` makes it a drawer from the right edge floating a gutter in (PanelDialog: the energy and weather details only); `full` is a full-screen Dialog everywhere (CameraDialog). Control modals (light, fan, thermostat), confirmations and the voice overlay stay centred dialogs on a desktop — a desktop bottom sheet was considered and rejected. A modal's close button is the header mic's shape (IconButton subtle, xs, `l2`, IoClose) in the title's row.
- **Backdrop blur**: 2px ("minimal and subtle"), only under `<html data-backdrop-blur>`, which main.tsx sets from `blursModalBackdrop` — no "Android" in the UA. **Never give a blur to Android**: the frame's WebView recomputed a full-screen backdrop-filter on every frame of a slide and the drawers lagged. A positive flag on purpose: without it, no blur. The header's and navs' small frosted strips are fine.
- **Theme** (lib/themeMode, useThemeMode): two themes. The frames' (Auto · Device · Bright · Dark + palette) is synced through the server (theme.js keeps it) and worn by every frame-mode device — the Display card's ThemeFields. A remote wears its own (`local-theme-*`, never sent) — the Device tab's AppearanceBoard; switching device mode switches which is worn live. Auto is 07:00–19:00 by the panel's clock; Device follows `prefers-color-scheme`. provider.tsx feeds the worn effective mode to Chakra's colour mode.
- **Header** (StatusBanner): attached and full width, frosted (FROST), a hairline once the page scrolls under it; icon + "Frame14", running appliances, connection, mic, a frame's power button, a desktop's clock. Keep HEADER_TOP (status-bar inset + 1.25rem) — the user had the docked row undone. Header icons are `fg`, not green.
- **Nav** (LandscapeNav): a frosted bottom bar in portrait (6 slots on the frame, 5 on a phone, the rest under More), a floating rail in landscape. The selected entry has no fill, only `fg` against `fg.muted`. On an iPhone (home-indicator inset) the bar is flush with the screen's sides and bottom with **square corners** — the screen's own corners clip it; CSS can't read a screen's radius, so never draw one. Entries come from lib/navItems (`frameOnly`, `remoteOnly`, `remoteOff`, `gameDay`, `halloween`, `photos`, `unraid`) and this device's lib/navLayout (Home first, Settings always shown).
- **Scrolling**: Layout's Box is the scroll container, `--app-height` tall (main.tsx sets it from `window.innerHeight` — the visual viewport and `clientHeight` both misplaced the bar on iPhones). In Safari on an iPhone (not the home-screen app, `<html data-safari-bar>`) the document scrolls instead so Safari's bar can shrink. Scrolling pages: SCROLLING_PATHS, every page on a remote, DESKTOP_SCROLLING_PATHS on a desktop. The scroll resets per page, not per tab.
- **Launch splash** (index.html, inline): paints the worn theme's background before the bundle and builds the app icon in layers; `lib/splash.ts` hands over (cards rising in reading order). Only transforms and fades — an SVG stroke drawing froze while the bundle compiled. After a quick last launch (QUICK_MS) the logo is skipped for GRACE_MS. Not on /blank. index.html's copied palette values must stay in step with lib/themePalettes.
- **Start-up** stays cheap: persisted queries restored before the first render, `sw.js` cache-first for hashed files, precompressed `immutable` assets, WebSocket first, a burst of states applied once per frame.
- **PWA**: `public/manifest.json`, icons from RealFaviconGenerator's set (replace it whole; its `site.webmanifest` is unused). The manifest link keeps `crossorigin="use-credentials"`: behind Cloudflare Access a cookieless fetch gets the sign-in redirect and Chrome offers no install.
- **Hand-drawn graphics** take their colours from tokens: ThermostatDial (the climate, fan and light dials), the analog clock, the football score bug, the energy charts (TodayPowerChart, TodaySparkline, EnergyHistoryChart, PowerFlow — no chart library), the Halloween scene. Team colours are data.
- `src/components/ui/` holds Chakra CLI snippets (`npx @chakra-ui/cli snippet add <name>`), locally changed: slider.tsx's marks have no inset along the track (they sit under the thumb's centre); toaster.tsx gives every toast a close button and its type's palette.

## Design constraints (the frame)

The frame is a **1600x2400 portrait LCD**. Design portrait-first and check that aspect: in portrait `vmin` is the width, so anything sized in vmin side by side competes for the short axis — stack down the long axis and re-flow with `@media (orientation: …)` (LandscapeNav, PageShell and FootballScoreboard do). Fill the height with content scaled to match, not stretched blocks behind small text. The OLED-era rules (black page, no borders, burn-in) don't apply. Font: Chakra's system stack; the Halloween page alone loads Creepster.

Fully Kiosk settings the frame needs: "Enable JavaScript Interface" (Advanced Web Settings) and "Prevent Device from Sleep while Screen Off" (or the socket drops and `screen on` never arrives).

## Component rules

- Every React component in its own file under `src/components/<Name>.tsx` (or a subfolder). Route files compose components and define no sibling components inline.
- Small helpers used by one component stay in its file; shared ones go in `src/lib/`.
- A stable `EMPTY` module constant for empty id lists handed to `useEntities` (a fresh `[]` re-subscribes).
- Key per-entity controls by entity id (their local state follows HA except what's under a finger).

## Frontend structure

```
src/main.tsx        — sets html's data-backdrop-blur and data-safari-bar, --app-height; Provider + QueryClient + Toaster; restores/persists queries; imports themeMode, appVersion, socketWake, arrivalView for their side effects; registers sw.js
src/globals.d.ts    — __APP_VERSION__ and Window.fully (Fully Kiosk's turnScreenOn/Off, set/getScreenBrightness, getSensorValue)
src/router.tsx      — createBrowserRouter, Layout around every route
```

**Shell** — `Layout` (StatusBanner, nav, SocketViewListener, ScreenListener, PageTransition keyed by page, the scroll Box; veils header and navs while /home is arranged), `StatusBanner`, `HeaderMenu` (the header's small Popover menus: ConnectionMenu, ApplianceIndicators), `LandscapeNav` / `NavMoreMenu`, `NavEyeButton` (hides the frames' nav on full-bleed pages; none on a remote), `PageShell` (`gutter` padding; `fill` for chart pages), `PageTransition` (a `fill` page in a scrolling layout sits in a one-row grid — WebKit squeezed it otherwise), `SocketViewListener` (navigates on `change_view`, never on /control or a remote; takes the first `current_view` through lib/arrivalView), `ScreenListener` (`screen` / `brightness` to `window.fully` on a frame; reports brightness and the room's lux), `ScreenOffButton`, the voice components (`VoiceLevelRing` writes transform in rAF, never through state).

**Board & home** — `Board` (Card with an optional Collapsible header: only the title is the trigger, stretched with ::after, so `action` isn't a button in a button; `board-collapsed:<key>` in localStorage; `onClick` makes a plain card one button). `HomeBoard` (one CSS grid, `usePackedGrid` + lib/packCards: a card's column comes from its order, its row from the cards above — a height change moves only cards beneath; press and hold to arrange, `ignore: "[data-long-press]"` so a light tile's hold is the tile's; dnd-kit sorts live in onDragOver and onDragEnd saves `liveLayout`, a ref, since the drop fires before React commits the last move; `touch-action: none` while arranging; DragOverlay and toolbar portalled to body — PageTransition's transform offsets fixed elements), `HomeCardSlot`, `HomeCardFace`, `HomeCardHideButton` (the eye), `HomeCardWidthPicker`, `HomeLayoutToolbar`. `usePackedGrid` measures `offsetHeight`, never getBoundingClientRect (transformed under the scale-in). First card: `HomeHeader` (frame), `HomeWeatherCard` (phone), `HomeForecastCard` (desktop), one id `header`. `CalendarSection`'s arrow shows only while Calendar is in this device's nav. skeletons/ hold each card's placeholder body.

**Lights** — `LightControl` (one tile: bulb or HA's MDI icon in the light's colour, name over status; tap → explicit turn_on / turn_off via `useLightToggle`, pending spinner until HA reports it, toast on refusal or after STATE_TIMEOUT_MS; a sideways swipe on a dimmable tile sets the brightness — direction read after 8px, `touch-action: pan-y`; press and hold opens the drawer on every tile, which carries `data-long-press`). No badge around the bulb (it read as a button); names drop the word Light(s) (`displayLightName`). `LightDialog` (the favourite star beside the close button, which keeps the initial focus; keeps the last light through the exit animation) holding `LightControls` (the thermostat dial geared to brightness; −/+ by tenths sent STEP_COMMIT_MS after the taps) or `LightPowerControls` (on/off lights, switches). `LightsAllOffButton` spares `lightAllOffExclude`. `HomeLightsSection` keeps the tile whose drawer is open. `MdiIcon` masks GET /api/icon/:name in `currentColor`. lib: `lightsConfig` (rooms, sorting, tile columns), `lightModel`, `lightFavorites` (localStorage `light-favorites`).

**Climate & fans** — `ClimateTiles` (shared by the Home card and /climate; `square` and `size` props), `ClimateDialog`, `ClimateControls` (dial, −/+ a degree within 60–85° sent STEP_COMMIT_MS after the taps, mode SegmentGroup, FanSpeedSlider; a sent fan mode is held against HA's older echo until it comes back or FAN_ECHO_MS), `ThermostatDial` (the one hand-drawn control: 120° tick arc on an ArcScale, a marker that animates to the value, `data-swipe-ignore`), `FanSpeedSlider` (commits the mode the last change put up — zag's change-end reads a stale prop), the Fans card's `FanControls` (the dial geared to speed by quarters). Dial numbers are NumberFlows in `data-dial-reading`. lib: `hvac` (modes, palettes, `climateStatus`, `climateTempRange`, `tileRing`, grid rules, SQUARE_TILE_READING), `thermostatArc`, `fan`.

**Energy** — `EnergySection` (Home card: PowerFlow sm, coverage, totals, TodaySparkline; opens EnergyDialog), `EnergyDialog` (Now, then Solar / Circuits tabs), `PowerFlow` (dots at `flowPace` set as the running animation's playbackRate through getAnimations — a new duration would jump the phase; the home node's ring is today's coverage), the charts (stretched SVG paths from lib/powerCurve, HTML dots and labels over them), `CircuitBar` (a band gliding at the draw's pace, the same playbackRate trick). lib/energy's ENERGY_COLORS were picked with the dataviz validator.

**Weather** — `WeatherDialog` (from Home's weather card) reuses the page's parts. lib/weatherAdvisories reads the heads-ups from the forecasts (there is no alerts feed). `PanelDialog` is the detail modals' shell: it opens with the focus on the panel itself, so Chromium paints no ring on its first control.

**Cameras, printer, vacuum** — `CameraCard` (one stream at a time: the card's feed unmounts while the full screen is up), `CameraFeed` (HLS via `CameraVideo`, stills fallback, badge), `CameraVideo` (hls.js or native; `fit`), `CameraDialog` (`Modal.Root full`, the room's lights in the header), `DoorbellCard` (pops up for 30s on the person sensor's rising edge, `zIndex` toast; its full screen replaces it and closing hides both), `PrinterCameraCard` (MJPEG `<img>`, re-keyed on return to the page — phones drop the stream silently), the printer's and vacuum's cards (lib/printerEntities, printerStatus, vacuum: core Roborock naming). `MarqueeArt` is absolute, not fixed (a transformed ancestor).

**Unraid** — `UnraidServerSection` (desktop: a sticky 1fr column of the server's card over the VMs' beside the containers, `useStickyTop`; elsewhere one column), `UnraidServerCard` (UsageMeters side by side by a container query), `UsageMeter`, `UnraidGuestsCard` (collapsible, "N of M running"), `UnraidGuestTile` (not a button). Read only. lib/unraid.

**Settings (/control)** — `ControlColumns` (two columns on a desktop), `AppearanceBoard` / `ThemeFields`, `ScreenBoard` (screen switch and schedule; on the frame and phones also brightness, "Adjust to the room", dark hours), `SoftwareBoard` (versions linked to their GitHub releases, update badge, Install with the release notes in its confirm dialog, indeterminate progress, Try again once the add-on fails to come back, Check for updates), `UpdatesBoard` (this device's auto refresh), `NavLayoutBoard` / `NavLayoutRow` / `SortableNavLayoutRow` (rows the device can't have today — Photos without Immich, Unraid without a server, Halloween outside its days — are left out but keep their place).

**Halloween** — `halloween/`: a seeded sky, neon words, the witch's occasional flight; every animation off under reduced motion (`hw-scene`); the page hides the nav like Marquee and goes Home when Nov 1 arrives.

**Hooks** — `useEntity` / `useEntities` (Socket.IO rooms; the server acks each subscribe after the cached state; `useEntitiesAcked(ids)` for a page's own loading; ids memoised on their joined key), `useEntitiesConfig` (/api/entities, replaced live by the socket's "entities"), `useDesktop` (`ssr: false`; four-column query and not a mobile/Android UA — not device mode, and desktop browsers default to frame mode), `useBottomDrawer`, `useLongPress` (`ignore`; swallows the release click), `useLightToggle`; the rest are one query or store each (useClimate, useLiveEnergy, useHomeData, useHomeWeather, usePrinter — temperatures in °C —, useVacuum, useUnraid, useSoftware, useThemeMode, …).

**lib** — besides those above: `socket` (WebSocket first), `socketWake` (on return to the page: reconnect a down socket, echo-test an up one), `connection`, `deviceMode` (`frame` | `controller` in localStorage, UA default; `blursModalBackdrop`), `arrivalView` (a frame opening while the frames are on football, marquee or — on its days — halloween goes there; never an everyday view, a remote or /control), `appVersion` (reload or toast once per new version), `navItems` / `navLayout` (this device's nav, `nav-layout:<mode>`), `navMetrics` (PAGE_GUTTER, HEADER_TOP, the bar's iPhone shape), `floatingSurface` (SURFACE_SHADOW, FROST, NAV_SURFACE, DARK_RAISED), `homeLayout` (`home-layout:<n>col`), `packCards`, `persistedQueries`, `screen` (the frames' screen store; a setting applies at once and rolls back on refusal), `callService` (resolves the ack, never rejects; `callLightService` sends one colour, never both), `navVisibility` (the frames' nav, synced; always shown on a remote), `splash`, `voiceRecorder` (16 kHz AudioContext, a worklet to Int16).

## Backend structure

```
index.js            — app, Socket.IO, routers; static dist: assets from their .br/.gz with immutable, the rest and the SPA fallback no-cache; `compression` for live responses but never streams (cameras, assist, video) or under 1 KB; entity:call acks callService's result
config.js           — credentials, PHOTOS_ENABLED, REPO_URL, ADDON_NAME, ingress port
entities.js         — ENTITIES from options.json / frame14.json / FRAME14_CONFIG
ha-socket.js        — the HA WebSocket: state cache, entity rooms, sendCommand (tracked, timeouts), callService and its allow-list, watchers (motion, album, media → marquee, football), setLastRoute, assist pipeline subscriptions, update helpers (installUpdate, refreshEntity, reloadAddonStore, fetchReleaseNotes), registry events → hooks.onRegistryChanged
ha-areas.js         — reads the area / device / entity registries; resolves light_areas, puts each light, switch and camera in its room (its area, else its device's); entitiesPayload() (ENTITIES + lights, rooms, photos, unraid) for GET /api/entities and the "entities" emit
unraid.js           — resolveUnraid(devices, entities): servers by config entry, sensors / containers / VMs by unique-id key (entity ids follow no pattern); a hidden switch drops its guest; never the array, parity, autostart, buttons or update entities
screen.js           — the frames' screen: state, schedule (edge-triggered ticks), brightness, dark hours (DARK_BRIGHTNESS), auto brightness from lux (levelForLux, AUTO_STEP hysteresis); saved in screen.json
theme.js            — the frames' theme mode and palette, saved in theme.json
origin-guard.js     — crossSite / refuseCrossSite (all of /api) / allowSocket (Socket.IO's allowRequest)
ha-proxy.js         — HA images and MJPEG through the server's token
printer-entities.js — the printer's camera, cover, buttons, chamber light (mirror of src/lib/printerEntities.ts)
openapi.js          — OpenAPI document + Swagger UI
scripts/precompress.mjs — brotli 11 / gzip 9 beside each built asset;  scripts/gen-icons.mjs — PNG icons from favicon.svg
ha-motion.js        — stale: imported by nothing, not in the Dockerfile
```

Invariants:
- `callService` returns `false` for a call it won't send, else `sendServiceCall`'s promise, which never rejects (the process exits on an unhandled rejection).
- Assist pipeline runs are subscriptions: `pendingSubscriptions` is checked before the entity_id guard in the event branch, or every pipeline event is dropped.
- The media watcher routes to /marquee only for `media_content_type: movie` and hands the panel back when playback rolls into an episode or live TV. `TRANSIENT_VIEWS` (football, marquee, halloween, blank) are never written to the route helper; the motion watcher wakes the frames onto the saved route but leaves a transient view other than blank alone.
- Today's energy totals are the change in the lifetime meters since the end of yesterday (the inverter's "today" sensors drift); monthly / yearly days are differences of end-of-day lifetime readings (the statistics `change` type is corrupted by counter resets).
- The weather routes fail only when the current-conditions entity does; a failing forecast leaves its lists empty.
- `startHaSocket(io, hooks)`: `onPrimed` after each connect's priming and `onRegistryChanged` on registry events (REGISTRY_EVENT_IDS) — index.js wires both to ha-areas.js, which refreshes a second after an event — and `lights`, the lights a page may call (ha-areas.js's lightsConfig; a hook rather than an import, since ha-areas.js imports ha-socket.js).


## API endpoints

- `GET /api` — health: `ok`, `version`, `assistPipeline`.
- `GET /api/entities` — the entity config with `lights` grown by the rooms, `rooms` (each with its `cameras`), `photos`, `unraid`.
- `GET /api/icon/:name` — one MDI SVG from `@mdi/svg` (immutable a year); 400 for a non-name, 404 for an unknown one.
- `GET /api/software` — `installed`, `repoUrl`, `update` (the add-on's update entity found by its `title` = ADDON_NAME: `installed`, `latest`, `available`, `inProgress`, `releaseNotes` — the latest version's CHANGELOG section via `update/release_notes`, cached per version). `POST /api/software/install` (`update.install`; 202 / 409 nothing newer / 404 no entity / 503 HA down). `POST /api/software/check` (Supervisor store reload via `supervisor/api` — an admin's command — then `homeassistant.update_entity`, then the GET's answer with `checkedAt`).
- `GET /api/connection` (the caller's address as seen, the server, the HA link); `GET /api/weather`, `/api/home/weather` (now, 8 h, 24 h, up to 10 days); `/api/home/climate`, `/api/home/fan`, `/api/home/vacuum` (+ `/map/:entityId`, its own maps only).
- `GET /api/home/calendar` (today + tomorrow), `/api/home/calendar/agenda?days=14` (≤ 31; HA's all-day `end` is the day after).
- `GET /api/energy`, `/today` (quarter hours, `selfConsumed`), `/monthly?month=`, `/yearly?year=`; `/api/circuits` (Emporia Vue). `GET /api/printer/camera/stream`, `/api/printer/cover`.
- `GET /api/camera/hls?entity=` (configured cameras only; the master playlist under `/api/camera/hls/<token>/…`, which proxies HA's allow-listed HLS files), `/api/camera/snapshot`, `/api/camera/stream` (MJPEG, unused by the client).
- `GET /api/marquee/art?v=` — the poster: Plex's transcoder at 1280x1920 by ratingKey with PLEX_*, else the entity picture. The client never supplies a URL.
- `GET /api/photos/config|albums|albums/:id|asset/:id/thumbnail`, `POST /api/photos/config`; an album in Immich's order (`fileCreatedAt`, honouring oldest-first); without Immich or `album_entity`: no album, POST 404, Immich routes 503.
- `GET /api/assist/config`, `/api/assist/tts/:id` (ids minted server-side). `GET /api/change/:view` — `change_view` to all clients (HA automations).
- `GET /api/screen` (state, schedule, brightness, dark, auto, lux), `GET /api/screen/:state` (`on` / `off` to every frame), `GET /api/screen/brightness/:level` (0–255, turns auto off), `PUT /api/screen/schedule` / `/dark` / `/auto` (saved and applied; 400 when not a valid setting).

Adding an endpoint: the handler in a `routes/*.js` file, mounted in index.js (more specific paths first: `/api/home/climate` before `/api/home`), documented in openapi.js (its test fails otherwise). Adding an entity id: `frame14.json`, `config.yaml` options + schema, read in `entities.js` onto `ENTITIES`, used from there.

## Socket.IO

- `entity:subscribe` / `entity:unsubscribe` join `entity:<id>` rooms; the server sends the cached state and then acks (also with no state). HA's `state_changed` fans out to the rooms. `entity:call` acks `{ ok }` or `{ ok: false, error }`.
- `change` → `change_view` to the **other** clients; `GET /api/change/:view` → all. The server sends `current_view` on connect. SocketViewListener ignores views on /control and on a remote (a remote goes only where its user takes it).
- `screen` (a command, never re-sent) and `brightness` go to frames' `window.fully`; frames send `brightness_report` and `lux_report`; the server sends `screen_state` on connect and after every change.
- `nav_visibility`: the frames' setting; remotes relay it but keep their own nav.
- Theme: `theme_mode` / `theme_palette` from the Display card, kept by theme.js and broadcast; `current_theme_mode` / `current_theme_palette` on connect.
- Photos: a frame emits `photo_shown`; everyone gets `photos_shown`; a remote's `show_photo { albumId, assetId }` is broadcast and frames save it as the album's position. No view change goes with it.
- Voice: `assist:start` (ack), `assist:audio` (Int16LE PCM), `assist:audio_end`, `assist:cancel`; the server emits `assist:event` (TTS path swapped for an opaque `audioUrl`; `intent-end` carries `cue` — a non-null cue plays a tone instead of speech, judged for LLM turns by the tool results in `intent-progress`, since an LLM labels every reply `action_done`) and `assist:error`. One run at a time.
- `echo` with an ack: the connection menu's round trip; socketWake's liveness check.
- `entities`: the entity payload again when the rooms or Unraid change. `ready` (server restart) reloads.

## Security

No login of its own, by the user's choice — anything that reaches the port can use it; the LAN side is left open deliberately and access from outside goes through Cloudflare Access. Don't propose a login, a LAN allow-list or Tailscale unprompted. What the server guards:
- `HA_TOKEN` never reaches a browser; every picture and stream is proxied, and the client never supplies a URL or an entity the server didn't derive (printer, cameras, marquee, vacuum maps, TTS).
- origin-guard.js refuses a browser's request from another site — Sec-Fetch-Site `same-site` / `cross-site` (another app under the same Cloudflare domain counts), else an Origin that isn't the Host's or X-Forwarded-Host's — on all of /api (403) and the socket's handshake; requests with no browser headers (HA's `rest_command`, curl) pass.
- `entity:call` is held to an allow-list of domains, services and argument shapes in ha-socket.js's `callService`, and every entity to one a page shows (`callableEntity`): a light the pages show (`hooks.lights` — index.js hands startHaSocket ha-areas.js's `lightsConfig().lights`, the configured lights and the rooms'; the configured ones without it) or the printer's chamber light; a switch via `callableSwitch` (the configured `light_entities` switches and the chamber light — never Unraid's array, VM or container switches); a configured fan (`fan_entities`) or thermostat (`climate_entities`); `media_player` only `play_media` of this HA's TTS on `assist_speaker`; vacuums and printer buttons only the configured devices with checked arguments. A page that calls a new kind of entity needs it added there, or the call is refused. `tests/server/callable-entity.test.js` and ha-socket.test's refusals cover it.
- The Unraid page is read only: no start, stop or update, by the user's word.

## Home Assistant add-on

- The folder is `frame14/`; the Supervisor finds the add-on by its `slug`, `frame14`. **Never change `slug`** — every install would see a new add-on and need it installed and configured again.
- `config.yaml` — manifest, options and schema, `url` (this repo; the README's My-HA links use the hash of the URL an instance added). `run.sh` exports scalar options via bashio; arrays are read from options.json by entities.js. `CHANGELOG.md` is the add-on's Changelog tab.
- Ingress is only a doorway: HA's Open Web UI and sidebar load the add-on in an iframe under `/api/hassio_ingress/<token>/`, where the dashboard can't run, so index.js serves `routes/ingress.js` alone on `ingress_port` and it moves the whole tab to `web_ui_url`. With `host_network: true` that port is on the HA host.
- `ha-automation.yaml` — example motion automation. The repo root's `README.md` is the add-on's GitHub page (official add-on README shape: badges, My-HA buttons, every option, the pages, security, local development); keep its options and pages current.

## Standing decisions (don't undo without asking)

Each of these was the user's call; most guard against a design they rejected.
- **Home climate card**: plain wide rectangles everywhere. **/climate**: squares on a phone only (the temperature at the square's centre, the status centred at the bottom; the reading at SQUARE_TILE_READING, light 300 — the weight the user settled on), `lg` tiles on the frame and desktop. Rejected: squares everywhere; dials on /climate.
- No desktop system footer (tried and removed — don't propose it back). No floating header bar (the header stays attached).
- The desktop lights strip was deleted; revive it from git tag `v0.144.1` only if asked.
- Drawers are never full height. The modal rules above (sheet / dialog / side panel / full) and the no-blur-on-Android rule.
- The fan and light drawers are the thermostat's dial geared to them; the dial's numbers roll (NumberFlow) and its marker animates on −/+.
- The Weather card opens WeatherDialog rather than the page. The energy detail has the page's Solar and Circuits tabs.
- Settings shows tabs on every device. Remotes are never moved by broadcasts or motion.
- The Software card: the versions are the links to their releases (no separate GitHub button); install progress is indeterminate (the Supervisor never filled in a percentage); the release notes are in the confirm dialog, not the card.
- Toasts are outlined (bg.panel, a border in the type's colour) and always closable. Progress bars are fully rounded and brand blue unless the colour is a warning.
- Every card casts the navs' shadow. Cards and both navs share `bg.surface` and the `surface` radius; tiles inside are concentric (`sm`).
- All off (the page's, a room's, a card's) spares `light_all_off_exclude` — the kid's hatch light here.
- Light favourites are per device; a shared, server-kept list was offered and not wanted for now.
- The Unraid page: read only, no page header, two columns on a desktop.
- Raise the build's heap cap rather than splitting the typecheck out of `npm run build`.
