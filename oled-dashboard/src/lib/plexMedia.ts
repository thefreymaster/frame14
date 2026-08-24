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
