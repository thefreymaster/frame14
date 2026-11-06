import fs from "node:fs";
import path from "node:path";
import { HA_URL, HA_TOKEN } from "./config.js";
import { ENTITIES } from "./entities.js";
import { isHaConnected, sendCommand } from "./ha-socket.js";
import { DATA_DIR } from "./screen.js";

/**
 * The frames' photos (0.162.0): Immich albums through Home Assistant's Immich
 * integration. HA's media source lists them (`media_source/browse_media` on
 * ha-socket.js's connection) and HA's /immich view serves the pictures, both
 * signed in with HA_TOKEN, so the add-on keeps no Immich address or key of
 * its own. `immich_album_ids` (ENTITIES.albums) are the albums the frames may
 * play; the one they play is kept here (photos.json, beside the screen's
 * file), the first configured until one is picked. Only those albums' photos
 * are served: a picture is proxied once a listing of a configured album has
 * named it. HA lists at most 2000 photos an album (aioimmich's 20 pages of
 * 100), in Immich's order: newest taken first.
 */

const FILE = path.join(DATA_DIR, "photos.json");
const ROOT = "media-source://immich";
/** A listing is reused this long, so frames and remotes asking together cost one browse. */
export const LISTING_TTL_MS = 60_000;
const BROWSE_TIMEOUT_MS = 30_000;
const IMAGE_TIMEOUT_MS = 20_000;
// Immich's ids are UUIDs; nothing else reaches a URL.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The sizes the pages ask for: Immich's 1440px preview and its small thumbnail. */
export const PHOTO_SIZES = Object.freeze(["preview", "thumbnail"]);

function albumIdsFrom(raw) {
  const ids = [];
  for (const value of Array.isArray(raw) ? raw : []) {
    const id = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (!UUID.test(id)) {
      console.warn(`[photos] ${JSON.stringify(value)} isn't an Immich album id; left out`);
    } else if (!ids.includes(id)) {
      ids.push(id);
    }
  }
  return Object.freeze(ids);
}

/** The configured albums, in their order, each once. */
export const ALBUM_IDS = albumIdsFrom(ENTITIES.albums);
/** Photos are set up: an album is configured (/api/entities' `photos`). */
export const PHOTOS_ENABLED = ALBUM_IDS.length > 0;

/** A refusal with the status the route answers. */
export class PhotosError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * A media source item's identifier, split as HA's Immich source splits it:
 * account (the config entry's unique id) | collection | collection id |
 * asset id | file name | mime type.
 */
function partsOf(mediaContentId) {
  if (typeof mediaContentId !== "string" || !mediaContentId.startsWith(`${ROOT}/`)) {
    return [];
  }
  return mediaContentId.slice(ROOT.length + 1).split("|");
}

async function browse(mediaContentId) {
  try {
    return await sendCommand(
      "media_source/browse_media",
      { media_content_id: mediaContentId },
      BROWSE_TIMEOUT_MS,
    );
  } catch (err) {
    if (!isHaConnected()) throw new PhotosError(503, "Home Assistant isn't connected");
    throw new PhotosError(502, `Home Assistant's Immich: ${err.message}`);
  }
}

/** `load()` once per `ttl`, shared by the callers meanwhile; a failure isn't kept. */
function cached(load, ttl) {
  let entry = null;
  return () => {
    if (entry && Date.now() - entry.at < ttl) return entry.promise;
    const promise = load();
    entry = { at: Date.now(), promise };
    promise.catch(() => {
      if (entry?.promise === promise) entry = null;
    });
    return promise;
  };
}

function loadChoice() {
  try {
    const saved = JSON.parse(fs.readFileSync(FILE, "utf-8"));
    return typeof saved?.albumId === "string" ? saved.albumId : null;
  } catch {
    return null;
  }
}

function saveChoice(albumId) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify({ albumId }));
  } catch (err) {
    console.error(`[photos] couldn't save ${FILE}:`, err.message);
  }
}

/**
 * The photos: `albumIds` the configured albums; `current()` the one the
 * frames play, `choose(id)` picks one of them (false for any other);
 * `albums()` names them from HA; `album(id)` lists a configured album's
 * photos, `{ id, albumName, assets: [{ id }] }`; `image(assetId, size)` is
 * one of their pictures, `{ contentType, body }`. Each rejects with a
 * PhotosError.
 */
export function startPhotos() {
  let chosen = loadChoice();
  // The picture's account, for every photo a listing has named.
  const accountOf = new Map();

  // Every Immich account HA has, and their albums: id → { account, name }.
  const knownAlbums = cached(async () => {
    const root = await browse(ROOT);
    const albums = new Map();
    for (const item of root?.children ?? []) {
      const [account] = partsOf(item.media_content_id);
      if (!account) continue;
      const list = await browse(`${ROOT}/${account}|albums`);
      for (const album of list?.children ?? []) {
        const [, , albumId] = partsOf(album.media_content_id);
        if (albumId && !albums.has(albumId)) {
          albums.set(albumId, { account, name: album.title || albumId });
        }
      }
    }
    return albums;
  }, LISTING_TTL_MS);

  const listings = new Map(
    ALBUM_IDS.map((albumId) => [
      albumId,
      cached(async () => {
        const known = (await knownAlbums()).get(albumId);
        if (!known) {
          throw new PhotosError(404, `Home Assistant's Immich has no album ${albumId}`);
        }
        const listing = await browse(`${ROOT}/${known.account}|albums|${albumId}`);
        const assets = [];
        for (const item of listing?.children ?? []) {
          const [, , , assetId] = partsOf(item.media_content_id);
          const mime = String(item.media_content_type ?? "");
          // Videos are in albums too; the slideshow shows pictures.
          if (!assetId || !UUID.test(assetId) || !mime.startsWith("image/")) continue;
          accountOf.set(assetId, known.account);
          assets.push({ id: assetId });
        }
        return { id: albumId, albumName: listing?.title || known.name, assets };
      }, LISTING_TTL_MS),
    ]),
  );

  return {
    albumIds: ALBUM_IDS,
    current: () => (ALBUM_IDS.includes(chosen) ? chosen : (ALBUM_IDS[0] ?? null)),
    choose(albumId) {
      if (!ALBUM_IDS.includes(albumId)) return false;
      chosen = albumId;
      saveChoice(albumId);
      return true;
    },
    async albums() {
      const known = await knownAlbums();
      return ALBUM_IDS.map((id) => ({ id, albumName: known.get(id)?.name ?? id }));
    },
    album(albumId) {
      const listing = listings.get(albumId);
      if (!listing) {
        return Promise.reject(new PhotosError(404, "Not one of immich_album_ids"));
      }
      return listing();
    },
    async image(assetId, size) {
      if (!UUID.test(assetId) || !PHOTO_SIZES.includes(size)) {
        throw new PhotosError(404, "No such photo");
      }
      // A photo no listing has named yet (the add-on restarted under a
      // slideshow): list the albums again — cached, so at most once a minute.
      if (!accountOf.has(assetId)) {
        await Promise.all([...listings.values()].map((list) => list().catch(() => null)));
      }
      const account = accountOf.get(assetId);
      if (!account) throw new PhotosError(404, "Not a photo of immich_album_ids");
      let res;
      try {
        res = await fetch(
          `${HA_URL}/immich/${encodeURIComponent(account)}/${assetId}/${size}/image/jpeg`,
          {
            headers: { Authorization: `Bearer ${HA_TOKEN}` },
            signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
          },
        );
      } catch (err) {
        throw new PhotosError(502, `Couldn't reach Home Assistant: ${err.message}`);
      }
      if (!res.ok) {
        throw new PhotosError(502, `Home Assistant's Immich answered ${res.status}`);
      }
      return {
        contentType: res.headers.get("content-type") ?? "image/jpeg",
        body: Buffer.from(await res.arrayBuffer()),
      };
    },
  };
}
