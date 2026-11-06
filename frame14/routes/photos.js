import { Router } from "express";

/**
 * The frames' photos (photos.js, app.locals.photos): the album they play and
 * the configured albums, the photos of one, and a photo's picture — all from
 * Home Assistant's Immich integration (0.162.0; Immich itself before).
 */
const router = Router();

function fail(res, err) {
  const status = Number.isInteger(err?.status) ? err.status : 500;
  if (status >= 500) console.error("[photos]", err?.message ?? err);
  res.status(status).json({ error: err?.message ?? "Photos failed" });
}

function requirePhotos(req, res) {
  const photos = req.app.locals.photos;
  if (!photos?.albumIds.length) {
    res.status(503).json({ error: "No immich_album_ids configured" });
    return null;
  }
  return photos;
}

router.get("/config", (req, res) => {
  // Without albums there is none to play: none, rather than an error
  // (/api/entities' `photos` says whether any are configured).
  const photos = req.app.locals.photos;
  res.json({
    defaultAlbumId: photos?.current() ?? null,
    options: [...(photos?.albumIds ?? [])],
  });
});

router.post("/config", (req, res) => {
  const photos = req.app.locals.photos;
  if (!photos?.albumIds.length) {
    res.status(404).json({ error: "No immich_album_ids configured" });
    return;
  }
  const option = typeof req.body?.option === "string" ? req.body.option : "";
  if (!photos.choose(option)) {
    res.status(400).json({ error: "Not one of immich_album_ids" });
    return;
  }
  // Every frame plays the new album (Photos.tsx reloads on it).
  req.app.locals.io?.emit("photos_refresh");
  res.json({ defaultAlbumId: option });
});

router.get("/albums", async (req, res) => {
  const photos = requirePhotos(req, res);
  if (!photos) return;
  try {
    res.json(await photos.albums());
  } catch (err) {
    fail(res, err);
  }
});

router.get("/albums/:albumId", async (req, res) => {
  const photos = requirePhotos(req, res);
  if (!photos) return;
  try {
    res.json(await photos.album(req.params.albumId));
  } catch (err) {
    fail(res, err);
  }
});

router.get("/asset/:assetId/thumbnail", async (req, res) => {
  const photos = requirePhotos(req, res);
  if (!photos) return;
  // Immich's 1440px preview for the slideshow; ?size=thumbnail is its small
  // one, for the remote's grid of the whole album.
  const size = req.query.size === "thumbnail" ? "thumbnail" : "preview";
  try {
    const { contentType, body } = await photos.image(req.params.assetId, size);
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400");
    res.send(body);
  } catch (err) {
    fail(res, err);
  }
});

export default router;
