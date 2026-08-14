# Changelog

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
