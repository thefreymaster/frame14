import { expect, test } from "@playwright/test";
import { resetStub } from "./helpers";
import { APP_URL, STUB_URL } from "./ports";

// Another site can't drive the add-on through a browser (0.151.0,
// origin-guard.js). A page on the stub's origin — the same host, another
// port: "same-site" to the browser, as another app under the same domain
// behind Cloudflare Access would be — tries the socket and a GET route that
// acts, and gets neither.

test.beforeEach(async ({ request }) => {
  await resetStub(request);
  await request.get("/api/screen/on");
});

test("another site's page can't open the socket or turn the frames' screen off", async ({ page, request }) => {
  await page.goto(`${STUB_URL}/api/`);
  const result = await page.evaluate(async (app) => {
    const socket = await new Promise<string>((resolve) => {
      const ws = new WebSocket(`${app.replace("http", "ws")}/socket.io/?EIO=4&transport=websocket`);
      ws.onopen = () => {
        ws.close();
        resolve("open");
      };
      ws.onerror = () => resolve("refused");
    });
    // An <img> or a no-cors fetch: the page can't read the answer, but the
    // route would still have run.
    await fetch(`${app}/api/screen/off`, { mode: "no-cors" }).catch(() => {});
    return socket;
  }, APP_URL);
  expect.soft(result, "the socket").toBe("refused");
  expect.soft((await (await request.get("/api/screen")).json()).state, "the screen").toBe("on");
});

test("the page's own socket and routes still work, and so does a rest_command", async ({ page, request }) => {
  // The live states come over the page's own socket.
  await page.goto("/unraid");
  await expect(page.getByText("4 of 6 running")).toBeVisible();
  const status = await page.evaluate(async () => (await fetch("/api/screen")).status);
  expect(status).toBe(200);
  // Home Assistant's rest_command sends no browser headers.
  expect((await request.get("/api/screen/off")).ok()).toBe(true);
  expect((await (await request.get("/api/screen")).json()).state).toBe("off");
});
