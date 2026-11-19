import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { HA_TOKEN, HA_URL } from "./config.js";
import { normaliseNotification } from "./push.js";
import { DATA_DIR } from "./screen.js";

/**
 * What a camera saw when a notification went out (0.178.0, the user: "I'd
 * love a screenshot attached to it too", then "Can the notification include
 * a gif?"). A phone's web push can't carry a picture — an iPhone shows none,
 * a GIF neither — so the picture is a page instead: a `frame14_notify` that
 * names a `camera` makes a moment here, a still from that camera taken
 * through Home Assistant's camera_proxy at once, and the notification opens
 * /seen/<id> on it. A clip (the walk-up, recorded and turned into a GIF by
 * the automation) comes after in a `frame14_clip` event: `{ tag, media }`,
 * `media` a path under Home Assistant's /media/ view (local media), fetched
 * with HA_TOKEN and added to the newest moment with that tag that has none,
 * from the last CLIP_WINDOW_MS — unless Home Assistant says the file was
 * written before the moment (STALE_CLIP_MS). Both are copied here, beside the screen's
 * file (screen.js's DATA_DIR) in seen/, with seen.json listing the moments:
 * MAX_MOMENTS at most and none older than MAX_AGE_MS — a dropped moment's
 * files go with it.
 *
 * A moment's id is the server's, random, never Home Assistant's; the camera
 * and the path are held to their shapes before anything is fetched, and only
 * pictures and videos are kept, so the token can't be pointed at the rest of
 * Home Assistant.
 */

export const MAX_MOMENTS = 20;
export const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** How long after its still a moment takes a clip. */
export const CLIP_WINDOW_MS = 5 * 60 * 1000;
const STILL_TIMEOUT_MS = 8_000;
const CLIP_TIMEOUT_MS = 30_000;
const STILL_MAX_BYTES = 15 * 1024 * 1024;
const CLIP_MAX_BYTES = 30 * 1024 * 1024;
/**
 * A clip written this long before its moment is an older one's: an
 * automation that writes the same file each time, whose `camera.record`
 * skipped an unavailable camera without an error, would hand over the last
 * visit's walk-up. Home Assistant's /media/ view says when a file was written
 * (Last-Modified); a clip is recorded after its notification, with a few
 * seconds of lookback.
 */
export const STALE_CLIP_MS = 60_000;

const CAMERA = /^camera\.[a-z0-9_]+$/;
const ID = /^[A-Za-z0-9_-]{16}$/;
const TAG = /^[^\s]{1,64}$/;
const STILL_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const CLIP_TYPES = { "image/gif": "gif", "video/mp4": "mp4", "video/webm": "webm" };
const EXT_TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
};

/** Whether `id` is a moment's id as this server makes them. */
export const isMomentId = (id) => typeof id === "string" && ID.test(id);

/**
 * Whether `media` is a file under Home Assistant's /media/ view — local
 * media, `/media/<source dir>/<path>` as `camera.record` and
 * `shell_command` write it under /media — and nothing else of HA's.
 */
export function mediaPathAllowed(media) {
  if (typeof media !== "string" || media.length > 512) return false;
  const m = /^\/media\/([a-z0-9_]+)\/(.+)$/.exec(media);
  if (!m) return false;
  return m[2]
    .split("/")
    .every((seg) => /^[A-Za-z0-9_.-]+$/.test(seg) && seg !== "." && seg !== "..");
}

// Absolute: res.sendFile takes no other (FRAME14_DATA_DIR may be relative).
const SEEN_DIR = path.resolve(DATA_DIR, "seen");
const INDEX_FILE = path.join(SEEN_DIR, "seen.json");

function readIndex() {
  try {
    const saved = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
    if (!Array.isArray(saved?.moments)) return [];
    return saved.moments
      .filter((m) => isMomentId(m?.id) && typeof m.at === "string")
      .map((m) => ({
        ...m,
        still: EXT_TYPES[m.still] ? m.still : null,
        clip: EXT_TYPES[m.clip] ? m.clip : null,
      }));
  } catch {
    return [];
  }
}

/** What a page is told of a moment: its words and where its pictures are. */
function publicMoment(m) {
  return {
    id: m.id,
    at: m.at,
    camera: m.camera,
    title: m.title,
    message: m.message,
    still: m.still ? `/api/seen/${m.id}/still` : null,
    clip: m.clip ? { url: `/api/seen/${m.id}/clip`, type: EXT_TYPES[m.clip] } : null,
  };
}

/**
 * The moments. `notification(data)` takes a `frame14_notify`'s data and, when
 * it names a camera, makes a moment (its still fetched before it resolves)
 * and gives back the data with the tap's `url` its page; otherwise, or when
 * no moment can be made, the data as it came. `attachClip({ tag, media })`
 * adds a clip to the moment it belongs to and resolves to that moment, or
 * null. `get(id)` is what a page is told, `file(id, "still" | "clip")` the
 * path and type of a picture, both null for a moment there isn't.
 */
export function startSeen({ haUrl = HA_URL, haToken = HA_TOKEN, now = () => Date.now() } = {}) {
  let moments = readIndex();

  function save() {
    try {
      fs.mkdirSync(SEEN_DIR, { recursive: true });
      // A clip still on its way is none yet, should the add-on stop meanwhile.
      const kept = moments.map((m) => (m.clip === "pending" ? { ...m, clip: null } : m));
      fs.writeFileSync(INDEX_FILE, JSON.stringify({ moments: kept }));
    } catch (err) {
      console.error("[seen] couldn't save the moments:", err.message);
    }
  }

  function filesOf(m) {
    return [m.still && `${m.id}.${m.still}`, m.clip && `${m.id}-clip.${m.clip}`].filter(Boolean);
  }

  /** The newest MAX_MOMENTS younger than MAX_AGE_MS; the rest's files go. */
  function prune() {
    const cutoff = now() - MAX_AGE_MS;
    const keep = moments
      .filter((m) => Date.parse(m.at) >= cutoff)
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .slice(0, MAX_MOMENTS);
    const kept = new Set(keep.map((m) => m.id));
    for (const m of moments) {
      if (kept.has(m.id)) continue;
      for (const f of filesOf(m)) fs.rmSync(path.join(SEEN_DIR, f), { force: true });
    }
    moments = keep;
  }

  /** A file from Home Assistant with the token: its bytes and extension, or null. */
  async function fetchFromHa(url, types, maxBytes, timeoutMs, label) {
    if (!haToken) return null;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${haToken}` },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        console.warn(`[seen] ${label}: Home Assistant answered ${res.status}`);
        return null;
      }
      const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      const ext = types[type];
      if (!ext) {
        console.warn(`[seen] ${label}: not a picture (${type || "no type"})`);
        return null;
      }
      if (Number(res.headers.get("content-length") ?? 0) > maxBytes) {
        console.warn(`[seen] ${label}: too big`);
        return null;
      }
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length === 0 || bytes.length > maxBytes) {
        console.warn(`[seen] ${label}: ${bytes.length ? "too big" : "empty"}`);
        return null;
      }
      const modified = Date.parse(res.headers.get("last-modified") ?? "");
      return { bytes, ext, modified: Number.isFinite(modified) ? modified : null };
    } catch (err) {
      console.warn(`[seen] ${label}:`, err.message);
      return null;
    }
  }

  function write(name, bytes) {
    fs.mkdirSync(SEEN_DIR, { recursive: true });
    fs.writeFileSync(path.join(SEEN_DIR, name), bytes);
  }

  return {
    async notification(data) {
      const camera = data?.camera;
      const words = normaliseNotification(data);
      if (!words || typeof camera !== "string" || !CAMERA.test(camera)) return data;
      const tag = typeof data.tag === "string" && TAG.test(data.tag.trim()) ? data.tag.trim() : null;
      // Listed before its still arrives, so a quick clip finds it.
      const moment = {
        id: crypto.randomBytes(12).toString("base64url"),
        at: new Date(now()).toISOString(),
        camera,
        title: words.title,
        message: words.body,
        ...(tag ? { tag } : {}),
        still: null,
        clip: null,
      };
      moments.push(moment);
      prune();
      save();
      const still = await fetchFromHa(
        `${haUrl}/api/camera_proxy/${encodeURIComponent(camera)}`,
        STILL_TYPES,
        STILL_MAX_BYTES,
        STILL_TIMEOUT_MS,
        `${camera}'s still`,
      );
      if (still && moments.includes(moment)) {
        try {
          write(`${moment.id}.${still.ext}`, still.bytes);
          moment.still = still.ext;
          save();
        } catch (err) {
          console.error("[seen] couldn't save the still:", err.message);
        }
      }
      return { ...data, url: `/seen/${moment.id}` };
    },

    async attachClip(data) {
      const media = data?.media;
      if (!mediaPathAllowed(media)) {
        console.warn("[seen] frame14_clip: `media` isn't a path under /media/");
        return null;
      }
      const tag = typeof data.tag === "string" ? data.tag.trim() : null;
      const since = now() - CLIP_WINDOW_MS;
      const moment = moments
        .filter((m) => !m.clip && Date.parse(m.at) >= since && (!tag || m.tag === tag))
        .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
      if (!moment) {
        console.warn(`[seen] frame14_clip: no moment${tag ? ` tagged ${tag}` : ""} waiting for a clip`);
        return null;
      }
      // Taken at once: a second clip for the same tag goes to the moment before.
      moment.clip = "pending";
      const clip = await fetchFromHa(`${haUrl}${media}`, CLIP_TYPES, CLIP_MAX_BYTES, CLIP_TIMEOUT_MS, media);
      if (!moments.includes(moment)) return null;
      if (clip?.modified != null && clip.modified < Date.parse(moment.at) - STALE_CLIP_MS) {
        console.warn(`[seen] frame14_clip: ${media} was written before the notification — an older clip, left out`);
        moment.clip = null;
        return null;
      }
      if (!clip) {
        moment.clip = null;
        return null;
      }
      try {
        write(`${moment.id}-clip.${clip.ext}`, clip.bytes);
        moment.clip = clip.ext;
        save();
      } catch (err) {
        console.error("[seen] couldn't save the clip:", err.message);
        moment.clip = null;
        return null;
      }
      return publicMoment(moment);
    },

    get(id) {
      const m = moments.find((x) => x.id === id);
      return m ? publicMoment({ ...m, clip: m.clip === "pending" ? null : m.clip }) : null;
    },

    file(id, kind) {
      const m = moments.find((x) => x.id === id);
      const ext = kind === "still" ? m?.still : kind === "clip" ? m?.clip : null;
      if (!ext || ext === "pending" || !EXT_TYPES[ext]) return null;
      return {
        path: path.join(SEEN_DIR, kind === "still" ? `${m.id}.${ext}` : `${m.id}-clip.${ext}`),
        type: EXT_TYPES[ext],
      };
    },
  };
}
