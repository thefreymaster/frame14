import { describe, expect, it } from "vitest";
import type { HAState } from "../../src/hooks/useEntity";
import {
  fmtMediaTime,
  MEDIA_FEATURES,
  mediaModel,
  type MediaPlayerAttrs,
} from "../../src/lib/mediaPlayer";

const now = Date.parse("2026-10-29T16:00:00Z");
const state = (s: string, attributes: MediaPlayerAttrs = {}): HAState<MediaPlayerAttrs> => ({
  entity_id: "media_player.living_room_tv",
  state: s,
  attributes,
  last_changed: "",
  last_updated: "",
});

describe("mediaModel", () => {
  it("names a player from its id until its state arrives, as unavailable", () => {
    const m = mediaModel("media_player.living_room_tv", undefined, now);
    expect(m.name).toBe("Living Room Tv");
    expect(m).toMatchObject({ state: "unavailable", label: "Unavailable", palette: "red", on: false, active: false });
    expect(m.sources).toEqual([]);
  });

  it("reads the state's words and palette", () => {
    expect(mediaModel("media_player.x", state("playing"), now)).toMatchObject({ label: "Playing", palette: "green", on: true, playing: true, active: true });
    expect(mediaModel("media_player.x", state("paused"), now)).toMatchObject({ label: "Paused", palette: "yellow", active: true, playing: false });
    expect(mediaModel("media_player.x", state("idle"), now)).toMatchObject({ label: "Idle", on: true, active: false });
    expect(mediaModel("media_player.x", state("standby"), now)).toMatchObject({ label: "Standby", on: false });
    expect(mediaModel("media_player.x", state("weird"), now)).toMatchObject({ label: "weird", palette: "gray" });
  });

  it("carries the position forward while playing, clamped to the length", () => {
    const tenAgo = new Date(now - 10_000).toISOString();
    const playing = mediaModel("media_player.x", state("playing", { media_position: 100, media_duration: 500, media_position_updated_at: tenAgo }), now);
    expect(playing.position).toBe(110);
    const clamped = mediaModel("media_player.x", state("playing", { media_position: 100, media_duration: 105, media_position_updated_at: tenAgo }), now);
    expect(clamped.position).toBe(105);
    const paused = mediaModel("media_player.x", state("paused", { media_position: 100, media_duration: 500, media_position_updated_at: tenAgo }), now);
    expect(paused.position).toBe(100);
  });

  it("subtitles: the series and episode, the artist and album, or the app", () => {
    const sub = (a: MediaPlayerAttrs) => mediaModel("media_player.x", state("playing", a), now).subtitle;
    expect(sub({ media_series_title: "Show", media_season: 1, media_episode: "2" })).toBe("Show · S1E2");
    expect(sub({ media_series_title: "Show", media_episode: 2 })).toBe("Show · E2");
    expect(sub({ media_artist: "A", media_album_name: "B" })).toBe("A · B");
    expect(sub({ media_artist: "A" })).toBe("A");
    expect(sub({ app_name: "Netflix", source: "HDMI 1" })).toBe("Netflix");
    expect(sub({ source: "HDMI 1" })).toBe("HDMI 1");
    expect(sub({})).toBeNull();
  });

  it("volume as a percentage, mute, sources and the artwork through the proxy", () => {
    const m = mediaModel("media_player.living_room_tv", state("on", {
      volume_level: 0.18, is_volume_muted: true, source: "Apple TV", source_list: ["Apple TV", "HDMI 1"],
      entity_picture: "/api/media_player_proxy/x", media_title: "A Movie",
    }), now);
    expect(m.volume).toBe(18);
    expect(m.muted).toBe(true);
    expect(m.source).toBe("Apple TV");
    expect(m.sources).toEqual(["Apple TV", "HDMI 1"]);
    expect(m.artUrl).toBe("/api/marquee/art?entity=media_player.living_room_tv&v=A%20Movie");
    expect(mediaModel("media_player.x", state("on"), now).artUrl).toBeNull();
    expect(mediaModel("media_player.x", state("on"), now).volume).toBeNull();
  });

  it("can() reads the feature bits", () => {
    const m = mediaModel("media_player.x", state("on", { supported_features: MEDIA_FEATURES.PAUSE | MEDIA_FEATURES.VOLUME_SET }), now);
    expect(m.can("PAUSE")).toBe(true);
    expect(m.can("VOLUME_SET")).toBe(true);
    expect(m.can("NEXT_TRACK")).toBe(false);
    expect(mediaModel("media_player.x", undefined, now).can("PLAY")).toBe(false);
  });
});

describe("fmtMediaTime", () => {
  it("minutes and seconds, hours when there are any", () => {
    expect(fmtMediaTime(65)).toBe("1:05");
    expect(fmtMediaTime(3723)).toBe("1:02:03");
    expect(fmtMediaTime(0)).toBe("0:00");
    expect(fmtMediaTime(-5)).toBe("0:00");
    expect(fmtMediaTime(59.6)).toBe("1:00");
  });
});
