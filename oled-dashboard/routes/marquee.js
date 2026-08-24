import { Router } from "express";
import { HA_URL, HA_TOKEN, PLEX_URL, PLEX_TOKEN } from "../config.js";
import { ENTITIES } from "../entities.js";
import { getState } from "../ha-socket.js";

const router = Router();

/**
 * Poster size requested from Plex.
 *
 * The marquee covers the whole screen, so a 1080x1920 portrait frame crops a
 * 2:3 poster scaled to 1280x1920 — ask for that and let anything smaller scale
 * down. HA's own proxy hands back a 200x300 thumbnail, which turns to mush the
 * moment it fills a screen.
 */
const POSTER_WIDTH = 1280;
const POSTER_HEIGHT = 1920;

function sendImage(res, contentType, buffer) {
  res.set("Content-Type", contentType);
  res.set("Cache-Control", "public, max-age=86400");
  res.send(buffer);
}

/**
 * Full-resolution poster straight from Plex.
 *
 * `media_content_id` on the HA state is the Plex ratingKey, which is all the
 * transcoder needs to render the item's poster at any size. Returns null when
 * Plex isn't configured or anything goes wrong — the caller falls back to HA.
 */
async function fetchPlexPoster(ratingKey) {
  if (!PLEX_URL || !PLEX_TOKEN || ratingKey == null || ratingKey === "") {
    return null;
  }

  const thumb = `/library/metadata/${encodeURIComponent(ratingKey)}/thumb`;
  const url =
    `${PLEX_URL}/photo/:/transcode` +
    `?width=${POSTER_WIDTH}&height=${POSTER_HEIGHT}` +
    `&minSize=1&upscale=1` +
    `&url=${encodeURIComponent(thumb)}` +
    `&X-Plex-Token=${encodeURIComponent(PLEX_TOKEN)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(
        `[marquee] Plex poster ${ratingKey} responded ${response.status} — falling back to HA`,
      );
      return null;
    }
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    return { contentType, buffer: Buffer.from(await response.arrayBuffer()) };
  } catch (err) {
    console.warn(`[marquee] Plex poster fetch failed: ${err.message}`);
    return null;
  }
}

/**
 * Proxy the poster art for the configured media player.
 *
 * Prefers Plex directly when PLEX_URL/PLEX_TOKEN are set, because HA's
 * media_player_proxy only ever returns a 200x300 thumbnail. Falls back to that
 * proxy when Plex isn't configured or the fetch fails.
 *
 * Neither path takes a URL from the client: the poster is identified from the
 * HA state cache server-side. Forwarding a client-supplied path with the HA
 * bearer token attached would let anyone reach arbitrary internal HA endpoints.
 *
 * The `?v=` query param is ignored here; the client uses it to cache-bust when
 * the media changes.
 */
router.get("/art", async (_req, res) => {
  if (!ENTITIES.mediaPlayer) {
    res.status(503).json({ error: "No media player entity configured" });
    return;
  }

  const attributes = getState(ENTITIES.mediaPlayer)?.attributes;

  const poster = await fetchPlexPoster(attributes?.media_content_id);
  if (poster) {
    sendImage(res, poster.contentType, poster.buffer);
    return;
  }

  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return;
  }

  const picture = attributes?.entity_picture;
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
    sendImage(res, contentType, Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    console.error("Media artwork proxy error:", err);
    res.status(500).json({ error: "Failed to proxy artwork from HA" });
  }
});

export default router;
