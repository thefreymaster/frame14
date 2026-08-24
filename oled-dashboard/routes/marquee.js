import { Router } from "express";
import { HA_URL, HA_TOKEN } from "../config.js";
import { ENTITIES } from "../entities.js";
import { getState } from "../ha-socket.js";

const router = Router();

/**
 * Proxy the poster art for the configured media player.
 *
 * The poster path is read from the HA state cache server-side — the client never
 * supplies a URL. Forwarding a client-supplied path with the HA bearer token
 * attached would let anyone reach arbitrary internal HA endpoints.
 *
 * The `?v=` query param is ignored here; the client uses it to cache-bust when
 * the media changes.
 */
router.get("/art", async (_req, res) => {
  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return;
  }
  if (!ENTITIES.mediaPlayer) {
    res.status(503).json({ error: "No media player entity configured" });
    return;
  }

  const picture = getState(ENTITIES.mediaPlayer)?.attributes?.entity_picture;
  if (typeof picture !== "string" || !picture.startsWith("/api/")) {
    res.status(404).json({ error: "No artwork available" });
    return;
  }

  try {
    const response = await fetch(`${HA_URL}${picture}`, {
      headers: { Authorization: `Bearer ${HA_TOKEN}` },
    });
    if (!response.ok) {
      res.status(502).json({ error: `HA responded with ${response.status}` });
      return;
    }
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400");
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Media artwork proxy error:", err);
    res.status(500).json({ error: "Failed to proxy artwork from HA" });
  }
});

export default router;
