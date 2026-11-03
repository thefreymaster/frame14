import { describe, expect, it } from "vitest";
import { artUrl, isActive, isMovie } from "../../src/lib/plexMedia";

describe("isActive", () => {
  it("is playing, paused or buffering", () => {
    expect(isActive("playing")).toBe(true);
    expect(isActive("paused")).toBe(true);
    expect(isActive("buffering")).toBe(true);
    expect(isActive("idle")).toBe(false);
    expect(isActive(undefined)).toBe(false);
  });
});

describe("isMovie", () => {
  it("only a movie earns the marquee", () => {
    expect(isMovie({ media_content_type: "movie" })).toBe(true);
    expect(isMovie({ media_content_type: "tvshow" })).toBe(false);
    expect(isMovie({ media_content_type: "video" })).toBe(false);
    expect(isMovie({})).toBe(false);
    expect(isMovie(undefined)).toBe(false);
  });
});

describe("artUrl", () => {
  it("keys the proxy on the media, never on Plex's own path", () => {
    expect(artUrl(undefined)).toBeNull();
    expect(artUrl({ media_title: "X" })).toBeNull();
    expect(artUrl({ entity_picture: "/api/media_player_proxy/x", media_content_id: 123 })).toBe("/api/marquee/art?v=123");
    expect(artUrl({ entity_picture: "/x", media_title: "A B" })).toBe("/api/marquee/art?v=A%20B");
    expect(artUrl({ entity_picture: "/x" })).toBe("/api/marquee/art?v=art");
  });
});
