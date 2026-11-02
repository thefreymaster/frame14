import { Router } from "express";
import { IMMICH_URL, IMMICH_API_KEY, HA_URL, HA_TOKEN } from "../config.js";

const router = Router();

const ALBUM_ENTITY = "input_select.smart_frame_album";

router.get("/config", async (_req, res) => {
  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return;
  }

  try {
    const response = await fetch(`${HA_URL}/api/states/${ALBUM_ENTITY}`, {
      headers: {
        Authorization: `Bearer ${HA_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      res.status(502).json({ error: `HA responded with ${response.status}` });
      return;
    }
    const data = await response.json();
    const value = typeof data.state === "string" ? data.state.trim() : "";
    const defaultAlbumId =
      value && value !== "unknown" && value !== "unavailable" ? value : null;
    const options = Array.isArray(data.attributes?.options)
      ? data.attributes.options.filter((o) => typeof o === "string")
      : [];
    res.json({ defaultAlbumId, options });
  } catch (err) {
    console.error("HA album entity fetch error:", err);
    res.status(500).json({ error: "Failed to fetch album entity from HA" });
  }
});

router.post("/config", async (req, res) => {
  if (!HA_TOKEN) {
    res.status(503).json({ error: "HA_TOKEN not configured" });
    return;
  }
  const option = typeof req.body?.option === "string" ? req.body.option : "";
  if (!option) {
    res.status(400).json({ error: "Missing option" });
    return;
  }
  try {
    const response = await fetch(
      `${HA_URL}/api/services/input_select/select_option`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HA_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entity_id: ALBUM_ENTITY, option }),
      },
    );
    if (!response.ok) {
      res.status(502).json({ error: `HA responded with ${response.status}` });
      return;
    }
    res.json({ defaultAlbumId: option });
  } catch (err) {
    console.error("HA album entity set error:", err);
    res.status(500).json({ error: "Failed to set album entity in HA" });
  }
});

function immichHeaders() {
  return {
    "x-api-key": IMMICH_API_KEY,
    Accept: "application/json",
  };
}

function requireImmich(res) {
  if (!IMMICH_URL || !IMMICH_API_KEY) {
    res.status(503).json({ error: "Immich not configured" });
    return false;
  }
  return true;
}

router.get("/albums", async (_req, res) => {
  if (!requireImmich(res)) return;

  try {
    const response = await fetch(`${IMMICH_URL}/api/albums`, {
      headers: immichHeaders(),
    });
    if (!response.ok) {
      res
        .status(502)
        .json({ error: `Immich responded with ${response.status}` });
      return;
    }
    const albums = await response.json();
    res.json(
      albums.map((a) => ({
        id: a.id,
        albumName: a.albumName,
        assetCount: a.assetCount,
        thumbnailAssetId: a.albumThumbnailAssetId,
      })),
    );
  } catch (err) {
    console.error("Immich albums error:", err);
    res.status(500).json({ error: "Failed to fetch albums from Immich" });
  }
});

// Immich 3 dropped `assets` from GET /albums/:id, so the album's images come
// from metadata search instead, a page of up to 1000 at a time.
async function fetchAlbumImages(albumId) {
  const images = [];
  let cursor;
  do {
    const response = await fetch(`${IMMICH_URL}/api/search/metadata`, {
      method: "POST",
      headers: { ...immichHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        filter: { albumIds: { any: [albumId] }, type: { eq: "IMAGE" } },
        size: 1000,
        ...(cursor ? { cursor } : {}),
      }),
    });
    if (!response.ok) return { status: response.status };
    const { assets } = await response.json();
    for (const a of assets?.items ?? []) {
      images.push({
        id: a.id,
        createdAt: a.createdAt,
        takenAt: a.fileCreatedAt,
      });
    }
    cursor = assets?.nextCursor;
  } while (cursor);
  return { images };
}

router.get("/albums/:albumId", async (req, res) => {
  if (!requireImmich(res)) return;

  try {
    const response = await fetch(
      `${IMMICH_URL}/api/albums/${req.params.albumId}`,
      { headers: immichHeaders() },
    );
    if (!response.ok) {
      res
        .status(502)
        .json({ error: `Immich responded with ${response.status}` });
      return;
    }
    const album = await response.json();
    const { images, status } = await fetchAlbumImages(album.id);
    if (!images) {
      res.status(502).json({ error: `Immich search responded with ${status}` });
      return;
    }

    // The album's own order, as Immich shows it: by date taken, newest first
    // unless the album is set to oldest first. A fixed order (not a shuffle)
    // so the slideshow goes through every photo before it repeats one.
    const newestFirst = album.order !== "asc";
    images.sort((a, b) => {
      const diff = Date.parse(a.takenAt) - Date.parse(b.takenAt);
      return (newestFirst ? -diff : diff) || a.id.localeCompare(b.id);
    });

    res.json({
      id: album.id,
      albumName: album.albumName,
      assets: images.map(({ id, createdAt }) => ({ id, createdAt })),
    });
  } catch (err) {
    console.error("Immich album assets error:", err);
    res.status(500).json({ error: "Failed to fetch album assets from Immich" });
  }
});

router.get("/asset/:assetId/thumbnail", async (req, res) => {
  if (!requireImmich(res)) return;
  // Immich's 1440px preview for the slideshow; ?size=thumbnail is its small
  // one, for the remote's grid of the whole album.
  const size = req.query.size === "thumbnail" ? "thumbnail" : "preview";

  try {
    const response = await fetch(
      `${IMMICH_URL}/api/assets/${req.params.assetId}/thumbnail?size=${size}`,
      { headers: { "x-api-key": IMMICH_API_KEY } },
    );
    if (!response.ok) {
      res
        .status(502)
        .json({ error: `Immich responded with ${response.status}` });
      return;
    }
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400");
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Immich thumbnail error:", err);
    res.status(500).json({ error: "Failed to proxy thumbnail from Immich" });
  }
});

export default router;
