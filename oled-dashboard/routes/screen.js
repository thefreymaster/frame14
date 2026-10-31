import { Router } from "express";
import { normaliseSchedule } from "../screen.js";

const STATES = new Set(["on", "off"]);

/**
 * The frames' screen (0.129), run by screen.js (app.locals.screen):
 *
 *   GET /api/screen            — the state last asked for, and the schedule
 *   GET /api/screen/:state     — `on` or `off`, now: the server sends `screen`
 *                                to every client, and a frame running in
 *                                Fully Kiosk Browser switches its screen
 *                                through Fully's JavaScript interface
 *                                (src/components/ScreenListener); a remote
 *                                or any other browser ignores it. For a Home
 *                                Assistant `rest_command`, like
 *                                /api/change/:view — in place of Fully's
 *                                Remote Admin API, which the Fully Kiosk
 *                                integration polls and kept losing — and the
 *                                Settings page's switch (ScreenBoard).
 *   PUT /api/screen/schedule   — { enabled, on, off }: the hours the screen
 *                                is on, saved and applied at once.
 *
 * Anything but on / off, or not a schedule, is a 400.
 */
const router = Router();

router.get("/screen", (req, res) => {
  res.json(req.app.locals.screen.state());
});

router.put("/screen/schedule", (req, res) => {
  const schedule = normaliseSchedule(req.body);
  if (!schedule) {
    res.status(400).json({
      error: "A schedule is { enabled, on, off }: on and off as HH:MM, and not the same.",
    });
    return;
  }
  console.log({ event: "screen_schedule", ...schedule });
  res.json(req.app.locals.screen.setSchedule(schedule));
});

router.get("/screen/:state", (req, res) => {
  const { state } = req.params;
  if (!STATES.has(state)) {
    res.status(400).json({ error: `The screen goes "on" or "off", not "${state}".` });
    return;
  }
  console.log({ event: "screen", state });
  req.app.locals.screen.set(state);
  res.sendStatus(200);
});

export default router;
