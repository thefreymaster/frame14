import { Router } from "express";
import { IMMICH_URL, IMMICH_API_KEY, IMMICH_ALBUM_ID } from "../config.js";

const router = Router();

router.get("/config", (_req, res) => {
  res.json({ defaultAlbumId: IMMICH_ALBUM_ID || null });
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
      res.status(502).json({ error: `Immich responded with ${response.status}` });
      return;
    }
    const albums = await response.json();
    res.json(
      albums.map((a) => ({
        id: a.id,
        albumName: a.albumName,
        assetCount: a.assetCount,
        thumbnailAssetId: a.albumThumbnailAssetId,
      }))
    );
  } catch (err) {
    console.error("Immich albums error:", err);
    res.status(500).json({ error: "Failed to fetch albums from Immich" });
  }
});

router.get("/albums/:albumId", async (req, res) => {
  if (!requireImmich(res)) return;

  try {
    const response = await fetch(
      `${IMMICH_URL}/api/albums/${req.params.albumId}`,
      { headers: immichHeaders() }
    );
    if (!response.ok) {
      res.status(502).json({ error: `Immich responded with ${response.status}` });
      return;
    }
    const album = await response.json();
    const images = (album.assets ?? [])
      .filter((a) => a.type === "IMAGE")
      .map((a) => ({ id: a.id, createdAt: a.createdAt }));

    // Fisher-Yates shuffle
    for (let i = images.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [images[i], images[j]] = [images[j], images[i]];
    }

    res.json({ id: album.id, albumName: album.albumName, assets: images });
  } catch (err) {
    console.error("Immich album assets error:", err);
    res.status(500).json({ error: "Failed to fetch album assets from Immich" });
  }
});

router.get("/asset/:assetId/thumbnail", async (req, res) => {
  if (!requireImmich(res)) return;

  try {
    const response = await fetch(
      `${IMMICH_URL}/api/assets/${req.params.assetId}/thumbnail?size=preview`,
      { headers: { "x-api-key": IMMICH_API_KEY } }
    );
    if (!response.ok) {
      res.status(502).json({ error: `Immich responded with ${response.status}` });
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
