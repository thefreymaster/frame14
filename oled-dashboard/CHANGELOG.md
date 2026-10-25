# Changelog

## 0.83.0

- Added: a Media page (`/media`), in the nav after Calendar on every device and among a remote's Views (opening on the remote itself, like Lights). A card per media player: what is playing with its artwork, the artist and album or the series and episode, and the progress through it; then the controls the player supports — previous, play / pause, next, stop, power — the volume with a mute button, and the source.
- Added: `media_player_entities`, an add-on option listing the Media page's players. It is empty by default, when the page shows the marquee's `media_player_entity` (the Plex player); add the TV and the speakers in the add-on's Configuration.
- Changed: `/api/marquee/art` takes `?entity=` for one of the configured players (the Plex poster path stays the marquee player's). The media controls go through the socket as the vacuum's do, for the configured players only.

## 0.82.0

- Added: a Cameras page (`/cameras`): every picture of the house on one page — a card per camera with its live stream (Home Assistant's HLS, as the doorbell card plays it), falling back to a still every five seconds when the stream won't start, a Live / Stills / Offline badge and a retry; the 3D printer's camera while it has one; and each vacuum's map. In the nav after Vacuum on the frame; offered on remotes but off in their nav until turned on, like Printer and Vacuum, and among a remote's Views, which puts the frames on it. Automations can use `/api/change/cameras`.
- Added: `camera_entities`, an add-on option listing the Cameras page's cameras. It is empty by default, when the page shows the doorbell's `camera_entity`; add `camera.front_porch_rtsp` and the rest in the add-on's Configuration.
- Changed: `/api/camera/hls`, `/api/camera/stream` and `/api/camera/snapshot` take `?entity=` for one of the configured cameras; without it they mean the doorbell camera, as before.

## 0.81.0

- Added: a Calendar page (`/calendar`), in the nav after Weather on every device and among a remote's Views (opening on the remote itself, like Lights). The next two weeks as a card per day — Today, Tomorrow, then "Mon, Oct 27" — each with its events (the time or "all day", an event that has ended struck through) and, with more than one calendar, each event's calendar as a coloured badge; a free day is a header alone, so a free day reads as free. An all-day event that spans days appears on each. The header counts the fortnight's events and names the calendars. One across on a phone, two on the frame, more on a wide desktop.
- Added: the chevron in the Home calendar card's header opens the Calendar page.
- Added: `/api/home/calendar/agenda?days=14`, every calendar's events for the next days, bucketed by local day.

## 0.80.0

- Added: a Weather page (`/weather`), in the nav where Radar was — and on every device now, where Radar was the frame's alone. A collapsible Now card has the conditions (the icon, the temperature, the condition, today's high and low), the forecast's advisories and the figures the weather entity reports (feels like, humidity, wind with its compass point, pressure, visibility, UV index). Under it three tabs: Hourly (the next 24 hours as a temperature line with each hour's rain chance as a bar, over the hour-by-hour strip, which scrolls sideways), Daily (the days ahead, as in the forecast dialog) and Radar (the interactive map that was the Radar page). A remote's Views has Weather in Radar's place; like Lights it opens on the remote itself.
- Added: advisories, read from the WeatherKit forecast the page already has — the same signals the Home Assistant weather automations watch: a freeze in the next two nights, thunderstorms, snow or sleet, high winds (30 mph and up), a 15° drop within six hours, and rain on the way (a 50% chance and up while it isn't raining). The NWS integration is disabled and WeatherKit carries no alerts, so these are derived from the forecast, not official warnings.
- Changed: `/radar` redirects to the Weather page's Radar tab (`/weather?tab=radar`), so `/api/change/radar` and bookmarks still work, and a saved nav layout keeps Weather in Radar's place. On the frame the map now sits inside the page gutter with the cards' corners, as it did on a desktop, rather than edge to edge.
- Changed: `/api/home/weather` also returns the next 24 hours (`forecastHours`) and the entity's apparent temperature, wind (speed, unit, bearing), pressure, visibility and UV index.

## 0.79.0

- Added: a Climate page (`/climate`), in the nav after Lights on every device and among a remote's Views (where, like Lights, it opens on the remote itself). Each thermostat is a card: the dial, mode and fan-speed controls the Home card's dialog has, its status in the header ("Heating to 70°" in the mode's colour while it runs), and today's room temperature since midnight as a strip under the controls — the target as a dashed step, the quarter hours it heated or cooled tinted orange or blue, the day's low and high above it. The page header counts the units that are on and carries All off. An automation can put a frame on it with `/api/change/climate`.
- Added: the room's humidity under the dial's reading ("Indoor 64° · 46% humidity"), on the page and in the Home card's dialog, when the thermostat reports one.
- Added: `/api/home/climate/history`, today's room temperature, target and heating / cooling per quarter hour for each configured thermostat, from Home Assistant's history (so the recorder's keep-days must cover today, which the default ten do).

## 0.78.0

- Changed: the bottom bar and the left rail are frosted. They keep the cards' colour, but at 72%, over a blur (8px) of whatever scrolls beneath — the classic tab-bar material, not Liquid Glass: no refraction or highlight. The desktop lights strip stays opaque. On Home nothing passes under the rail, so its frost shows on full-bleed views and behind dialogs.

## 0.77.0

- Changed: the thermostats are the LocalThings ones (`climate.samsung_airconditioner_*`, local control of the Samsung mini splits) instead of SmartThings'. The add-on's `climate_entities` default lists them; an add-on that was configured before keeps its own list, so swap the four ids in its Configuration.
- Added: `climate_names`, labels for thermostats by entity id, since LocalThings names its entities after the device ("Localthings 1st FLR AC"). The default names the four as before: 1st, 2nd and 3rd Floor AC and Master Room AC. A thermostat without an entry still shows its Home Assistant name.

## 0.76.2

- Changed: the house's ring is a little heavier than the other nodes' edges — 3px on the card, 4px in the dialog and on the Energy page — so it reads as a gauge beside them.

## 0.76.1

- Changed: the house's ring is today's figure — how much of the day's use the solar has covered, the number under the diagram on the card — rather than the share of the draw right now. Past 100% it goes round again in green over the yellow, as the figure turns green: a 150% day is a full yellow ring with a green half over it, a 200% day all green.

## 0.76.0

- Added: the house in the power flow (the Energy card, its dialog, and the Energy page's Now card) wears a ring: how much of what the house is drawing right now the panels are covering, in solar yellow from the top clockwise, the rest the edge's grey. It's full whenever the panels make at least what the house uses (so all the while power is going out to the grid), part of the way round when the grid makes up the rest, and plain at night. It moves as the figures change.

## 0.75.0

- Changed: Solar and Power are one page, Energy, with the Home card's bolt in the nav. At the top is the Now card from Solar — the power flow from the Home energy card, the grid figure in its header, collapsible — and under it two tabs: Solar, the month or year chart as it was, and Circuits, the per-circuit breakdown that was the Power page.
- Changed: the Solar chart's controls moved from the page's header into the chart card's own: the month or year between its arrows at the left, Total / Daily and Month / Year at the right (on their own row on a phone).
- Removed: the Solar · Grid · Home figures that headed the Power page; the Now card's power flow shows the same three.
- Changed: a device whose nav was rearranged keeps Energy where Solar (or Power) was. The old /solar and /power addresses still open the Energy page, on the Solar or the Circuits tab, so automations that send a panel there keep working.

## 0.74.0

- Changed: the Solar page is drawn like the new Energy card. A Now card at the top shows the power flow — the panels, the house and the grid with dots running along the wires the way the power is going, the live kilowatts under each — with the grid figure in its header, and it can be collapsed. The month or year is one card: how much of the period's use the solar covered as the big figure (green past 100%), the two totals keyed to the lines, and the chart in the same style — solar over its wash and the house's use in grey, on a kWh scale with gridlines, the lines ending where the period has got to, with a dot on each. Total still draws the running totals and Daily each day's (or each month's) own.
- Changed: point at, drag across or arrow through the chart to read a day or month: the keys show its values and its name appears at the right, with its average temperature in Daily. Idle, Daily names the best day or month. The old tooltip is gone.
- Changed: the temperature is no longer drawn as a line over the chart (it was on a made-up scale); it reads out with the day instead.

## 0.73.0

- Changed: the Energy card on Home. Its body is now the Energy dialog's power flow at a smaller size — the panels, the house and the grid as round nodes, with dots running along the wires the way the power is going right now, in the flow's colour (yellow from the panels, green out to the grid, orange in from it) — with the live kilowatts under each node. Below it, how much of today's use the solar covered is the one big figure (green once it passes 100%), beside a strip of today's power curve: solar over its wash and the house's use, midnight to midnight, ending at the values now. The two day totals sit over the strip, keyed by the panel and house icons. The progress bar is gone. The card is a little taller than it was; a tap on the body still opens the dialog with the full chart.
- Changed: today's curve is fetched whenever Home is up (every five minutes), not only while the Energy dialog is open, so the dialog's chart is there as soon as it opens. The launch animation waits for it too (within its usual limit).

## 0.72.0

- Changed: the bottom bar never holds more than five buttons. With five views or fewer they all show; with more, the first four show and More takes the fifth place with the rest. It used to show five plus More.
- Changed: on an iPhone the bottom bar sits flush with the screen's sides and bottom, its bottom corners following the screen's, with only a top edge. Its buttons stay where they were. On the frame and on desktops the bar still floats a gap in from the edges.

## 0.71.0

- Changed: the nav no longer fills the current entry with a grey pill. The view on screen is marked only by its icon and label being bright, with the other entries dimmed. The same goes for the bottom bar, the side rail and the rows of the More menu.
- Changed: in dark mode, cards and the navigation are the grey of iOS's grouped lists (the Settings app's groups on black, #1C1C1E) instead of #23242b. Their edge is unchanged.
- Added: tap the connection icon in the header for a small menu about the connection: whether Frame14 is connected and since when, the round trip to the server, the transport, this device's IP address as the server sees it, the server's address, whether the server is connected to Home Assistant, and the version (and the newer installed one, if there is one).
- Added: tap a running appliance's icon in the header (washer, dryer, dishwasher, 3D printer, vacuum) for a small menu with its status, how long it has been running and since when. The printer's also shows its progress and time left.

## 0.70.0

- Changed: the connection icon in the header. While Frame14 is connecting — when it first loads, and after the connection drops — it's grey, and the Wi-Fi arcs light up one after another from the dot outwards, like an iPhone searching for a network. It used to show the red disconnected icon straight away. It goes red only after a minute without getting through, and green as soon as it connects.
- Changed: the connection in Settings says Connecting… or Reconnecting… in grey during that minute, instead of Disconnected.

## 0.69.0

- Added: a launch animation. As Frame14 loads, the app icon builds itself on the page's black (white in Bright): the house appears from its peak down, the framed photo grows into it, and the hills rise inside. When the page is ready the icon lifts away, and the Home cards rise into place one after another.
- Changed: on first load, Home waits until every card has its data, including the Teams, printer and lights that arrive live. Cards no longer pop in one at a time or move around after the page appears. It waits at most 3 seconds after the app starts; after that, a card that's still loading shows its placeholder.
- Fixed: the screen flashed white while the app loaded, even in dark mode. It's now black (or white in Bright) from the first moment.
- The blank screen stays black when it reloads, with no icon. With reduced motion turned on, the icon appears complete and the page fades in.

## 0.68.1

- No changes to the app: this release exists to try out the new-version notice from 0.68.0. An open Frame14 page should show "New version available" with a Refresh button, and Settings an Update link next to v0.68.0.

## 0.68.0

- Added: when the add-on updates while Frame14 is open, a notice says a new version is installed, with a Refresh button. It appears once per new version, on every device, including the frame.
- Added: Settings shows the version the app is actually running. When a newer one is installed, an Update link next to it reloads into it, so on an iPhone you no longer have to close the app fully to get the new version.

## 0.67.0

- Removed: the "Printer idle" and "Vacuum docked" chips at the bottom of Home. An idle printer or vacuum no longer shows on Home at all.
- Added: a vacuum icon in the header while a vacuum is cleaning or returning to its dock, next to the printer icon that already shows while a print runs. Both are green, like the washer, dryer and dishwasher icons, and disappear when the appliance is idle.

## 0.66.0

- Changed: the energy detail (tap the Energy card on Home) is redesigned. "Now" shows where the power is going: solar into the house, and the rest out to the grid, or the grid making up the difference, with moving dots on each line in the direction it flows. "Today" draws the day's solar and home use as a chart, with the day's solar peak; drag across it (or point at it) to read any quarter hour. Under the chart, what the panels produced is split into what the house used and what went to the grid, and what the house used into what came from solar and what came from the grid.
- Added: `/api/energy/today`, today's solar and home power in quarter hours (from Home Assistant's 5-minute statistics) and how much of the day's solar the house used itself.
- Changed: on a phone, Settings puts its sections in tabs: Views, Display (theme, navigation, refresh and the album) and Device (this phone's navigation and voice). The frame, tablets and desktop browsers keep the single page.
- No add-on options were added or changed: the chart uses the existing current power entities.

## 0.65.1

- Fixed: on an iPhone, the forecast dialog's close button sat under the status bar and couldn't be tapped, so the dialog couldn't be closed. Dialogs now keep clear of the status bar and the home indicator, and a dialog taller than the screen scrolls its contents while the title and close button stay in place. The same applies to the energy and printer details.

## 0.65.0

- Added: tap the time and weather card on Home to see the forecast. It shows the weather now with today's high and low, the next eight hours, and the next ten days, each with its rain chance, low and high, and a bar showing where the day's range falls in the week. The weather card on a phone and the Weather card on a desktop open it too.

## 0.64.0

- Added: a 3D printer page (Printer in the nav). It shows the printer's status, its camera live, the current job (model thumbnail, name, progress, layer, time left and when it should finish) and the nozzle, bed and chamber temperatures. While a print runs you can pause or resume it, and stop it after a confirmation.
- Added: a vacuum page (Vacuum in the nav). It shows the vacuum's battery, state and any error; the current clean's progress, area and time; when it last ran; and its map. It also shows wear on the brushes, filter and sensors, with overdue parts flagged. Clean, Pause, Resume, Dock and Locate buttons and a suction setting control the vacuum.
- Added: Settings has a Navigation card. Drag a tab's handle to change its place in the nav, and use its switch to show or hide it. Home always stays first, and Settings can move but stays shown. Each device keeps its own order, and Reset goes back to the default.
- Changed: the bottom navigation bar shows up to five tabs. With more, it shows the first five and a More tab that opens the rest as a menu above the bar. The side rail in landscape still shows every tab.
- Changed: Printer and Vacuum are in the nav on the frame and desktop browsers. On a phone used as a remote they're off until you turn them on in Settings. The remote's Views grid can also put the frames on either page.
- Changed: the 3D printer card on Home uses a 3D printer icon.
- No add-on options were added or changed: the pages use the existing printer status and vacuum entities.

## 0.63.3

- Changed: on an iPhone, the bottom navigation bar sits close in to the screen's edges, has a flat top, and its bottom corners follow the curve of the screen's corners. Its buttons sit a little higher, above the home indicator, so the Home and Settings labels stay clear of the curve. On the frame and in a browser window it's unchanged.

## 0.63.2

- Changed: the mic button in the header moved from beside the Frame14 name to the right, after the status icons. On a desktop it sits just before the time.

## 0.63.1

- Fixed: a phone in remote mode no longer jumps to another view when the frames change view. That includes the frame waking on kitchen motion (which kept pulling the phone to Photos), a game kicking off, a movie starting, or another device's navigation. The phone stays wherever you are.
- Changed: picking a photo on the phone only changes the photo. A frame on Photos shows it right away. A frame on another view stays where it is and starts from that photo the next time it goes to Photos.

## 0.63.0

- Added: on a phone in remote mode, a Photos tab with every photo in the album as a grid and the album picker on top. The photo the frame is showing is highlighted; tap any photo to show it on the frame, which switches to Photos if it's on another view.
- Changed: the slideshow shows the album in order instead of at random, so it goes through every photo before it repeats one. The order is the album's own, as Immich shows it: by date taken, newest first unless the album is set to oldest first. Each device picks up where it left off, rather than starting over when it comes back to Photos. Every photo gets its full 30 seconds, including one put up by a tap or from the remote.
- Changed: on the frame and phones, the time and temperature on Photos are the same size as Home's clock. On a desktop they stay the smaller size.
- Changed: hiding the navigation (the eye button, or Show navigation in Settings) only hides it on frame-mode devices. A phone in remote mode always keeps its navigation, and has no eye button on Photos and the movie poster. Its Show navigation switch still hides and shows the frame's.

## 0.62.0

- Added: on a desktop, Home's first card is a weather card in place of the big clock (the header already shows the time): the temperature and conditions now, today's high and low, and the next 8 hours with the chance of rain.
- Changed: cards and the navigation are a slightly darker, cooler grey in dark mode (#23242b).
- Changed: the header is attached to the top of the screen again, on the page's own black (or white), as before 0.61.0, but without the line along its bottom edge. The mic stays in it.

## 0.61.2

- Changed: the header lines up with the cards again on phones, instead of with the bottom navigation bar.

## 0.61.1

- Changed: on phones, the space between and around cards is a little wider (8px instead of 4px).
- Changed: on phones, the mic is in the header beside the name, like on the frame and desktop, instead of a floating button.
- Changed: in portrait, the header is inset from the sides by the same amount as the bottom navigation bar.

## 0.61.0

- Changed: the header floats like the navigation, a slim bar with the cards' rounded corners, inset from the top and sides by the same space as the cards.
- Changed: the frame and tablets use the same wider space between and around cards as a desktop. Only phones keep the narrow spacing.
- Changed: on a desktop, the Clock page sits in a card inside the page spacing, like Photos and Radar, instead of running under the lights strip. The card keeps the clock's black (or white, in Bright) background, and the analog face shrinks to fit it.

## 0.60.2

- Changed: on a desktop, every button in the lights strip is the same width. A long name is cut off with "…" instead of making its button wider; hover to see the whole name.
- Changed: the thermostat tiles in the Climate card have the same rounded corners as the cards.

## 0.60.1

- Changed: `web_ui_url` starts as a placeholder address (`http://192.0.2.10:4000`, which reaches nothing). Set it to your own address on the Configuration tab, or Open Web UI goes nowhere.

## 0.60.0

- Added: a `web_ui_url` option on the Configuration tab, the address you open Frame14 at. The add-on's **Open Web UI** button and its sidebar entry now take the whole tab there.
- Fixed: **Open Web UI** and the sidebar entry showed a "Bad gateway" error, because nothing answered on the port Home Assistant opens them through. If `web_ui_url` is empty, they now say how to set it.

## 0.59.1

- Changed: on a desktop, the lights strip along the bottom is a row of buttons like the side navigation's, each with the bulb over the light's name, instead of on/off switches. Click one to turn it on or off; a light that's on is highlighted like the selected navigation entry, its bulb lit in the light's colour. The strip is a little taller to fit them.

## 0.59.0

- Added: the doorbell pop-up plays the camera's live video through Home Assistant's own live stream (the same one Home Assistant's camera view plays), instead of the still-picture stream, which an RTSP camera without a still-image URL can't produce. If the live stream can't start, it falls back to still pictures and then "Camera unavailable".

## 0.58.1

- Fixed: when the doorbell camera can't be shown, the pop-up says "Camera unavailable" on a black picture instead of an empty (white in dark mode) box with a broken-image icon. It clears as soon as a picture arrives.
- Fixed: while falling back to still pictures, the pop-up asks Home Assistant for one at a time instead of one every second whether or not the last had answered, which piled up slow requests on Home Assistant.
- Fixed: on a desktop, the doorbell pop-up sits above the lights strip instead of covering its right end.

## 0.58.0

- Added: on a desktop, a lights strip along the bottom of the screen: every light and switch as an on/off switch with its bulb and name, in one row (it scrolls sideways when they don't all fit). It sits inside the page spacing and lines up with the side navigation.
- Changed: on a desktop and on the frame, the mic is a button in the header, next to the name, instead of a floating button. Phones keep the floating mic.
- Changed: the voice window no longer writes out the reply; it's spoken (or a tone plays). The text still shows if the reply couldn't be played, so it isn't lost.

## 0.57.3

- Fixed: on a desktop browser, Photos and Radar now sit inside the page like cards, and the header shows the clock. A desktop browser starts in frame mode, and these were wrongly treated as the frame and left full-screen. The kitchen frame (an Android tablet) and phones stay full-screen, with no header clock.
- Fixed: on a framed Photos page, the show/hide navigation button sits inside the card's corner instead of on it.

## 0.57.2

- Changed: the header clock shows only on a desktop (or a tablet held sideways that isn't the frame). Phones have their own clock, and the frame has the large one on Home and Clock.

## 0.57.1

- Changed: Radar works like Photos: on a desktop it sits inside the page like a card (the same spacing around it, rounded corners, a thin border); on the frame and on phones it fills the screen edge to edge.
- Changed: the header clock no longer shows seconds.
- Changed: the default `weather_temperature_entity` (the temperature line on the Solar month and year charts) is now `sensor.weatherkit_temperature`, replacing the OpenWeatherMap sensor. This only changes the default for new installs: an existing install keeps its saved setting, so set it in the add-on's Configuration tab.

## 0.57.0

- Fixed: the temperature at the top right of Photos shows again. When the weather forecast entity (`weather_forecast_entity`) fails, the current weather is still sent and only the forecast is left out, with the reason in the add-on log. Before, the whole weather request failed, which hid the Photos temperature and the hourly forecast.
- Changed: on a desktop (or a tablet held sideways), Photos sits inside the page like a card: the same spacing around it, rounded corners and a thin border. On the frame and on phones it stays full-screen.
- Changed: when a dialog is open (a thermostat, a light, a fan, the forecast, voice), the page behind it is blurred as well as dimmed.

## 0.56.3

- Added: the header's clock shows seconds, each digit rolling over as it changes.
- Added: the Frame14 icon next to the name in the header, at the size of the status icons.
- Changed: every card has the same thin border as the side navigation, so cards stand out from the page in dark mode too.

## 0.56.2

- Changed: the space around the cards now always matches the space between them: 16px on a desktop (and a tablet held sideways), 4px on phones and the frame. The header's icons and the side navigation line up with it.
- Changed: cards and both navigation bars have less rounded corners (12px), and the bottom bar on phones matches the cards instead of being a pill. The selected page's highlight keeps slightly tighter corners that follow the bar's.

## 0.56.1

- Added: the header shows "Frame14" at the left and the time at the right, after the status icons.
- Changed: on a desktop or a tablet held sideways (the four-column Home), cards sit 16px apart again. Phones and the frame in portrait keep the tight 4px gap.

## 0.56.0

- Added: a header across the top of every view, not just Home. It's taller, with larger icons, all at the right: anything running (washer, dryer, dishwasher, 3D printer) and the connection. It shows and hides with the navigation, so Photos and the movie poster stay full-screen.
- Changed: on an iPhone home-screen app the header sits a little lower, clear of the blurred band under the status bar, so its icons are sharp.
- Changed: the version moved from the header to the Settings page, next to the connection status.
- Changed: in landscape (and on desktop) the side navigation floats too: a rail with softly rounded corners, set in from the left edge under the header. The selected page's highlight has slightly tighter corners that follow the rail's, so the two outlines stay evenly spaced.
- Changed: cards sit much closer together and closer to the screen edges: 4px apart and 4px from the edges instead of 16px, on Home and every other page. The header's icons and the landscape side rail line up with the cards' edges; the bottom bar on phones keeps its wider float.
- Changed: cards have less padding on phones, giving their contents more room, and rounder corners that match the side navigation's; the tiles inside them keep their tighter corners.
- Changed: the Lights page is redesigned. Each light is a tile with its icon in a round badge, the brightness ("80%") or "Off", and its full name. A light that's on takes on its own colour (warm whites glow amber, a blue nightlight glows blue) and fills from the left to its brightness.
- Added: press and hold a dimmable light to open its controls: a brightness slider, white presets (Candle, Warm, Neutral, Daylight) for lights that change temperature, and colour presets for colour lights. Each light shows only what it supports.
- Added: the Lights page header shows how many lights are on, with an "All off" button.
- Changed: the BirdNET bird detection badge under the time on Home is hidden for now.
- Changed: on phones, Home's first card is a compact weather card (icon, temperature, condition and humidity in one row) instead of the large date, clock and weather card. Tablets, the frame and desktop keep the large card.

## 0.55.0

- Changed: in portrait the bottom navigation bar floats, like Apple Music's tab bar. It is a rounded capsule set in from the sides of the screen and sitting just above the bottom edge (on an iPhone, just above the home indicator), and the page scrolls on underneath it. The bar is solid, not see-through, and the selected tab is a rounded pill. The landscape side rail is unchanged.
- Changed: on phones the tab labels are a size smaller, so a sixth tab (Football on game day) still fits.
- Fixed: in portrait, the hide/show navigation button on Photos and the movie poster was tucked under the nav bar while the bar was showing. It now sits above the bar.

## 0.54.0

- Added: an "All off" button in the Climate card's header turns off every thermostat that's on. It shows only while at least one is on (in any mode, including auto and dry) and works with the card collapsed too.
- Fixed: on Home, the card under the time and weather no longer sits almost flush against it. Cards measured while the page was still animating in came out short, which took away the gap below them; every card is now evenly spaced.

## 0.53.0

- Added: the 3D printer card works with Bambuddy. Set `printer_status_entity` to Bambuddy's status sensor (for example `sensor.h2s_xxx_status`) and the card, its progress bar, the detail dialog and the printer indicator follow it. ha-bambulab's `sensor.xxx_print_status` keeps working as before.
- Fixed: the printer card and indicator now show while printing when the status is reported in capitals (`RUNNING`, `PAUSE`).
- Changed: with Bambuddy, the detail dialog shows "—" for speed, filament, weight, length and start/end time, which Bambuddy doesn't provide.

## 0.52.0

- Changed: Home no longer turns into one big loading placeholder while it waits for data. Each card shows its own placeholder and fills in as soon as its own data arrives, so the weather can show while the thermostats are still loading. The clock and date show straight away.
- Fixed: a collapsed card no longer opens to a full-size placeholder while Home loads and then snaps shut.

## 0.51.2

- Fixed: since cards turned lighter grey in 0.51.1, some things inside them blended into the card in dark mode: the loading placeholders, the outlines of the view buttons and Refresh displays on Control, and the edges of switches, dropdowns and the thermostat tiles. They are one shade lighter again inside cards.

## 0.51.1

- Changed: in dark mode cards are a lighter grey, so they stand out from the page on the frame's screen instead of nearly blending into it. Rows and buttons inside a card stay darker.

## 0.51.0

- Added: cards on Home can be made wider or narrower. Press and hold a card to start arranging, then pick a width under each card: ¼, ½, ¾ or full on a desktop or a tablet held sideways (four columns), ½ or full on the frame in portrait (two columns). A phone always shows one card per row. The columns show as dashed lanes while you arrange.
- Changed: Home is one grid instead of fixed columns and full-width bands. Cards pack under each other by height, so a short card doesn't leave a gap beside a tall one. Each device remembers its own arrangement for four and for two columns, and an arrangement you made before this version carries over.
- Changed: Reset in the arranging bar puts every card back in its default place and width.

## 0.50.1

- Fixed: in the iPhone home-screen app, the page no longer shows through below the navigation bar. The bar now runs down to the bottom edge of the screen.
- Fixed: in the iPhone home-screen app, content scrolled up no longer shows behind the clock and notch at the top of the screen.
- Changed: the view buttons on Control are rounded rectangles instead of circles.

## 0.50.0

- Changed: light and switch tiles no longer show a checkbox; the lit icon and the yellow tile show what's on. On a phone the tiles sit three across instead of four, and long names wrap instead of being cut off.
- Changed: every button is fully rounded: text buttons are pills and icon buttons are circles, and the segmented controls (such as heat / cool / fan / off) have a pill-shaped track.
- Changed: the digital clock on the Clock page and the time and temperature over Photos now match Home's clock: the same heavy semibold figures, with a smaller am/pm (and seconds on the Clock page). The Clock page is the same size as Home; Photos is about half that size so the picture shows.
- Changed: the clock and outside temperature on Home are larger and use a heavier semibold weight with tighter spacing. They grow with the width of their card, so they fill it on the frame, on a phone and in landscape, and the digits keep a fixed width so the time doesn't shift as it ticks.
- Changed: the dashboard now uses the standard Chakra UI look throughout. Cards have Chakra's own borders and rounded corners, text uses Chakra's type scale, and controls are stock Chakra buttons, tabs, switches, sliders and segmented controls. Card and page layout, and everything the dashboard does, are unchanged.
- Changed: dark mode is Chakra's own dark theme (a near-black background with soft grey cards) rather than pure black, and Bright is Chakra's light theme. Auto still switches between them at 7:00 and 19:00.
- Changed: everything is scaled up as one, so the frame reads like a large tablet page; phones are unaffected.
- Changed: every pop-up — thermostat, fan, energy, 3D printer, forecast and the voice assistant — is a standard Chakra dialog with a title and a close button. Tap outside or press Escape to close it.
- Changed: the thermostat mode selector is a segmented control (Heat / Cool / Fan / Off) and fan speed is a slider. The temperature arc itself still works the same way.
- Changed: the thermostats on Home are compact tiles instead of big round dials, so the Climate card takes about half the room. Each tile shows the unit's name, the room temperature and what it is doing; tap a tile to open the thermostat window.
- Changed: on phones (screens narrower than 768px) cards have tighter padding, the same as Chakra's small card, so more fits on screen. Tablets, desktops and the frame are unchanged.
- Changed: on phones, Home is one column. Every card takes the full width, in the same order as before, instead of being squeezed into two narrow columns. The thermostats there show as two rows of two.
- Changed: on a phone (or any narrow Teams card), the score bug stacks the two teams one above the other with the game time between them, so names and scores are readable instead of tiny.
- Fixed: on a narrow screen the Calendar card's event count ran past the edge of the card. It now moves under the title when there isn't room, and the loading placeholders stay inside their cards too.
- Fixed: on a phone the last bird seen was cut off to "Blue …". The common name now stays whole and the Latin name is shortened instead.
- Changed: cards have smaller, tighter rounded corners, and so do the tiles inside them (thermostats, calendar events, the score bug), so nothing inside a card is rounder than the card itself.
- Changed: a thermostat that is on now has a thick border in its colour around its tile, like the ring in the thermostat window — orange for heat, blue for cool, teal for fan — with its icon and status in that colour. The tile says "Heating to 70°" while it is running and "Heat · set 70°" while it is idle; an off thermostat keeps a plain tile with a grey "Off".
- Changed: the navigation icons are larger and the selected view has a grey highlight.
- Changed: Settings uses segmented controls for device mode and theme, a switch for "Show navigation", and a status dot for the connection.
- Added: a short notification when you refresh displays, change the photo album, or reset the Home layout.
- Added: a red LIVE badge on the Teams card while a game is on, and hover labels on the status icons at the top of Home.
- Changed: the doorbell camera card now shows above an open pop-up instead of underneath it.

## 0.49.0

- Added: rearrange the Home screen. Press and hold any card until the outlines appear, then drag cards to reorder them or move them between columns — in portrait, also into the full-width bands above and below the columns. Tap Done when finished (or leave it; it finishes itself after 90 seconds). Reset puts the original layout back.
- Added: while arranging, cards that are hidden right now (football, rain radar, 3D printer, vacuum) show as labelled stand-ins so they can be placed too.
- Added: the arrangement is saved on each device separately, and portrait and landscape are remembered independently.
- Changed: in portrait the Climate card now ends below its last thermostat, instead of stretching down to match the column beside it.

## 0.48.0

- Changed: a voice command that works now answers with a short chime and a checkmark instead of a spoken sentence — "Turned on the kitchen lights" is no longer read out. Answers to questions, questions back to you, and anything that only partly worked are still spoken, and the reply text still shows on screen either way.
- Added: a low two-note tone plays when a voice request fails, alongside the reason on screen.
- Changed: a reply answered with the chime is no longer played on `assist_speaker` either.

## 0.47.4

- Fixed: the Photos slideshow stayed black after upgrading Immich to 3.x — Immich no longer lists an album's photos where Frame14 looked for them. Photos load again from the album selected in `input_select.smart_frame_album`.

## 0.47.3

- Fixed: the Solar page's chart was missing on any device set to Remote mode (desktop browsers and phones) — only the totals and legend showed. The chart now fills the page there, as it does on the frame.
- Changed: in Remote mode the Timer and Power pages now fill the screen the same way they do on the frame, instead of stopping short of the bottom.

## 0.47.2

- Changed: on the portrait frame the rain radar now sits in the half-width column directly above the energy card, instead of spanning the full width of the screen.
- Added: the radar card can be collapsed — tap its header to fold it away, and it stays collapsed the next time it rains.

## 0.47.1

- Changed: weather now comes from Apple WeatherKit (`weather.systems_weatherkit`) instead of OpenWeatherMap — current conditions, the hourly forecast and the rain radar trigger all read it. The new default only applies to fresh installs: on an existing install, set `weather_entity` and `weather_forecast_entity` to `weather.systems_weatherkit` in the addon's Configuration tab.

## 0.47.0

- Added: rain radar card on the home screen — whenever Home Assistant's current weather is rain (including downpours, thunderstorms and sleet), a Windy radar map appears above the energy card. It goes away again once the rain stops.

## 0.46.0

- Changed: the movie marquee is now for movies only. A TV episode or live TV playing on Plex no longer takes the display over — it stays on whatever view it was showing.
- Changed: if a movie rolls into the next episode, or you switch from a movie to live TV, the marquee hands the display back instead of leaving the old poster up.
- Changed: opening the marquee by hand while a show or live TV is playing says "movies only" rather than showing its artwork.

## 0.45.0

- Changed: the full-screen game now fills the display instead of sitting in the middle with black above and below it. The scores are much larger, and the team blocks, clock and win-probability bar all grow to use the height.
- Changed: each team's name now has a line to itself with the score below it, rather than sharing a line. Long names like "FLORIDA STATE" were being cut off with an ellipsis because the score crowded them out; they fit now, in both the portrait display and a wide browser window.
- Fixed: the down-and-distance tag was drawn narrower than its own text, so it read as "3RD &" with the rest hanging outside the box.
- Fixed: when a team has no logo, the abbreviation shown in its place could spill outside the coloured block and off the edge of the card.

## 0.44.0

- Added: the full-screen game now shows the league and network, the stadium, which side is home and which is away, both records, and — while the game is live — each team's win probability as a percentage next to the bar, not just a coloured sliver.
- Added: a small football against whichever team has the ball, so possession is readable at a glance rather than inferred from where the down and distance sits.
- Fixed: long team names were cut off with an ellipsis ("FLORIDA ST…") because the score was crowding them out. The score is slightly smaller and names now fit.
- Fixed: before kickoff the page showed each team's record twice, and drew three timeout markers for a game that had not started. Timeouts and possession now appear only once the ball is in play, and the record appears once.
- Fixed: the winning team's possession marker stayed on screen after the final whistle.
- Changed: the stadium and network moved from the bottom of the page to a strip across the top, leaving the footer for the situation and the last play.

## 0.43.3

- Added: a Football button in the Views grid on the Settings/remote screen, so you can put the display on the game from your phone. It is always listed there, unlike the Football tab in the navigation bar, which still only appears on the day of a game.

## 0.43.2

- Fixed: the full-screen game was laid out sideways on the display. The teams, score and clock sat in one row across the screen — a shape that suits a wide TV graphic, not a tall panel — so on the frame the team colours became narrow vertical stripes and the names and scores were squeezed into a sliver in the middle. The two teams now stack, one per full-width row, with the clock on a band between them, which is how a scoreboard reads anyway. A wide browser window still gets the side-by-side version.
- Changed: the scoreboard now sits centred on the display at its natural size instead of being stretched down the full height, so the team colour blocks are a reasonable size rather than tall slabs of solid colour — easier to read, and easier on an OLED.

## 0.43.1

- Added: tap the sports card on the home screen to open the full-screen game. On the display it takes the other panels with it, the way the sidebar buttons do; from a phone it just opens on the phone.
- Changed: the Football tab and the full-screen game are now up for the whole day of the game, midnight to midnight, instead of only around kickoff. The run-up in the morning and the rest of the evening after the final are both one tap away.
- Changed: before kickoff the full-screen page is a proper preview — both teams with their records, the kickoff time, how long until it starts, and the network and stadium — rather than the "no game in session" message it used to show until the ball was snapped.
- Note: the display still switches itself over at kickoff, not first thing in the morning, so having the tab up all day does not mean the panel gets taken over all day.

## 0.43.0

- Added: a full-screen scoreboard for the teams you track. When one of them kicks off, the display switches itself to it — team colours and helmets filling the sides, the score at scoreboard size, the quarter and clock between them, and ESPN's win probability as a bar along the bottom that slides as the game swings.
- Added: below the score, the things the small card on the home screen has no room for — the down and distance including the yard line, ESPN's description of the last play, the network showing it, the stadium, and both records.
- Added: a Football tab, which appears half an hour before kickoff and disappears about half an hour after the final. It is only there when there is a game, so tap it any time during one to get back to the scoreboard.
- Changed: about five minutes after the final whistle the display returns to Home on its own. If a movie was playing on Plex when the game started, it goes back to the poster instead.
- Note: no new configuration. This uses the `team_tracker_entities` you already have set; if that list is empty, nothing about the display changes.

## 0.42.0

- Added: a microphone button on the display. Tap it, speak, and the answer is spoken back through the display's own speaker. Speech recognition, the language model and the voice all run on your own Home Assistant — nothing is sent to a cloud service. Tap the button again, tap outside, or press Escape to cancel a turn at any point.
- Added: `assist_pipeline_id` configuration option, naming the Assist pipeline the button runs. Leave it empty and your preferred pipeline is used. To pin a specific one, open Settings → Voice assistants in Home Assistant, click the pipeline, and copy the long id out of the browser's address bar.
- Added: `assist_speaker` configuration option. Leave it empty and the reply is only spoken on the display, which is what you usually want. Set it to a media player (a HomePod, a speaker group) and the reply is played there as well — useful if you want to ask at the kitchen panel and hear the answer in another room.
- Note: the microphone button only appears when the display is loaded over https, you have allowed microphone access, and the configured pipeline exists. If it is missing, check those three in that order.

## 0.41.0

- Changed: on the frame and on phones the thermostats now wrap two across — four units read as 2x2 and the dials get the full width of the climate card instead of being squeezed into one row at the top of it. A wide desktop window, where the card is genuinely wide, still puts them all on one row.
- Changed: the home screen no longer flashes the word "loading" while it waits for Home Assistant. It now draws the real layout in placeholder form — clock and weather, thermostat dials (one per configured thermostat), energy, calendar, fans and status chips — that fades into the live data, so nothing jumps around when it arrives.

## 0.40.1

- Fixed: closing the thermostat dialog after changing the temperature sometimes bounced it back open, forcing a second close. It now stays closed.

## 0.40.0

- Added: front door card — when the porch person sensor trips, a card slides up over whatever the frame is showing, in the bottom-right corner, with the live front-door camera in it. It stays for 30 seconds and then hides itself; tap the X in its corner — or anywhere on the card — to dismiss it sooner. It shows on every screen, including the blank motion-off screen, so you always see who walked up.
- Changed: on a wide desktop browser window the thermostats now sit on a single row instead of wrapping onto a second line. The frame's own portrait layout is unchanged.
- Added: `person_entity` and `camera_entity` configuration options — the person/motion sensor that triggers the card (e.g. `binary_sensor.front_porch_person_detected`) and the camera it shows (e.g. `camera.front_porch_high`). Set them in the addon's Configuration tab after updating; leave either empty and the card never appears.

## 0.39.1

- Fixed: the addon failed to build, so 0.39.0 could not install. Team logos on the sports card are drawn with a plain image element now; the build completes and the card ships as described below.

## 0.39.0

- Added: sports card on the home overview — for each team you track with the TeamTracker integration it draws a college broadcast score bug. Team logos sit on end caps in the school's colours with a helmet stripe in its second colour, AP rank runs ahead of the name, and both scores face a dark centre block holding the period and game clock. Under each name is that team's remaining timeouts, or the down and distance when they have the ball. While the game is live a win-probability rule runs along the bottom in both schools' colours and the play-by-play reads underneath; scores roll over like a stadium scoreboard as they change. Before kickoff it shows the start time, both records, and the stadium; at the final the losing side dims. The card updates as the game does, with no refresh. A game appears in the 24 hours before kickoff and clears about six hours after the final, so the card is off the screen the rest of the week.
- Added: `team_tracker_entities` configuration option, listing the TeamTracker sensors to follow (one per team, e.g. `sensor.teamtracker_fsu`). Set it in the addon's Configuration tab after updating — leave it empty and the card never appears.
- Removed: the hourly forecast strip from the home overview, in both portrait and landscape. Current conditions still show in the header.

## 0.38.0

- Fixed: the energy figures were wrong. "Usage today" read far too high — 21.2 kWh at 10am on a day whose real usage was 16.6 — and yesterday's bar on the solar chart claimed 87.6 kWh against a real 52.3. The inverter's own "energy consumption today" sensor drifts and rolls over on the inverter's clock rather than at local midnight; the daily and monthly totals now come from the lifetime meters, so they match what the Home Assistant energy dashboard shows.
- Fixed: one bogus day on the yearly solar chart (an inverter reboot booked a 14,971 kWh spike in July, inflating the whole month) no longer counts.
- Added: `energy_lifetime_production` and `energy_lifetime_consumption` configuration options, naming the inverter's lifetime energy meters (for Enphase these are `sensor.envoy_<serial>_lifetime_energy_production` / `..._lifetime_energy_consumption`). Set them in the addon's Configuration tab after updating — leave them empty and the totals keep coming from the old "today" sensors.

## 0.37.0

- Changed: the marquee now shows nothing but the poster, filling the whole screen — the title, series or library line, rating, progress bar and time readout are gone. A poster wider or taller than the screen is cropped to fit.
- Fixed: marquee posters are no longer blurry — Home Assistant only hands out a 200x300 thumbnail, which turned to mush filling the screen. Set the new `plex_url` and `plex_token` options in the addon's Configuration tab and the poster is fetched from Plex at full size instead; leave them empty and nothing changes.
- Added: `plex_url` and `plex_token` configuration options. `plex_url` must be the `plex.direct` hostname (`https://10-0-0-5.<server-id>.plex.direct:32400`) — a bare IP address fails certificate validation. Get the token from Plex Web: any item, ... , Get Info, View XML, then copy `X-Plex-Token` out of the URL.

## 0.36.0

- Added: marquee screen — when a movie or show starts playing on Plex, the frame switches itself to a full-screen poster with the title, series or library details, and a progress bar; pausing keeps it up, and stopping sends the frame back to Home
- Added: `media_player_entity` configuration option naming the Plex media player to watch — set this in the addon's Configuration tab after updating, or the marquee stays off
- Added: the eye button hides and shows the navigation bar on the marquee screen, the same way it does on the photo slideshow; the navigation starts hidden there

## 0.35.0

- Added: fan speed slider in the thermostat pop-up — drag or tap the bars under the mode buttons to set the AC's fan mode (auto, low, medium, high, turbo, or whatever your unit reports); the command is sent when you let go
- Changed: the slider dims while the system is off, and is hidden entirely for thermostats that report no fan modes

## 0.34.0

- Changed: the lights, power, solar, timer, and control pages now use the same raised-card layout as the home overview — matching page padding, card corners, and section headers
- Changed: buttons, toggles, and light tiles are filled panels instead of thin outlines, so they stay visible on lower-quality panels
- Changed: cards, chips, and pop-up panels have tighter corners throughout
- Changed: text now uses each device's own system font instead of downloading Inter — the display paints text immediately, even with no internet
- Added: light groups on the lights page are collapsible and remember whether you left them open
- Fixed: controls on those pages were washed out or invisible in bright mode (timer ring, solar chart legend and tooltip, circuit bars, album picker)
- Fixed: on landscape displays the home overview's clock and temperature could overflow their card, clipping the temperature and pushing the degree sign onto its own line

## 0.32.3

- Changed: cards and chips in dark mode use brighter grays, so card edges (time/date, climate) are visible on lower-quality tablet panels
- Changed: muted and faint text is one step brighter, and clock face markers, dividers, and progress-bar tracks lightened to match

## 0.32.2

- Fixed: colors on the home overview
- Fixed: text overflowing its container
- Changed: latest bird detection now shows under the time
