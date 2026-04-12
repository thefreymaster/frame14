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
