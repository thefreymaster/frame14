import { Router } from "express";
import {
  normaliseAuto,
  normaliseBrightness,
  normaliseDark,
  normaliseSchedule,
} from "../screen.js";

const STATES = new Set(["on", "off"]);

/**
 * The frames' screen (0.129; brightness and dark hours 0.131), run by
 * screen.js (app.locals.screen):
 *
 *   GET /api/screen                   — the state and brightness last asked
 *                                       for, the schedule and the dark hours
 *   GET /api/screen/:state            — `on` or `off`, now: the server sends
 *                                       `screen` to every client, and a frame
 *                                       running in Fully Kiosk Browser
 *                                       switches its screen through Fully's
 *                                       JavaScript interface
 *                                       (src/components/ScreenListener); a
 *                                       remote or any other browser ignores
 *                                       it. For a Home Assistant
 *                                       `rest_command`, like
 *                                       /api/change/:view — in place of
 *                                       Fully's Remote Admin API, which the
 *                                       Fully Kiosk integration polls and kept
 *                                       losing — and the Settings page's
 *                                       switch (ScreenBoard).
 *   GET /api/screen/brightness/:level — 0 to 255, now and kept: the server
 *                                       sends `brightness` the same way, and
 *                                       the screen comes back to this level
 *                                       when the dark hours end. The Settings
 *                                       page's slider, or a `rest_command`.
 *   PUT /api/screen/schedule          — { enabled, on, off }: the hours the
 *                                       screen is on, saved and applied.
 *   PUT /api/screen/dark              — { enabled, from, to }: the dark
 *                                       hours, when the screen is at its
 *                                       darkest, saved and applied.
 *   PUT /api/screen/auto              — { enabled, min, max } (0.137): the
 *                                       brightness from the room's light, as
 *                                       the frame's light sensor reads it,
 *                                       between the two levels; saved and
 *                                       applied.
 *
 * Anything but on / off, a level outside 0–255, not a pair of hours, or a
 * range whose min isn't below its max is a 400.
 */
const router = Router();

router.get("/screen", (req, res) => {
  res.json(req.app.locals.screen.state());
});

router.put("/screen/schedule", (req, res) => {
  const schedule = normaliseSchedule(req.body);
  if (!schedule) {
    res.status(400).json({
      error:
        "A schedule is { enabled, on, off }: on and off as HH:MM, and not the same.",
    });
    return;
  }
  console.log({ event: "screen_schedule", ...schedule });
  res.json(req.app.locals.screen.setSchedule(schedule));
});

router.put("/screen/dark", (req, res) => {
  const dark = normaliseDark(req.body);
  if (!dark) {
    res.status(400).json({
      error:
        "Dark hours are { enabled, from, to }: from and to as HH:MM, and not the same.",
    });
    return;
  }
  console.log({ event: "screen_dark", ...dark });
  res.json(req.app.locals.screen.setDark(dark));
});

router.put("/screen/auto", (req, res) => {
  const auto = normaliseAuto(req.body);
  if (!auto) {
    res.status(400).json({
      error:
        "Brightness from the room is { enabled, min, max }: levels from 0 to 255, min below max.",
    });
    return;
  }
  console.log({ event: "screen_auto", ...auto });
  res.json(req.app.locals.screen.setAuto(auto));
});

router.get("/screen/brightness/:level", (req, res) => {
  const level = normaliseBrightness(req.params.level);
  if (level === null) {
    res
      .status(400)
      .json({ error: "Brightness is a whole number from 0 to 255." });
    return;
  }
  console.log({ event: "screen_brightness", level });
  res.json(req.app.locals.screen.setBrightness(level));
});

router.get("/screen/:state", (req, res) => {
  const { state } = req.params;
  if (!STATES.has(state)) {
    res
      .status(400)
      .json({ error: `The screen goes "on" or "off", not "${state}".` });
    return;
  }
  console.log({ event: "screen", state });
  req.app.locals.screen.set(state);
  res.sendStatus(200);
});

export default router;
