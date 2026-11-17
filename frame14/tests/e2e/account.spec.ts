import { devices, expect, test, type APIRequestContext, type Browser, type BrowserContext, type BrowserContextOptions, type Page } from "@playwright/test";
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
async function another(browser: Browser, request: APIRequestContext, email: string, options: BrowserContextOptions = {}) {
  const context = await browser.newContext(options);
  await signIn(context, request, email);
  return context;
}

/** A laptop running Linux: a kind of device neither project's own browser is. */
const LINUX = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

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
    // The card folds to its header, as the tab's others do (0.172.0), and
    // opens again.
    const fold = card.locator("button[data-stretched]");
    await fold.click();
    await expect(fold).toHaveAttribute("aria-expanded", "false");
    await expect(card.locator("[data-account-user]")).toBeHidden();
    await expect(card.getByRole("heading", { name: "Account" })).toBeVisible();
    await fold.click();
    await expect(card.locator("[data-account-user]")).toBeVisible();

    // In the Embossed theme the row is a well pressed into its card — the
    // card's own recess, and no outline — and an outlined card in any other
    // (0.172.0, the user: "The signed in devices should also be concave on
    // embossed mode").
    const drawn = (el: typeof row) =>
      el.evaluate((node) => {
        const cs = getComputedStyle(node);
        return { shadow: cs.boxShadow, edge: parseFloat(cs.borderTopWidth), floor: cs.backgroundColor };
      });
    // This browser as a remote wearing its own colours: nothing is sent to the server.
    const wear = async (palette: "gray" | "embossed") => {
      await page.evaluate((palette) => {
        localStorage.setItem("device-mode", "controller");
        localStorage.setItem("local-theme-palette", palette);
      }, palette);
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("data-palette", palette);
      await expect(row).toBeVisible();
    };
    await wear("gray");
    expect(await drawn(row)).toMatchObject({ shadow: "none", edge: 1 });
    await wear("embossed");
    const [pressed, around] = [await drawn(row), await drawn(card)];
    expect(around.shadow).toContain("inset");
    expect(pressed.shadow).toBe(around.shadow);
    expect(pressed.edge).toBe(0);
    expect(pressed.floor).not.toBe(around.floor);
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

  // 0.173.0, the user: "Allow for the customization of the name of a device
  // found here. It should propagate across all devices so not just saved to
  // that local device", then "Just add an edit icon button to the far right
  // of each that allows the editing of the name. Maybe let us set an alias
  // instead actually."
  test("a device's alias is set from the edit button on its row, kept by the server, and read by every signed-in device at once (0.173.0)", async ({ page, context, browser, request, isMobile }, testInfo) => {
    const errors = pageErrors(page);
    const evan = `alias-evan-${testInfo.project.name}@example.com`;
    const liz = `alias-liz-${testInfo.project.name}@example.com`;
    const mine = isMobile ? "Android phone" : "Windows PC";
    const rowOf = (on: Page, email: string, device: string) => on.locator(`[data-person="${email}"][data-device="${device}"]`);
    await signIn(context, request, evan);
    // The same person's laptop, and someone else.
    const laptop = await another(browser, request, evan, { userAgent: LINUX });
    const hers = await another(browser, request, liz);
    try {
      const laptopPage = await laptop.newPage();
      await laptopPage.goto("/control/device");
      const lizPage = await hers.newPage();
      await lizPage.goto("/control/device");
      await page.goto("/control/device");
      const row = rowOf(page, evan, "Linux PC");
      await expect(row).toContainText("Linux PC · Here now");

      // Every row has the button, at its far end: this device's, the same
      // person's other one, someone else's.
      for (const each of [rowOf(page, evan, mine), row, rowOf(page, liz, mine)]) {
        const edit = each.locator("[data-alias-edit]");
        await expect(edit).toBeVisible();
        await expect(edit).toHaveAccessibleName(/^Set an alias for /);
        const [box, button, words] = [(await each.boundingBox())!, (await edit.boundingBox())!, (await each.getByText("@example.com").boundingBox())!];
        expect(box.x + box.width - (button.x + button.width)).toBeLessThan(button.width);
        expect(button.x).toBeGreaterThanOrEqual(words.x + words.width);
      }

      // A tap on it puts a field where the row's words were, in the same height.
      const before = (await row.boundingBox())!;
      await row.locator("[data-alias-edit]").click();
      const field = row.getByRole("textbox");
      await expect(field).toBeFocused();
      await expect(field).toHaveValue("");
      await expect(field).toHaveAttribute("placeholder", "Linux PC");
      expect(Math.abs((await row.boundingBox())!.height - before.height)).toBeLessThan(1);
      // Type of 16px at least: under it an iPhone zooms the page in on a field.
      expect(await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
      await field.fill("  Office   laptop ");
      await field.press("Enter");
      await expect(row).toContainText("Office laptop · Here now");
      await expect(row).toHaveAttribute("data-alias", "Office laptop");
      await expect(row.getByRole("textbox")).toHaveCount(0);
      // What kind of device it is stays its own, and so does its glyph.
      await expect(row).toHaveAttribute("data-device", "Linux PC");

      // The laptop itself and Liz's device read it at once, with no reload.
      await expect(rowOf(laptopPage, evan, "Linux PC")).toContainText("Office laptop · This device");
      await expect(rowOf(lizPage, evan, "Linux PC")).toContainText("Office laptop · Here now");
      // It is the server's: there in its answer, and after a reload.
      const account = (await (await page.request.get("/api/account")).json()) as { people: { email: string; device: string; alias?: string }[] };
      expect(account.people.find((p) => p.email === evan && p.device === "Linux PC")?.alias).toBe("Office laptop");
      expect(account.people.find((p) => p.email === evan && p.device === mine)).not.toHaveProperty("alias");
      await page.reload();
      await expect(row).toContainText("Office laptop · Here now");

      // Anyone signed in may change it: Liz, from hers.
      const theirs = rowOf(lizPage, evan, "Linux PC");
      await theirs.locator("[data-alias-edit]").click();
      await expect(theirs.getByRole("textbox")).toHaveValue("Office laptop");
      await theirs.getByRole("textbox").fill("Evan's laptop");
      await theirs.getByRole("button", { name: "Save alias" }).click();
      await expect(row).toContainText("Evan's laptop · Here now");
      await expect(rowOf(laptopPage, evan, "Linux PC")).toContainText("Evan's laptop · This device");

      // A device Access didn't sign in can't, and is told of no row.
      const stranger = await browser.newContext();
      try {
        const refused = await stranger.request.put("/api/account/alias", { data: { email: evan, device: "Linux PC", alias: "Mine now" } });
        expect(refused.status()).toBe(403);
      } finally {
        await stranger.close();
      }
      await expect(row).toContainText("Evan's laptop · Here now");

      // Escape leaves it as it was — and where the pointer is a mouse's, the
      // focus goes back to the button.
      await row.locator("[data-alias-edit]").click();
      await row.getByRole("textbox").fill("Something else");
      await row.getByRole("textbox").press("Escape");
      await expect(row.getByRole("textbox")).toHaveCount(0);
      await expect(row).toContainText("Evan's laptop · Here now");
      if (!isMobile) await expect(row.locator("[data-alias-edit]")).toBeFocused();

      // Saved empty, the alias is gone and the row goes by its kind again — everywhere.
      await row.locator("[data-alias-edit]").click();
      await row.getByRole("textbox").fill("");
      await row.getByRole("button", { name: "Save alias" }).click();
      await expect(row).toContainText("Linux PC · Here now");
      await expect(row).not.toHaveAttribute("data-alias");
      await expect(rowOf(lizPage, evan, "Linux PC")).toContainText("Linux PC · Here now");
      await expect(rowOf(laptopPage, evan, "Linux PC")).toContainText("Linux PC · This device");
    } finally {
      await laptop.close();
      await hers.close();
      // The server keeps an alias past the test: none is left behind.
      const { token } = (await stub(request, "/_stub/access/token", { email: evan })) as { token: string };
      await request.put(`${APP_URL}/api/account/alias`, { headers: { "Cf-Access-Jwt-Assertion": token }, data: { email: evan, device: "Linux PC", alias: "" } });
    }
    expect(errors).toEqual([]);
  });

  // An iPhone ticks through a label lib/haptics lays over every button
  // (0.170.1): a tap on the pencil, the tick or the cross lands on that
  // label, not the button. The tick is its form's submit button, with no
  // click handler of its own: the form must be submitted all the same.
  test("on an iPhone, where a tap lands on the label over each button, the edit button and the tick still do their work (0.173.0)", async ({ browser, request, isMobile }, testInfo) => {
    test.skip(!isMobile, "once is enough");
    const evan = `alias-iphone-${testInfo.project.name}@example.com`;
    // An iPhone's size, touch and name; the engine stays this project's.
    const { userAgent, viewport, deviceScaleFactor, hasTouch } = devices["iPhone 15"];
    const context = await another(browser, request, evan, { userAgent, viewport, deviceScaleFactor, isMobile: true, hasTouch });
    await context.addInitScript(() => {
      // Safari has no Vibration API.
      Reflect.deleteProperty(Navigator.prototype, "vibrate");
    });
    try {
      const page = await context.newPage();
      await page.goto("/control/device");
      await splashGone(page);
      const row = page.locator(`[data-person="${evan}"][data-device="iPhone"]`);
      await expect(row).toContainText("iPhone · This device");
      const edit = row.locator("[data-alias-edit]");
      await expect(edit.locator("label[data-haptic-trigger]")).toHaveCount(1);
      await edit.tap();
      await row.getByRole("textbox").fill("Evan's iPhone");
      const save = row.getByRole("button", { name: "Save alias" });
      await expect(save.locator("label[data-haptic-trigger]")).toHaveCount(1);
      await save.tap();
      await expect(row).toContainText("Evan's iPhone · This device");
      await expect(row.getByRole("textbox")).toHaveCount(0);
      // And the cross, the same way.
      await row.locator("[data-alias-edit]").tap();
      await row.getByRole("textbox").fill("Something else");
      await row.getByRole("button", { name: "Cancel" }).tap();
      await expect(row.getByRole("textbox")).toHaveCount(0);
      await expect(row).toContainText("Evan's iPhone · This device");
    } finally {
      await context.close();
      const { token } = (await stub(request, "/_stub/access/token", { email: evan })) as { token: string };
      await request.put(`${APP_URL}/api/account/alias`, { headers: { "Cf-Access-Jwt-Assertion": token }, data: { email: evan, device: "iPhone", alias: "" } });
    }
  });
});
