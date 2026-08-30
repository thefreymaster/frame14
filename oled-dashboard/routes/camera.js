import { Router } from "express";
import { Readable } from "node:stream";
import { HA_URL, HA_TOKEN } from "../config.js";
import { ENTITIES } from "../entities.js";

const router = Router();

/**
 * Live view of the configured camera.
 *
 * As with the marquee art, the entity ID is read from ENTITIES server-side and
 * never taken from the client — forwarding a client-supplied path with the HA
 * bearer token attached would let anyone reach arbitrary internal HA endpoints.
 */
function haCameraPath(kind) {
  return `${HA_URL}/api/${kind}/${encodeURIComponent(ENTITIES.camera)}`;
}

function guard(res) {
  if (!ENTITIES.camera) {
    res.status(503).json({ error: "No camera entity configured" });
    return false;
  }
  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return false;
  }
  return true;
}

/**
 * MJPEG stream proxied straight through from HA.
 *
 * The doorbell card only mounts its <img> while the card is up, so aborting on
 * client disconnect is what stops HA generating frames the moment it hides.
 */
router.get("/stream", async (req, res) => {
  if (!guard(res)) return;

  const controller = new AbortController();
  res.on("close", () => controller.abort());

  try {
    const response = await fetch(haCameraPath("camera_proxy_stream"), {
      headers: { Authorization: `Bearer ${HA_TOKEN}` },
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      res.status(502).json({ error: `HA responded with ${response.status}` });
      return;
    }

    res.set(
      "Content-Type",
      response.headers.get("content-type") ??
        "multipart/x-mixed-replace; boundary=frame",
    );
    res.set("Cache-Control", "no-store");

    const stream = Readable.fromWeb(response.body);
    stream.on("error", () => res.end());
    stream.pipe(res);
  } catch (err) {
    if (controller.signal.aborted) return;
    console.error("[camera] stream proxy error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to proxy camera stream from HA" });
    }
  }
});

/** Single still — the fallback the card polls when the MJPEG stream fails. */
router.get("/snapshot", async (_req, res) => {
  if (!guard(res)) return;

  try {
    const response = await fetch(haCameraPath("camera_proxy"), {
      headers: { Authorization: `Bearer ${HA_TOKEN}` },
    });
    if (!response.ok) {
      res.status(502).json({ error: `HA responded with ${response.status}` });
      return;
    }
    res.set("Content-Type", response.headers.get("content-type") ?? "image/jpeg");
    res.set("Cache-Control", "no-store");
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    console.error("[camera] snapshot proxy error:", err.message);
    res.status(500).json({ error: "Failed to proxy camera image from HA" });
  }
});

export default router;
