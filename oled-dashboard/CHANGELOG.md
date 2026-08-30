# Changelog

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
