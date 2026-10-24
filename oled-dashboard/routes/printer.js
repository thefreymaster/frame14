import { Router } from "express";
import { HA_TOKEN } from "../config.js";
import { getState } from "../ha-socket.js";
import { pipeHaMjpeg, sendHaImage } from "../ha-proxy.js";
import { printerEntities } from "../printer-entities.js";

const router = Router();

// The /printer page's pictures. Every entity ID is derived from the configured
// printer (printer-entities.js), never taken from the client.

function guard(res, entityId) {
  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return false;
  }
  if (!entityId || !getState(entityId)) {
    res.status(404).json({ error: "The printer has no such entity" });
    return false;
  }
  return true;
}

/** The printer's camera, live (MJPEG). */
router.get("/camera/stream", (_req, res) => {
  const id = printerEntities()?.camera;
  if (!guard(res, id)) return;
  void pipeHaMjpeg(res, id, "printer");
});

/** The job's model thumbnail (the integration's cover image). */
router.get("/cover", (_req, res) => {
  const id = printerEntities()?.cover;
  if (!guard(res, id)) return;
  void sendHaImage(res, id, "printer");
});

export default router;
