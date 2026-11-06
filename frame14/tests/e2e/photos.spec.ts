import { expect, test } from "@playwright/test";
import { pageErrors, splashGone } from "./helpers";

// 0.162.0, the user: "I want that the photos to come via home assistant
// instead, authenticate via ha, and an array of album ids as config options".
// The stub is Home Assistant's Immich integration (its media source and its
// /immich view); tests/stub/frame14.test.json lists Family and Garden, not
// Private. Family holds photos 1, 2 and 4, and a video, 3.

// The stub's albums (STUB.albums in tests/stub/stub-ha.mjs).
const ALBUMS = {
  family: "aaaaaaaa-0000-4000-8000-000000000001",
  garden: "aaaaaaaa-0000-4000-8000-000000000002",
  private: "aaaaaaaa-0000-4000-8000-000000000003",
};
const photo = (n: number) => `11111111-0000-4000-8000-${String(n).padStart(12, "0")}`;
const FAMILY = [photo(1), photo(2), photo(4)];
const GARDEN = [photo(5), photo(6)];

test.afterEach(async ({ request }) => {
  // The frames' album is the server's (photos.json): put Family back.
  await request.post("/api/photos/config", { data: { option: ALBUMS.family } });
});

test("the frames play the first configured album from Home Assistant's Immich, its pictures only", async ({ page, isMobile }) => {
  test.skip(isMobile, "a remote's Photos is the album grid");
  const errors = pageErrors(page);
  const first = page.waitForResponse((r) => r.url().endsWith(`/api/photos/asset/${photo(1)}/thumbnail`));
  await page.goto("/photos");
  const slides = page.locator("[data-photo-slide]");
  await expect(slides).toHaveCount(3);
  expect(await slides.evaluateAll((els) => els.map((el) => el.getAttribute("data-photo-slide")))).toEqual(FAMILY);
  // The first photo is up, and its picture came through Home Assistant.
  await expect(page.locator(`[data-photo-slide="${photo(1)}"]`)).toHaveAttribute("data-visible", "true");
  const picture = await first;
  expect(picture.status()).toBe(200);
  expect(picture.headers()["content-type"]).toBe("image/jpeg");
  // A tap goes to the next (on the slideshow, once the launch splash is gone:
  // a forced click doesn't wait for it).
  await splashGone(page);
  await page.locator(`[data-photo-slide="${photo(1)}"]`).click({ force: true });
  await expect(page.locator(`[data-photo-slide="${photo(2)}"]`)).toHaveAttribute("data-visible", "true");
  expect(errors).toEqual([]);
});

test("a remote names the configured albums from Home Assistant and switches the frames' album", async ({ page, request, isMobile }) => {
  test.skip(!isMobile, "the album grid is a remote's");
  await page.goto("/album");
  const album = page.getByRole("combobox", { name: "Photo album" });
  await expect(album.locator("option")).toHaveText(["Family", "Garden"]);
  await expect(album).toHaveValue(ALBUMS.family);

  const tiles = page.locator("[data-asset-id]");
  await expect(tiles).toHaveCount(3);
  expect(await tiles.evaluateAll((els) => els.map((el) => el.getAttribute("data-asset-id")))).toEqual(FAMILY);
  await expect(page.getByText("3 photos")).toBeVisible();
  // The small thumbnails load, through the add-on and Home Assistant.
  await expect
    .poll(() => tiles.locator("img").evaluateAll((imgs) => imgs.every((img) => (img as HTMLImageElement).naturalWidth > 0)))
    .toBe(true);

  await album.selectOption(ALBUMS.garden);
  await expect(tiles).toHaveCount(2);
  expect(await tiles.evaluateAll((els) => els.map((el) => el.getAttribute("data-asset-id")))).toEqual(GARDEN);
  // Every frame's: the server keeps it.
  expect(await (await request.get("/api/photos/config")).json()).toEqual({
    defaultAlbumId: ALBUMS.garden,
    options: [ALBUMS.family, ALBUMS.garden],
  });
});

test("only the configured albums' photos are served", async ({ request }) => {
  expect((await request.get(`/api/photos/asset/${photo(1)}/thumbnail?size=thumbnail`)).status()).toBe(200);
  // Private's photo, an album not configured, and the video.
  expect((await request.get(`/api/photos/asset/${photo(7)}/thumbnail`)).status()).toBe(404);
  expect((await request.get(`/api/photos/albums/${ALBUMS.private}`)).status()).toBe(404);
  expect((await request.get(`/api/photos/asset/${photo(3)}/thumbnail`)).status()).toBe(404);
  expect((await request.post("/api/photos/config", { data: { option: ALBUMS.private } })).status()).toBe(400);
});
