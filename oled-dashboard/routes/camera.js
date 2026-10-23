import { Router } from "express";
import { Readable } from "node:stream";
import { HA_URL, HA_TOKEN } from "../config.js";
import { ENTITIES } from "../entities.js";
import { sendCommand } from "../ha-socket.js";

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

// HA's HLS files under a stream's access token: the master and media
// playlists, the init segment, and (LL-HLS part) segments. Anything else is
// refused, so the proxy can't be pointed at the rest of HA. The token is the
// stream's own credential; no bearer token is sent with these.
const HLS_TOKEN_RE = /^[A-Za-z0-9_-]{8,128}$/;
const HLS_FILE_RE =
  /^(master_playlist\.m3u8|playlist\.m3u8|init\.mp4|segment\/\d+(\.\d+)?\.m4s)$/;
// LL-HLS blocking-reload parameters, the only query HA's playlists take.
const HLS_QUERY_KEYS = ["_HLS_msn", "_HLS_part"];

/**
 * Start (or join) HA's live HLS stream of the camera — HA's own player path,
 * which works for an RTSP camera whose stills don't (a Generic camera with no
 * still image URL). HA answers with /api/hls/<token>/master_playlist.m3u8;
 * the browser gets the same path under this add-on's proxy below, because it
 * can't reach ha_url (normally http://supervisor/core).
 */
router.get("/hls", async (_req, res) => {
  if (!guard(res)) return;

  try {
    const result = await sendCommand(
      "camera/stream",
      { entity_id: ENTITIES.camera, format: "hls" },
      20_000,
    );
    const match = /^\/api\/hls\/([^/]+)\/master_playlist\.m3u8$/.exec(
      result?.url ?? "",
    );
    if (!match || !HLS_TOKEN_RE.test(match[1])) {
      res.status(502).json({ error: "Unexpected stream URL from HA" });
      return;
    }
    res.set("Cache-Control", "no-store");
    res.json({ url: `/api/camera/hls/${match[1]}/master_playlist.m3u8` });
  } catch (err) {
    console.error("[camera] HLS start failed:", err?.message ?? err);
    res.status(502).json({ error: "HA could not start the camera stream" });
  }
});

/** HA's HLS playlists and segments, proxied for the browser (see /hls). */
router.get("/hls/:token/*file", async (req, res) => {
  const { token } = req.params;
  const file = [].concat(req.params.file).join("/");
  if (!HLS_TOKEN_RE.test(token) || !HLS_FILE_RE.test(file)) {
    res.status(404).end();
    return;
  }

  const query = new URLSearchParams();
  for (const key of HLS_QUERY_KEYS) {
    const value = req.query[key];
    if (typeof value === "string" && /^\d+$/.test(value)) query.set(key, value);
  }
  const qs = query.size ? `?${query}` : "";

  // A blocking LL-HLS playlist request can be held open; drop it with the
  // client.
  const controller = new AbortController();
  res.on("close", () => controller.abort());

  try {
    const response = await fetch(`${HA_URL}/api/hls/${token}/${file}${qs}`, {
      signal: controller.signal,
    });
    res.status(response.status);
    res.set(
      "Content-Type",
      response.headers.get("content-type") ?? "application/octet-stream",
    );
    res.set("Cache-Control", "no-store");
    if (!response.body) {
      res.end();
      return;
    }
    const stream = Readable.fromWeb(response.body);
    stream.on("error", () => res.end());
    stream.pipe(res);
  } catch (err) {
    if (controller.signal.aborted) return;
    console.error("[camera] HLS proxy error:", err?.message ?? err);
    if (!res.headersSent) res.status(502).end();
  }
});

/** Single still — the fallback the card polls when the live stream fails. */
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
