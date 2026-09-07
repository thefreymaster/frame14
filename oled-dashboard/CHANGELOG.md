# Changelog

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
