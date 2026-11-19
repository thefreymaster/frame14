import { Router } from "express";
import { isMomentId } from "../seen.js";

/**
 * What a camera saw when a notification went out (0.178.0), kept by seen.js
 * (app.locals.seen) — the page a tap on such a notification opens:
 *
 *   GET /api/seen/:id        — the moment: when, the camera, the words, and
 *                              where its still and clip are (null until there)
 *   GET /api/seen/:id/still  — the camera's still from that moment
 *   GET /api/seen/:id/clip   — the clip the automation sent after (a GIF, or
 *                              an MP4 / WebM)
 *
 * 404 for an id that isn't one, or a moment that's gone (MAX_MOMENTS,
 * MAX_AGE_MS). What's kept comes from Home Assistant's events, never a route.
 */
const router = Router();

router.get("/:id", (req, res) => {
  const moment = isMomentId(req.params.id) && req.app.locals.seen.get(req.params.id);
  if (!moment) {
    res.status(404).json({ error: "No such moment" });
    return;
  }
  res.set("Cache-Control", "no-store");
  res.json(moment);
});

for (const kind of ["still", "clip"]) {
  router.get(`/:id/${kind}`, (req, res) => {
    const file = isMomentId(req.params.id) && req.app.locals.seen.file(req.params.id, kind);
    if (!file) {
      res.status(404).json({ error: `No ${kind} for that moment` });
      return;
    }
    // A moment's pictures never change once kept; Range for a video's seeking.
    res.sendFile(file.path, {
      headers: { "Content-Type": file.type, "Cache-Control": "private, max-age=604800, immutable" },
    }, (err) => {
      if (err && !res.headersSent) res.status(404).json({ error: `No ${kind} for that moment` });
    });
  });
}

export default router;
