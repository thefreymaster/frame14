import crypto from "node:crypto";
import { decrypt } from "http_ece";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { resetStub, stub } from "./helpers";
import { APP_URL, STUB_URL } from "./ports";

// 0.160.0, the user: "We have existing notifications on HA, they are power
// related to the washer, the drier and the dishwasher. I want those to
// receive notifications to the frame14 app. Have a switch in settings to
// allow notifications." A browser's push service can't be reached from here,
// so the page's PushManager hands out a subscription whose endpoint is the
// stub's stand-in push service and whose keys this test holds: what the
// add-on sends there is decrypted and read, as the phone would.

/** A phone's side of a subscription: the keys, and the endpoint at the stub. */
function phoneKeys(id: string) {
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();
  const auth = crypto.randomBytes(16).toString("base64url");
  return {
    ecdh,
    auth,
    endpoint: `${STUB_URL}/_stub/push/${id}`,
    p256dh: ecdh.getPublicKey().toString("base64url"),
  };
}

async function fakePushManager(page: Page, keys: ReturnType<typeof phoneKeys>) {
  await page.context().grantPermissions(["notifications"], { origin: APP_URL });
  await page.addInitScript(({ endpoint, p256dh, auth }) => {
    const KEY = "e2e-push-subscription";
    const subscription = () => ({
      endpoint,
      expirationTime: null,
      options: { userVisibleOnly: true },
      getKey: () => null,
      toJSON: () => ({ endpoint, expirationTime: null, keys: { p256dh, auth } }),
      unsubscribe: async () => {
        localStorage.removeItem(KEY);
        return true;
      },
    });
    PushManager.prototype.subscribe = async function (options?: PushSubscriptionOptionsInit) {
      // The add-on's key, as a browser would hand it to its push service.
      if (!(options?.applicationServerKey instanceof Uint8Array) || options.applicationServerKey.length !== 65) {
        throw new Error("no VAPID key");
      }
      localStorage.setItem(KEY, "1");
      return subscription() as unknown as PushSubscription;
    };
    PushManager.prototype.getSubscription = async function () {
      return (localStorage.getItem(KEY) ? subscription() : null) as unknown as PushSubscription | null;
    };
  }, { endpoint: keys.endpoint, p256dh: keys.p256dh, auth: keys.auth });
}

interface Delivery {
  id: string;
  headers: Record<string, string>;
  body: string;
}

/** What reached the stand-in push service for this phone, decrypted. */
async function received(request: APIRequestContext, keys: ReturnType<typeof phoneKeys>) {
  const res = await request.get(`${STUB_URL}/_stub/pushes`);
  const all = (await res.json()) as Delivery[];
  return all
    .filter((d) => keys.endpoint.endsWith(`/${d.id}`))
    .map((d) =>
      JSON.parse(
        decrypt(Buffer.from(d.body, "base64"), { version: "aes128gcm", privateKey: keys.ecdh, authSecret: keys.auth }).toString(),
      ) as Record<string, string>,
    );
}

const allow = (page: Page) => page.getByRole("checkbox", { name: "Allow notifications" });

// Chromium itself, not the headless shell the other specs run in: the shell
// says Notification.permission is "denied" whatever was granted.
test.use({ channel: "chromium" });

test.describe("notifications", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test("the switch subscribes this device; a test and Home Assistant's frame14_notify reach it, and stop once it's off", async ({ page, request }, info) => {
    const keys = phoneKeys(`${info.project.name}-${Date.now()}`);
    await fakePushManager(page, keys);
    await page.goto("/control/device");
    await expect(allow(page)).not.toBeChecked();
    await expect(page.getByText("Home Assistant's alerts on this device")).toBeVisible();

    const subscribed = page.waitForResponse((r) => r.url().endsWith("/api/push/subscribe") && r.ok());
    await page.getByText("Allow notifications", { exact: true }).click();
    await subscribed;
    await expect(allow(page)).toBeChecked();

    // Send a test: to this device, from the server. It's the card's header
    // action (0.166.1): on the title's row, at its right, above the switch.
    const send = page.getByRole("button", { name: "Send a test" });
    const title = page.locator(".chakra-card__header h2", { hasText: "Notifications" });
    await expect(page.locator(".chakra-card__header", { has: send })).toContainText("Notifications");
    const [sendBox, titleBox, switchBox] = await Promise.all([send.boundingBox(), title.boundingBox(), page.getByText("Allow notifications", { exact: true }).boundingBox()]);
    expect(Math.abs(sendBox!.y + sendBox!.height / 2 - (titleBox!.y + titleBox!.height / 2))).toBeLessThan(4);
    expect(sendBox!.x).toBeGreaterThan(titleBox!.x + titleBox!.width);
    expect(sendBox!.y + sendBox!.height).toBeLessThan(switchBox!.y);
    await send.click();
    await expect(page.getByText("Test sent")).toBeVisible();
    await expect.poll(() => received(request, keys)).toEqual([
      { title: "Frame14", body: "Notifications are on for this device.", tag: "frame14-test", url: "/control/device" },
    ]);

    // The automation's event, as Appliance Finished Notifications fires it.
    await stub(request, "/_stub/event", {
      event_type: "frame14_notify",
      data: { title: "Washer finished", message: "Time to move the clothes to the dryer.", tag: "appliance-washer" },
    });
    await expect.poll(async () => (await received(request, keys)).at(-1)).toEqual({
      title: "Washer finished", body: "Time to move the clothes to the dryer.", tag: "appliance-washer", url: "/home",
    });

    // Still on after a reload: the browser's own subscription says so.
    await page.reload();
    await expect(allow(page)).toBeChecked();

    const unsubscribed = page.waitForResponse((r) => r.url().endsWith("/api/push/unsubscribe") && r.ok());
    await page.getByText("Allow notifications", { exact: true }).click();
    await unsubscribed;
    await expect(allow(page)).not.toBeChecked();
    await expect(page.getByRole("button", { name: "Send a test" })).toHaveCount(0);
    await stub(request, "/_stub/event", { event_type: "frame14_notify", data: { title: "Dryer finished" } });
    await page.waitForTimeout(500);
    expect(await received(request, keys)).toHaveLength(2);
  });

  // 0.178.0, the user: "I'd love a screenshot attached to it too", then "Can
  // the notification include a gif?" — an iPhone's web push shows no
  // picture, so a notification that names a camera opens a page of what it
  // saw: the still at once, the automation's clip once it sends it.
  test("a notification that names a camera opens its still, and the clip arrives on the page", async ({ page, request }, info) => {
    const keys = phoneKeys(`seen-${info.project.name}-${Date.now()}`);
    await fakePushManager(page, keys);
    await page.goto("/control/device");
    const subscribed = page.waitForResponse((r) => r.url().endsWith("/api/push/subscribe") && r.ok());
    await page.getByText("Allow notifications", { exact: true }).click();
    await subscribed;

    const tag = `front-porch-person-${info.project.name}`;
    await stub(request, "/_stub/event", {
      event_type: "frame14_notify",
      data: { title: "Front Porch", message: "Someone's at the front door.", tag, url: "/cameras", camera: "camera.front_porch_high" },
    });
    await expect.poll(async () => (await received(request, keys)).length).toBe(1);
    const [sent] = await received(request, keys);
    expect(sent).toEqual({ title: "Front Porch", body: "Someone's at the front door.", tag, url: expect.stringMatching(/^\/seen\/[A-Za-z0-9_-]{16}$/) });

    // The page a tap opens: the still, and word that the clip is coming.
    await page.goto(sent.url);
    await expect(page.getByRole("heading", { name: "Front Porch" })).toBeVisible();
    await expect(page.getByText("Someone's at the front door.")).toBeVisible();
    // The still is the camera's, as Home Assistant gave it (the stub's JPEG
    // is only bytes, not a picture a browser decodes).
    const still = page.locator("[data-seen-still]");
    const [kept, camera] = await Promise.all([
      request.get((await still.getAttribute("src"))!),
      request.get(`${STUB_URL}/api/camera_proxy/camera.front_porch_high`, { headers: { Authorization: "Bearer x" } }),
    ]);
    expect(kept.headers()["content-type"]).toBe("image/jpeg");
    expect(await kept.body()).toEqual(await camera.body());
    await expect(page.locator("[data-seen-waiting]")).toHaveText("The clip is on its way…");
    await expect(page.locator("[data-seen-clip]")).toHaveCount(0);
    await expect(page.getByRole("radiogroup", { name: "Show" })).toHaveCount(0);

    // The automation's clip, a GIF under HA's /media/: it shows without a reload.
    await stub(request, "/_stub/event", {
      event_type: "frame14_clip",
      data: { tag, media: "/media/local/snapshots/frame14_front_porch.gif" },
    });
    const clip = page.locator("img[data-seen-clip]");
    await expect(clip).toBeVisible({ timeout: 10_000 });
    await expect.poll(() => clip.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator("[data-seen-waiting]")).toHaveCount(0);

    // Photo puts the still back alone; Clip the clip.
    await page.getByText("Photo", { exact: true }).click();
    await expect(clip).toHaveCount(0);
    await expect(still).toBeVisible();
    await page.getByText("Clip", { exact: true }).click();
    await expect(clip).toBeVisible();

    await page.getByRole("button", { name: "Watch live" }).click();
    await expect(page).toHaveURL(/\/cameras$/);
  });

  test("a moment that is gone says so", async ({ page }) => {
    test.skip(test.info().project.name !== "desktop", "one run is enough");
    await page.goto("/seen/AAAAAAAAAAAAAAAA");
    await expect(page.getByText("This moment is gone")).toBeVisible();
  });

  test("the service worker shows what arrives, with its tag", async ({ page }) => {
    await page.context().grantPermissions(["notifications"], { origin: APP_URL });
    await page.goto("/home");
    await page.evaluate(() => navigator.serviceWorker.ready);
    const cdp = await page.context().newCDPSession(page);
    const registration = new Promise<string>((resolve) => {
      cdp.on("ServiceWorker.workerRegistrationUpdated", ({ registrations }) => {
        const live = registrations.find((r: { isDeleted: boolean }) => !r.isDeleted);
        if (live) resolve(live.registrationId);
      });
    });
    await cdp.send("ServiceWorker.enable");
    await cdp.send("ServiceWorker.deliverPushMessage", {
      origin: APP_URL,
      registrationId: await registration,
      data: JSON.stringify({ title: "Dishwasher finished", body: "Dishes are clean.", tag: "appliance-dishwasher", url: "/home" }),
    });
    await expect
      .poll(() =>
        page.evaluate(async () =>
          (await (await navigator.serviceWorker.ready).getNotifications()).map((n) => ({ title: n.title, body: n.body, tag: n.tag, url: n.data?.url })),
        ),
      )
      .toEqual([{ title: "Dishwasher finished", body: "Dishes are clean.", tag: "appliance-dishwasher", url: "/home" }]);
    await cdp.detach();
  });

  test.describe("on an iPhone in Safari", () => {
    test.use({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });

    test("the switch says to add Frame14 to the Home Screen first", async ({ page }) => {
      test.skip(test.info().project.name !== "desktop", "one run is enough");
      await page.goto("/control/device");
      await expect(page.getByText(/add Frame14 to your Home Screen first/)).toBeVisible();
      await expect(allow(page)).toBeDisabled();
    });
  });

  test("the kitchen frame has no Notifications card", async ({ page }) => {
    test.skip(test.info().project.name !== "desktop", "one run is enough");
    await page.addInitScript(() => {
      (window as unknown as { fully: object }).fully = {};
    });
    await page.goto("/control/device");
    await expect(page.getByRole("heading", { name: "Software" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notifications" })).toHaveCount(0);
  });
});
