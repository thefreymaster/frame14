import type { HAState } from "../hooks/useEntity";

/** Home Assistant's MediaPlayerEntityFeature bits. */
export const MEDIA_FEATURES = {
  PAUSE: 1,
  SEEK: 2,
  VOLUME_SET: 4,
  VOLUME_MUTE: 8,
  PREVIOUS_TRACK: 16,
  NEXT_TRACK: 32,
  TURN_ON: 128,
  TURN_OFF: 256,
  VOLUME_STEP: 1024,
  SELECT_SOURCE: 2048,
  STOP: 4096,
  PLAY: 16384,
} as const;

export type MediaFeature = keyof typeof MEDIA_FEATURES;

/** A media_player entity's attributes; most go away when it is idle or off. */
export interface MediaPlayerAttrs {
  friendly_name?: string | null;
  supported_features?: number | null;
  media_title?: string | null;
  media_artist?: string | null;
  media_album_name?: string | null;
  media_series_title?: string | null;
  media_season?: string | number | null;
  media_episode?: string | number | null;
  media_content_type?: string | null;
  media_duration?: number | null;
  media_position?: number | null;
  media_position_updated_at?: string | null;
  volume_level?: number | null;
  is_volume_muted?: boolean | null;
  source?: string | null;
  source_list?: string[] | null;
  app_name?: string | null;
  entity_picture?: string | null;
}

/** States with something on: playing, paused or about to. */
const ACTIVE = new Set(["playing", "paused", "buffering"]);
const OFF = new Set(["off", "standby", "unavailable", "unknown"]);

const STATE_WORDS: Record<string, { label: string; palette: string }> = {
  playing: { label: "Playing", palette: "green" },
  paused: { label: "Paused", palette: "yellow" },
  buffering: { label: "Buffering", palette: "blue" },
  idle: { label: "Idle", palette: "gray" },
  on: { label: "On", palette: "gray" },
  off: { label: "Off", palette: "gray" },
  standby: { label: "Standby", palette: "gray" },
  unavailable: { label: "Unavailable", palette: "red" },
};

export interface MediaPlayerModel {
  entityId: string;
  name: string;
  state: string;
  /** The state as a word and a Chakra palette for its Badge. */
  label: string;
  palette: string;
  /** Not off: idle, on, or with something playing. */
  on: boolean;
  playing: boolean;
  /** Something is on: playing, paused or buffering. */
  active: boolean;
  title: string | null;
  /** The artist and album, the series and episode, or the app / source. */
  subtitle: string | null;
  /** The artwork through the server's proxy, cache-keyed on the media. */
  artUrl: string | null;
  /** Seconds, when the media has a length. */
  duration: number | null;
  /** Seconds into it now (extrapolated while playing), when known. */
  position: number | null;
  /** 0–100, when the player reports one. */
  volume: number | null;
  muted: boolean;
  source: string | null;
  sources: string[];
  can: (feature: MediaFeature) => boolean;
}

/** The entity id as a name while the state hasn't arrived: "living_room_tv" → "Living Room Tv". */
function nameFromId(entityId: string): string {
  return entityId
    .replace(/^media_player\./, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function num(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function subtitleOf(a: MediaPlayerAttrs): string | null {
  if (a.media_series_title) {
    const season = num(a.media_season);
    const episode = num(a.media_episode);
    const code =
      season != null && episode != null
        ? ` · S${season}E${episode}`
        : episode != null
          ? ` · E${episode}`
          : "";
    return `${a.media_series_title}${code}`;
  }
  if (a.media_artist) {
    return a.media_album_name
      ? `${a.media_artist} · ${a.media_album_name}`
      : a.media_artist;
  }
  return a.app_name ?? a.source ?? null;
}

/**
 * A media player as the card shows it, from its live state. `now` (ms)
 * carries the position forward from when Home Assistant last reported it,
 * while playing.
 */
export function mediaModel(
  entityId: string,
  state: HAState<MediaPlayerAttrs> | undefined,
  now: number,
): MediaPlayerModel {
  const a: MediaPlayerAttrs = state?.attributes ?? {};
  const s = state?.state ?? "unavailable";
  const features = a.supported_features ?? 0;
  const playing = s === "playing";
  const duration = num(a.media_duration);
  let position = num(a.media_position);
  if (position != null && playing && a.media_position_updated_at) {
    const since = (now - Date.parse(a.media_position_updated_at)) / 1000;
    if (Number.isFinite(since) && since > 0) position += since;
  }
  if (position != null && duration != null) {
    position = Math.max(0, Math.min(duration, position));
  }
  const volume = num(a.volume_level);
  const words = STATE_WORDS[s] ?? { label: s, palette: "gray" };
  const artKey = String(a.media_title ?? a.entity_picture ?? "art");

  return {
    entityId,
    name: a.friendly_name || nameFromId(entityId),
    state: s,
    label: words.label,
    palette: words.palette,
    on: !OFF.has(s),
    playing,
    active: ACTIVE.has(s),
    title: a.media_title ?? null,
    subtitle: subtitleOf(a),
    artUrl: a.entity_picture
      ? `/api/marquee/art?entity=${encodeURIComponent(entityId)}&v=${encodeURIComponent(artKey)}`
      : null,
    duration,
    position,
    volume: volume == null ? null : Math.round(volume * 100),
    muted: a.is_volume_muted === true,
    source: a.source ?? null,
    sources: a.source_list ?? [],
    can: (feature) => (features & MEDIA_FEATURES[feature]) !== 0,
  };
}

/** Seconds as "1:02:03" or "4:05". */
export function fmtMediaTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}
