import { Readable } from "node:stream";
import { HA_URL, HA_TOKEN } from "./config.js";

// Pictures from Home Assistant passed through with the server's token, for the
// printer's and the vacuum's pages. Callers derive the entity ID server-side
// (or check a requested one against the configured devices): forwarding a
// client-supplied path with the bearer token attached would let anyone reach
// arbitrary HA endpoints.

/** An image entity's picture (HA's image_proxy), e.g. a vacuum map. */
export async function sendHaImage(res, entityId, label) {
  try {
    const response = await fetch(
      `${HA_URL}/api/image_proxy/${encodeURIComponent(entityId)}`,
      { headers: { Authorization: `Bearer ${HA_TOKEN}` } },
    );
    if (!response.ok) {
      res.status(502).json({ error: `HA responded with ${response.status}` });
      return;
    }
    res.set(
      "Content-Type",
      response.headers.get("content-type") ?? "image/png",
    );
    // The page asks with ?v=<the entity's state>, which changes with the
    // picture, so a cached copy is never stale for long.
    res.set("Cache-Control", "private, max-age=3600");
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    console.error(`[${label}] image proxy error:`, err.message);
    res.status(500).json({ error: "Failed to proxy image from HA" });
  }
}

/**
 * A camera entity's MJPEG (HA's camera_proxy_stream), piped through until the
 * page lets go of it: aborting on disconnect is what stops HA (and whatever
 * feeds it) sending frames once the <img> is gone.
 */
export async function pipeHaMjpeg(res, entityId, label) {
  const controller = new AbortController();
  res.on("close", () => controller.abort());

  try {
    const response = await fetch(
      `${HA_URL}/api/camera_proxy_stream/${encodeURIComponent(entityId)}`,
      {
        headers: { Authorization: `Bearer ${HA_TOKEN}` },
        signal: controller.signal,
      },
    );
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
    console.error(`[${label}] stream proxy error:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to proxy camera stream from HA" });
    }
  }
}
