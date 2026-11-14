import { expect, test, type APIRequestContext, type Browser, type BrowserContext } from "@playwright/test";
import { lightTile, pageErrors, splashGone, stub } from "./helpers";
import { APP_URL } from "./ports";

// 0.168.0, the user: "so I can tell who is logged in", the name "from
// access" — and "It should only show access if the user is using access …
// If they aren't it should still work". Cloudflare Access signs people in
// and adds a signed token to every request it lets through; the server reads
// who each visitor is from it. Here the stub is the Access team (its keys
// page, and tokens signed with that key), and a browser "came through Access"
// when it carries the token as the cookie Access sets — on its requests and
// on its socket's handshake alike.
//
// The server keeps who was here across tests, so each project names its own
// people.

/** The token Access would issue `email`, as the browser's cookie. */
async function signIn(context: BrowserContext, request: APIRequestContext, email: string) {
  const { token } = (await stub(request, "/_stub/access/token", { email })) as { token: string };
  await context.addCookies([{ name: "CF_Authorization", value: token, url: APP_URL }]);
}

/** A second browser, signed in as `email`. */
async function another(browser: Browser, request: APIRequestContext, email: string) {
  const context = await browser.newContext();
  await signIn(context, request, email);
  return context;
}

test.describe("who is signed in", () => {
  test("Settings names the person Cloudflare Access signed in, on the device in hand", async ({ page, context, request, isMobile }, testInfo) => {
    const errors = pageErrors(page);
    const evan = `evan-${testInfo.project.name}@example.com`;
    await signIn(context, request, evan);
    await page.goto("/control/device");
    const card = page.locator(".chakra-card__root", { has: page.getByRole("heading", { name: "Account" }) }).first();
    await expect(card).toBeVisible();
    await expect(card.locator("[data-account-user]")).toHaveText(`Signed in as ${evan}`);
    // The row of this device: what kind it is, and that it is the one in hand.
    const row = card.locator(`[data-person="${evan}"]`);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(`${isMobile ? "Android phone" : "Windows PC"} · This device`);
    await expect(row).toHaveAttribute("data-self", "");
    await expect(row).toHaveAttribute("data-online", "");
    // What the page asked: itself, and the list it is in.
    const account = (await (await page.request.get("/api/account")).json()) as { enabled: boolean; user: { email: string }; people: { email: string; online: boolean }[] };
    expect(account.enabled).toBe(true);
    expect(account.user).toEqual({ email: evan });
    expect(account.people.find((p) => p.email === evan)?.online).toBe(true);
    expect(errors).toEqual([]);
  });

  test("the list follows someone else arriving and leaving, without a reload", async ({ page, context, browser, request }, testInfo) => {
    const evan = `evan-${testInfo.project.name}@example.com`;
    const liz = `liz-${testInfo.project.name}@example.com`;
    await signIn(context, request, evan);
    await page.goto("/control/device");
    const mine = page.locator(`[data-person="${evan}"]`);
    await expect(mine).toContainText("This device");
    const hers = page.locator(`[data-person="${liz}"]`);
    await expect(hers).toHaveCount(0);

    // Liz opens Frame14 on her own device: any page, its socket is her presence.
    const other = await another(browser, request, liz);
    try {
      const lizPage = await other.newPage();
      await lizPage.goto("/home");
      await expect(hers).toContainText("Here now");
      await expect(hers).not.toContainText("This device");
      // Those here now come first, by name: Evan, then Liz.
      const order = await page.locator("[data-person][data-online]").evaluateAll((els) => els.map((el) => el.getAttribute("data-person")));
      expect(order.indexOf(evan)).toBeLessThan(order.indexOf(liz));
      await expect(page.locator(`[data-person="${liz}"][data-online]`)).toHaveCount(1);
    } finally {
      await other.close();
    }
    // She closed it: last here just now, and no longer marked as here.
    await expect(hers).toContainText("Last here");
    await expect(page.locator(`[data-person="${liz}"][data-online]`)).toHaveCount(0);
    await expect(mine).toContainText("This device");
  });

  test("a device that didn't come through Access has no Account card, is told no names, and works as before", async ({ page, browser, request }, testInfo) => {
    const errors = pageErrors(page);
    const liz = `liz-${testInfo.project.name}@example.com`;
    // Someone is signed in elsewhere, so there are names to keep.
    const other = await another(browser, request, liz);
    try {
      const lizPage = await other.newPage();
      await lizPage.goto("/control/device");
      await expect(lizPage.locator(`[data-person="${liz}"]`)).toContainText("This device");

      // This browser carries no token: the home network, the frame.
      const heard: unknown[] = [];
      await page.exposeFunction("heardPeople", (list: unknown) => heard.push(list));
      await page.goto("/control/device");
      // The page is all there: the cards under where the Account card goes.
      await expect(page.getByRole("heading", { name: "Software" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Navigation" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Account" })).toHaveCount(0);
      // Asked directly, the server answers — nobody, and nobody's name.
      const res = await page.request.get("/api/account");
      expect(res.status()).toBe(200);
      expect(await res.json()).toEqual({ enabled: true, user: null, people: [] });
      // A token the team didn't sign is no token.
      const forged = await page.request.get("/api/account", { headers: { "Cf-Access-Jwt-Assertion": "eyJhbGciOiJub25lIn0.eyJlbWFpbCI6Im1hbGxvcnlAZXhhbXBsZS5jb20ifQ." } });
      expect(await forged.json()).toEqual({ enabled: true, user: null, people: [] });
      // Nor does its socket hear the list when someone comes: a socket of
      // its own listens while Liz's page reloads (she leaves and arrives).
      await page.addScriptTag({ url: "/socket.io/socket.io.js" });
      await page.evaluate(async () => {
        type Io = (opts: object) => { on: (e: string, f: (v: unknown) => void) => void };
        const w = window as unknown as { io: Io; heardPeople: (v: unknown) => void };
        const socket = w.io({ transports: ["websocket"] });
        socket.on("people", (list) => w.heardPeople(list));
        await new Promise<void>((resolve) => socket.on("connect", () => resolve()));
      });
      // Liz's own page does hear it, which is what says the reload was told.
      const lizHeard: unknown[] = [];
      await lizPage.exposeFunction("heardPeople", (list: unknown) => lizHeard.push(list));
      await lizPage.reload();
      await lizPage.addScriptTag({ url: "/socket.io/socket.io.js" });
      await lizPage.evaluate(async () => {
        type Io = (opts: object) => { on: (e: string, f: (v: unknown) => void) => void };
        const w = window as unknown as { io: Io; heardPeople: (v: unknown) => void };
        const socket = w.io({ transports: ["websocket"] });
        socket.on("people", (list) => w.heardPeople(list));
        await new Promise<void>((resolve) => socket.on("connect", () => resolve()));
      });
      await expect.poll(() => lizHeard.length).toBeGreaterThan(0);
      expect(heard).toEqual([]);
      // And the house still answers this device: its lights, live.
      await page.goto("/lights");
      await expect(lightTile(page, "Kitchen Main").first()).toBeVisible();
    } finally {
      await other.close();
    }
    expect(errors).toEqual([]);
  });

  test("an install that doesn't use Access shows nothing of it, asks nothing, and works as before", async ({ page, context, request }, testInfo) => {
    const errors = pageErrors(page);
    // The entity config as an install without `cloudflare_access_team` has
    // it — rewritten on its way in, as features.spec does for the features.
    await page.route("**/api/entities", async (route) => {
      const response = await route.fetch();
      const config = (await response.json()) as Record<string, unknown>;
      expect(config.account).toBe(true);
      config.account = false;
      await route.fulfill({ response, json: config });
    });
    const asked: string[] = [];
    page.on("request", (r) => {
      const path = new URL(r.url()).pathname;
      if (path.startsWith("/api/account")) asked.push(path);
    });
    // Even for someone Access did sign in: the install isn't naming anyone.
    await signIn(context, request, `evan-${testInfo.project.name}@example.com`);
    await page.goto("/control/device");
    await splashGone(page);
    await expect(page.getByRole("heading", { name: "Software" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Navigation" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Account" })).toHaveCount(0);
    expect(asked).toEqual([]);
    // The rest of the app, as ever.
    await page.goto("/lights");
    await expect(lightTile(page, "Kitchen Main").first()).toBeVisible();
    expect(asked).toEqual([]);
    expect(errors).toEqual([]);
  });
});
