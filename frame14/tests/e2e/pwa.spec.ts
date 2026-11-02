import { expect, test } from "@playwright/test";

// What makes the site installable (0.118): the manifest, its icons, the
// credentialed manifest link, the service worker; and how the build's files
// are served (0.107): precompressed and immutable.
test.skip(({ isMobile }) => isMobile, "the files are the same for every device");

test("the web app manifest and its icons are served", async ({ request }) => {
  const res = await request.get("/manifest.json");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/json/);
  const manifest = await res.json();
  expect(manifest).toMatchObject({ name: "Frame14", start_url: "/", display: "standalone" });
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  for (const icon of manifest.icons) {
    const img = await request.get(icon.src);
    expect(img.status(), icon.src).toBe(200);
    expect(img.headers()["content-type"], icon.src).toMatch(/^image\//);
  }
});

test("the page links the manifest with credentials and registers a service worker", async ({ request }) => {
  const html = await (await request.get("/")).text();
  expect(html).toMatch(/<link rel="manifest" href="\/manifest.json" crossorigin="use-credentials"/);
  const sw = await request.get("/sw.js");
  expect(sw.status()).toBe(200);
  expect(sw.headers()["content-type"]).toMatch(/javascript/);
  expect(sw.headers()["cache-control"]).toBe("no-cache");
});

test("the bundle is sent precompressed and immutable", async ({ request }) => {
  const html = await (await request.get("/")).text();
  const script = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
  expect(script).toBeTruthy();
  const res = await request.get(script!, { headers: { "accept-encoding": "br" } });
  expect(res.status()).toBe(200);
  expect(res.headers()["content-encoding"]).toBe("br");
  expect(res.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
  const plain = await request.get(script!, { headers: { "accept-encoding": "identity" } });
  expect(plain.headers()["content-encoding"]).toBeUndefined();
});

test("an unknown path is the app, not a 404", async ({ request }) => {
  const res = await request.get("/some/deep/link");
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain("<title>Frame14</title>");
});
