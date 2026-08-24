/** Attributes exposed by a Plex media_player entity. All optional — the entity
 *  drops most of them when it goes idle or unavailable. */
export interface PlexAttrs {
  entity_picture?: string;
  media_title?: string;
  media_content_type?: string;
  media_content_id?: string | number;
  media_duration?: number;
  media_position?: number;
  media_position_updated_at?: string;
  media_library_title?: string;
  media_content_rating?: string;
  media_series_title?: string;
  media_season?: string | number;
  media_episode?: string | number;
  media_summary?: string;
}

/** States where something is actually on screen and worth showing. */
export const ACTIVE_STATES = new Set(["playing", "paused", "buffering"]);

export function isActive(state: string | undefined) {
  return !!state && ACTIVE_STATES.has(state);
}

/**
 * URL for the poster proxy.
 *
 * The server reads the real `entity_picture` path from its own state cache; the
 * `v` here is only a cache key so the browser refetches when the media changes.
 */
export function artUrl(attrs: PlexAttrs | undefined): string | null {
  if (!attrs?.entity_picture) return null;
  const key = String(attrs.media_content_id ?? attrs.media_title ?? "art");
  return `/api/marquee/art?v=${encodeURIComponent(key)}`;
}

export function mediaTitle(attrs: PlexAttrs | undefined): string | null {
  return attrs?.media_title ?? null;
}

/** "Bluey · S1 · E12" for episodes, "Movies · G" for films. */
export function mediaSubtitle(attrs: PlexAttrs | undefined): string | null {
  if (!attrs) return null;

  if (attrs.media_series_title) {
    const parts = [attrs.media_series_title];
    if (attrs.media_season != null) parts.push(`S${attrs.media_season}`);
    if (attrs.media_episode != null) parts.push(`E${attrs.media_episode}`);
    return parts.join(" · ");
  }

  const parts = [attrs.media_library_title, attrs.media_content_rating].filter(
    (p): p is string => !!p,
  );
  return parts.length ? parts.join(" · ") : null;
}

/**
 * Elapsed seconds, extrapolated from the last position HA reported.
 *
 * HA only pushes `media_position` when it jumps (seek, play, pause), so a
 * playing title needs the wall-clock delta since `media_position_updated_at`
 * added on top. Returns null when the integration omits position entirely.
 */
export function elapsedSeconds(
  attrs: PlexAttrs | undefined,
  state: string | undefined,
  now: number = Date.now(),
): number | null {
  const position = attrs?.media_position;
  const duration = attrs?.media_duration;
  if (!Number.isFinite(position) || !Number.isFinite(duration)) return null;

  let elapsed = position as number;
  if (state === "playing" && attrs?.media_position_updated_at) {
    const updatedAt = Date.parse(attrs.media_position_updated_at);
    if (Number.isFinite(updatedAt)) {
      elapsed += Math.max(0, (now - updatedAt) / 1000);
    }
  }
  return Math.min(elapsed, duration as number);
}

export function progressPct(
  attrs: PlexAttrs | undefined,
  state: string | undefined,
  now?: number,
): number | null {
  const elapsed = elapsedSeconds(attrs, state, now);
  const duration = attrs?.media_duration;
  if (elapsed == null || !duration) return null;
  return Math.min(100, Math.max(0, (elapsed / duration) * 100));
}

/** 5311 -> "1:28:31", 95 -> "1:35" */
export function formatDuration(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
