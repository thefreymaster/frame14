import { expect, test, type Locator, type Page } from "@playwright/test";
import { lightTile, quietHouse, resetStub } from "./helpers";

// In the Embossed colour theme the cards are pressed into the page — and
// the buttons stand up out of the cards (0.171.1, the user: "instead of
// having the buttons feel indented, change them to feel like convexed
// popping out, so inverted of the embossed feel. This goes for the light
// buttons the climate buttons and any other button like the voice and
// screen, as well as views in the control/views route"; the tiles were
// pressed in with the cards for a version, 0.170.0). And they are all as the
// header's own buttons are (0.171.2: "Can we get rid of the little top and
// bottom inside shadow" — a bevel it had for a version —, then "Let's get
// rid of the borders actually in the buttons on the climate buttons. And
// the light buttons, as well as fan. All buttons should be the same style
// and color as the header buttons. I like those the best"): a tile that is
// a button — a light's, a scene's, a thermostat's, a fan's — has their
// colour, no outline, nothing drawn inside its edge, and casts a shadow on
// the card; a ringed tile's ring is its rim. Held down, it is pushed in.

/** A tile as Chromium draws it: its face, its edge, its ring, what it casts, the layer inside. */
const look = (tile: Locator) =>
  tile.evaluate((el) => {
    const layers = (shadow: string) => (shadow === "none" ? [] : shadow.split(/,(?![^(]*\))/).map((l) => l.trim()));
    // A shadow of nothing: transparent, no offset, blur or spread.
    const nothing = (layer: string) => /^rgba\(0, 0, 0, 0\) 0px 0px 0px 0px( inset)?$/.test(layer);
    const ring = (layer: string) => /^.+ 0px 0px 0px [\d.]+px inset$/.test(layer) && !nothing(layer);
    // A layer's vertical offset: "rgba(…) 0px 2px 4px 0px".
    const down = (layer: string) => parseFloat(layer.replace(/^.*\)\s*/, "").split(" ")[1]);
    const cs = getComputedStyle(el);
    const own = layers(cs.boxShadow).filter((l) => !nothing(l));
    const before = getComputedStyle(el, "::before");
    return {
      face: cs.backgroundColor,
      edge: parseFloat(cs.borderTopWidth),
      ring: own.filter(ring).map((l) => parseFloat(/([\d.]+)px inset$/.exec(l)![1])),
      // What it casts: outside the tile, and falling below it.
      cast: own.filter((l) => !l.includes("inset")).map(down),
      // Anything drawn inside the tile's edge at rest: nothing.
      inside: layers(before.boxShadow),
      layerFrom: parseFloat(before.top),
    };
  });

/** The colour of the header's own buttons: the screen button's. */
const headerFace = (page: Page) =>
  page.locator("[data-header-buttons] button").last().evaluate((el) => getComputedStyle(el).backgroundColor);

/** This browser as a remote wearing its own colours: nothing is sent to the server. */
async function wear(page: Page, palette: "gray" | "embossed") {
  await page.evaluate((palette) => {
    localStorage.setItem("device-mode", "controller");
    localStorage.setItem("local-theme-palette", palette);
  }, palette);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-palette", palette);
}

const rem = (page: Page) => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
const CLEAR = "rgba(0, 0, 0, 0)";

test.describe("the Embossed theme's buttons", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test("a light's and a scene's tiles stand up out of their card as the header's buttons do, and are outlined cards in any other theme", async ({ page }) => {
    await page.goto("/lights");
    await wear(page, "gray");
    const off = lightTile(page, "Floor Lamp");
    const on = page.locator('[data-light-entry][aria-pressed="true"]').first();
    const scene = page.locator("[data-scene-entry]").first();
    const lit = { gray: "" };
    for (const tile of [off, on, scene]) {
      await expect(tile).toBeVisible();
      expect(await look(tile)).toMatchObject({ edge: 1, ring: [], cast: [], inside: [] });
    }
    // An unlit tile is the panel's colour, not the header buttons'; a lit
    // one its light's, at 12%, over the card.
    expect((await look(off)).face).not.toBe(await headerFace(page));
    lit.gray = (await look(on)).face;
    expect(lit.gray).toMatch(/^(rgba|color)\(.*0\.12\)$/);

    await wear(page, "embossed");
    const header = await headerFace(page);
    for (const tile of [off, on, scene]) {
      await expect(tile).toBeVisible();
      const raised = await look(tile);
      // No outline, nothing drawn inside its edge…
      expect(raised).toMatchObject({ edge: 0, ring: [], inside: [], layerFrom: 0 });
      // …and a shadow on the card under it.
      expect(raised.cast.length).toBeGreaterThan(0);
      expect(Math.max(...raised.cast)).toBeGreaterThan(0);
    }
    // The header buttons' own colour; a lit tile's is its light's over that,
    // opaque now.
    expect((await look(off)).face).toBe(header);
    expect((await look(scene)).face).toBe(header);
    const litFace = (await look(on)).face;
    expect(litFace).not.toBe(header);
    expect(litFace).not.toBe(lit.gray);
    expect(litFace).not.toMatch(/0\.12\)$/);
  });

  test("a thermostat's and a fan's do too, with the ring of one that is on as the rim", async ({ page }) => {
    await page.goto("/home");
    await wear(page, "gray");
    const heating = page.getByRole("button", { name: /^1st Floor:/ });
    const idle = page.getByRole("button", { name: /^2nd Floor:/ });
    const spinning = page.getByRole("button", { name: /^Living Room Ceiling Fan:/ });
    const still = page.getByRole("button", { name: /^Guest Room Fan:/ });
    // A quarter rem in all: the 1px border and the ring inside it.
    const width = 0.25 * (await rem(page));
    for (const tile of [heating, spinning]) {
      await expect(tile).toBeVisible();
      const flat = await look(tile);
      expect(flat).toMatchObject({ edge: 1, cast: [], inside: [] });
      expect(flat.ring).toHaveLength(1);
      expect(flat.ring[0]).toBeCloseTo(width - 1, 1);
    }
    for (const tile of [idle, still]) {
      expect(await look(tile)).toMatchObject({ edge: 1, ring: [], cast: [], inside: [] });
    }
    expect((await look(idle)).face).not.toBe(await headerFace(page));

    await wear(page, "embossed");
    const header = await headerFace(page);
    for (const tile of [heating, spinning, idle, still]) {
      await expect(tile).toBeVisible();
      const raised = await look(tile);
      expect(raised).toMatchObject({ face: header, edge: 0, inside: [] });
      expect(Math.max(...raised.cast)).toBeGreaterThan(0);
    }
    // On: the ring is still the tile's — all of its width now, with no
    // border to share it — and the layer the tile is pushed in on starts at
    // its inner edge. Off: no ring.
    for (const tile of [heating, spinning]) {
      const raised = await look(tile);
      expect(raised.ring).toHaveLength(1);
      expect(raised.ring[0]).toBeCloseTo(width, 1);
      expect(raised.layerFrom).toBeCloseTo(width, 1);
    }
    for (const tile of [idle, still]) {
      expect(await look(tile)).toMatchObject({ ring: [], layerFrom: 0 });
    }
  });

  test("a tile's ring still comes and goes as one shadow fading into the other", async ({ page }) => {
    // On and off are the same list of shadows — the ring, then what the tile
    // casts — so the browser tweens them; a list of another length or kind
    // would jump.
    await page.goto("/home");
    const heating = page.getByRole("button", { name: /^1st Floor:/ });
    const idle = page.getByRole("button", { name: /^2nd Floor:/ });
    await expect(heating).toBeVisible();
    const shape = (tile: Locator) =>
      tile.evaluate((el) =>
        getComputedStyle(el)
          .boxShadow.split(/,(?![^(]*\))/)
          .map((l) => (l.includes("inset") ? "inset" : "outer")),
      );
    expect(await shape(heating)).toEqual(await shape(idle));
    expect(await heating.evaluate((el) => getComputedStyle(el).transitionProperty)).toContain("box-shadow");
  });

  test("the buttons stand up too — the voice and screen buttons, All off, a remote's Views — and one with no face doesn't", async ({ page, isMobile, request }) => {
    // A button's own shadow, as the tiles': what it casts, and its bevel.
    const button = (el: Locator) =>
      el.evaluate((node) => {
        const layers = getComputedStyle(node).boxShadow;
        const all = layers === "none" ? [] : layers.split(/,(?![^(]*\))/).map((l) => l.trim());
        return { bevel: all.filter((l) => l.includes("inset")).length, cast: all.filter((l) => !l.includes("inset")).length };
      });
    const FLAT = { bevel: 0, cast: 0 };
    // What it casts, and no line inside its top or lower edge.
    const RAISED = { bevel: 0, cast: 2 };
    const face = (el: Locator) => el.evaluate((node) => [getComputedStyle(node).backgroundColor, getComputedStyle(node).borderTopWidth]);

    await page.goto("/lights");
    await wear(page, "gray");
    const screen = page.locator("[data-header-buttons] button").last();
    const allOff = page.getByRole("button", { name: "Turn off all lights" });
    await expect(allOff).toBeVisible();
    expect(await button(screen)).toEqual(FLAT);
    expect(await button(allOff)).toEqual(FLAT);
    // An outline button, in any other theme: its outline on its card's colour.
    expect(await face(allOff)).toEqual([CLEAR, "1px"]);

    await wear(page, "embossed");
    await expect(allOff).toBeVisible();
    // Every button in the header with a face: the mic where there is one,
    // and the power button.
    for (const el of await page.locator("[data-header-buttons] button.chakra-button").all()) {
      const variant = await el.evaluate((node) => getComputedStyle(node).backgroundColor);
      if (variant === CLEAR) expect(await button(el)).toEqual(FLAT);
      else expect(await button(el)).toEqual(RAISED);
    }
    expect(await button(screen)).toEqual(RAISED);
    expect(await button(allOff)).toEqual(RAISED);
    // An outline button is as the header's are: their colour, no outline.
    expect(await face(allOff)).toEqual([await headerFace(page), "0px"]);
    // A card's fold arrow and the header's menus have no face: nothing to raise.
    const plain = page.locator("[data-header-buttons] button").first();
    if ((await plain.evaluate((el) => getComputedStyle(el).backgroundColor)) === CLEAR) {
      expect(await button(plain)).toEqual(FLAT);
    }

    // Held down, a button goes from pushed out to pushed in ("like a real
    // button"): the recess its card has — the shade inside its top edge and
    // the light under its lower one — where the bevel and the shadow were. A
    // tile the same, the shade on its face.
    const recess = await page.locator(".chakra-card__root").first().evaluate((el) => {
      const layers = getComputedStyle(el).boxShadow.split(/,(?![^(]*\))/).map((l) => l.trim());
      return { inside: layers.filter((l) => l.includes("inset")), outside: layers.filter((l) => !l.includes("inset")) };
    });
    expect(recess.inside).toHaveLength(2);
    expect(recess.outside).toHaveLength(1);
    const worn = (el: Locator) =>
      el.evaluate((node) => {
        const split = (shadow: string) => (shadow === "none" ? [] : shadow.split(/,(?![^(]*\))/).map((l) => l.trim()));
        const own = split(getComputedStyle(node).boxShadow).filter((l) => !/^rgba\(0, 0, 0, 0\) 0px 0px 0px 0px/.test(l));
        const face = split(getComputedStyle(node, "::before").boxShadow);
        return { inside: [...own.filter((l) => l.includes("inset")), ...face], outside: own.filter((l) => !l.includes("inset")) };
      });
    const tile = lightTile(page, "Floor Lamp");
    for (const el of [allOff, tile]) {
      await el.scrollIntoViewIfNeeded();
      const atRest = await worn(el);
      expect(atRest).not.toEqual(recess);
      const box = (await el.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await expect.poll(() => worn(el)).toEqual(recess);
      // The recess is the pressed look here: no second shade over it.
      expect(await el.evaluate((node) => getComputedStyle(node, "::after").boxShadow)).toBe("none");
      await page.mouse.move(1, 1);
      await page.mouse.up();
      await expect.poll(() => worn(el)).toEqual(atRest);
    }

    // A remote's Views: the view the frames are on, and the others.
    if (isMobile) {
      // The frames on Clock, as the server starts them, so Overview is one
      // they aren't on: where an earlier spec left them is that spec's
      // (a game's kickoff sends them to it, and its end home).
      const res = await request.get("/api/change/clock");
      expect(res.ok()).toBeTruthy();
      await page.goto("/control/views");
      const views = page.getByRole("button", { name: "Overview" });
      await expect(views).toBeVisible();
      expect(await button(views)).toEqual(RAISED);
      expect(await button(page.getByRole("button", { name: "Clock" }))).toEqual(RAISED);
      // The views the frames aren't on: the header buttons' colour, no outline.
      expect(await face(views)).toEqual([await headerFace(page), "0px"]);
    }
  });
  // 0.172.0, the user: "Make the navigation concave also. It is currently
  // convex" — it had stood up out of the page for a version (0.171.3: "The
  // Navigationbar should be convex sticking out and depress when button
  // pressing"), in the buttons' colour with a shadow under it. Pressed into
  // the page with the cards again, and an entry still goes in when pressed.
  test("the navigation is pressed into the page as the cards are, in their colour, and an entry held down is pushed into it", async ({ page, isMobile }) => {
    const nav = page.locator(`[data-nav="${isMobile ? "bar" : "rail"}"]`);
    const entry = nav.getByRole("tab", { name: "Climate" });
    const shadows = (el: Locator) =>
      el.evaluate((node) => {
        const all = getComputedStyle(node).boxShadow;
        const layers = all === "none" ? [] : all.split(/,(?![^(]*\))/).map((l) => l.trim());
        return { inside: layers.filter((l) => l.includes("inset")), outside: layers.filter((l) => !l.includes("inset")) };
      });
    // A colour's red, green and blue, however Chromium writes it.
    const rgb = (colour: string) =>
      colour.startsWith("color(")
        ? colour.match(/[\d.]+/g)!.slice(0, 3).map((v) => Math.round(parseFloat(v) * 255))
        : colour.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const hold = async (el: Locator) => {
      const box = (await el.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
    };
    const letGo = async () => {
      await page.mouse.move(1, 1);
      await page.mouse.up();
    };

    await page.goto("/lights");
    await wear(page, "gray");
    await expect(entry).toBeVisible();
    // Gray: the nav floats over the page in the cards' colour, and an entry
    // held down only goes in.
    const card = page.locator(".chakra-card__root").first();
    expect(rgb(await nav.evaluate((el) => getComputedStyle(el).backgroundColor))).toEqual(
      rgb(await card.evaluate((el) => getComputedStyle(el).backgroundColor)),
    );
    await hold(entry);
    await expect.poll(() => entry.evaluate((el) => el.hasAttribute("data-pressing"))).toBe(true);
    expect(await shadows(entry)).toEqual({ inside: [], outside: [] });
    await letGo();

    await wear(page, "embossed");
    await expect(entry).toBeVisible();
    // The cards' own recess, layer for layer — the shade inside its edge,
    // the lip's light under it, and no shadow cast — and the cards' colour
    // (frosted, so not all of it), not the header buttons'.
    const recess = await shadows(card);
    expect(recess.inside).toHaveLength(2);
    expect(recess.outside).toHaveLength(1);
    expect(await shadows(nav)).toEqual(recess);
    const face = rgb(await nav.evaluate((el) => getComputedStyle(el).backgroundColor));
    expect(face).toEqual(rgb(await card.evaluate((el) => getComputedStyle(el).backgroundColor)));
    expect(face).not.toEqual(rgb(await headerFace(page)));
    // Held, the entry wears the recess too, in the bar's floor; let go,
    // nothing.
    expect(await shadows(entry)).toEqual({ inside: [], outside: [] });
    await hold(entry);
    await expect.poll(() => shadows(entry)).toEqual(recess);
    await letGo();
    await expect.poll(() => shadows(entry)).toEqual({ inside: [], outside: [] });
    await expect(page).toHaveURL(/\/lights$/);
  });

  // 0.172.0, the user: "The forcast on the home page and both forecasts on
  // the weather route should be concave in embossed theme. The VM and
  // Container chips should also be concave in embossed mode on the unraid
  // route". What is read rather than pressed is a well in its card: it wears
  // the recess its card has in the page, where the buttons stand up.
  test.describe("its wells", () => {
    /** A box as Chromium draws it: its floor, its outline, and its shadow's layers inside and outside its edge. */
    const drawn = (el: Locator) =>
      el.evaluate((node) => {
        const cs = getComputedStyle(node);
        const layers = cs.boxShadow === "none" ? [] : cs.boxShadow.split(/,(?![^(]*\))/).map((l) => l.trim());
        return {
          floor: cs.backgroundColor,
          edge: parseFloat(cs.borderTopWidth),
          inside: layers.filter((l) => l.includes("inset")),
          outside: layers.filter((l) => !l.includes("inset")),
        };
      });
    /** The card a well is in. */
    const cardOf = (well: Locator) => well.locator("xpath=ancestor::*[contains(@class, 'chakra-card__root')][1]");
    /** A well pressed into its card: the card's own recess — the shade inside, the lip's light under — on a floor that isn't the card's. */
    async function pressedIn(well: Locator) {
      const card = await drawn(cardOf(well));
      const own = await drawn(well);
      expect(card.inside).toHaveLength(2);
      expect(card.outside).toHaveLength(1);
      expect({ inside: own.inside, outside: own.outside }).toEqual({ inside: card.inside, outside: card.outside });
      expect(own.edge).toBe(0);
      expect(own.floor).not.toBe(card.floor);
      expect(own.floor).not.toBe(CLEAR);
      return own;
    }

    for (const scheme of ["light", "dark"] as const) {
      test(`the forecasts' hours and days are pressed into their cards, and flat in any other theme (${scheme})`, async ({ page, request, isMobile }) => {
        await page.emulateMedia({ colorScheme: scheme });
        // The hours' strip, then the days' list: a tab each where the page
        // has tabs, both on a desktop's one page.
        const hours = page.locator('[data-forecast="hourly"]');
        const days = page.locator('[data-forecast="daily"]');
        await page.goto("/weather/hourly");
        await wear(page, "gray");
        await expect(hours).toBeVisible();
        const flat = await drawn(hours);
        expect(flat).toMatchObject({ edge: 0, inside: [], outside: [] });

        await wear(page, "embossed");
        await expect(hours).toBeVisible();
        const floor = (await pressedIn(hours)).floor;
        // The well keeps its own colour: only the shade is new.
        expect(floor).toBe(flat.floor);

        await page.goto("/weather/daily");
        await expect(days).toBeVisible();
        expect((await pressedIn(days)).floor).toBe(floor);
        await wear(page, "gray");
        await expect(days).toBeVisible();
        expect(await drawn(days)).toMatchObject({ edge: 0, inside: [], outside: [] });

        // Home's weather card has the next hours on a desktop (a phone's has
        // the weather now alone).
        if (!isMobile) {
          await quietHouse(request);
          await page.goto("/home");
          await expect(hours).toBeAttached();
          expect(await drawn(hours)).toMatchObject({ inside: [], outside: [] });
          await wear(page, "embossed");
          await expect(hours).toBeAttached();
          expect((await pressedIn(hours)).floor).toBe(floor);
        }
      });

      // 0.174.0, the user, circling the conditions and the hours' chart in
      // the Weather sheet: "These two should be concave also like the
      // forecast. Add another concave area that has the current moon phase
      // with an icon". Three more wells, each the forecast's own: its floor,
      // no outline, and the recess where the theme presses the cards in.
      test(`the weather's conditions, its moon and the hours' chart are wells as the forecast's hours are (${scheme})`, async ({ page, request }) => {
        await page.emulateMedia({ colorScheme: scheme });
        const NAMES = ["conditions", "moon", "chart"];
        const wellsIn = (scope: Page | Locator) => NAMES.map((name) => scope.locator(`[data-weather-well="${name}"]`));
        const hours = page.locator('[data-forecast="hourly"]');

        // The page: the Now card's two over the Hourly tab's (a desktop has
        // them all on its one page).
        await page.goto("/weather/hourly");
        await wear(page, "gray");
        await expect(hours).toBeVisible();
        const flat = await drawn(hours);
        expect(flat).toMatchObject({ edge: 0, inside: [], outside: [] });
        for (const well of wellsIn(page)) {
          await expect(well).toBeVisible();
          expect(await drawn(well)).toEqual(flat);
        }
        await wear(page, "embossed");
        await expect(hours).toBeVisible();
        const pressed = await pressedIn(hours);
        expect(pressed.floor).toBe(flat.floor);
        for (const well of wellsIn(page)) {
          await expect(well).toBeVisible();
          expect(await pressedIn(well)).toEqual(pressed);
        }

        // And the sheet Home's weather card opens, which is where the user
        // circled them: the same parts, each as the strip of hours under
        // them is.
        await quietHouse(request);
        await page.goto("/home");
        await page.getByRole("button", { name: "Show the weather" }).click({ position: { x: 60, y: 40 } });
        const sheet = page.getByRole("dialog", { name: "Weather" });
        await expect(sheet.locator('[data-forecast="hourly"]')).toBeVisible();
        expect(await drawn(sheet.locator('[data-forecast="hourly"]'))).toEqual(pressed);
        for (const well of wellsIn(sheet)) {
          await expect(well).toBeVisible();
          expect(await drawn(well)).toEqual(pressed);
        }
      });

      // 0.176.0, the user: "Calendar event sould be concave in embossed
      // theme" — the rows of Home's Calendar card and of the Calendar
      // page's days, each read and not pressed. And the Home card's energy
      // drawer, which since then is the Energy page's parts: each a section
      // of the drawer whose well is pressed in as the page's card is.
      test(`the calendar's events are wells too, and so are the sections of the energy drawer (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        const events = page.locator("[data-calendar-event]");
        await page.goto("/calendar");
        await wear(page, "gray");
        await expect(events.first()).toBeVisible();
        const flat = await drawn(events.first());
        // The flat grey panel they always were.
        expect(flat).toMatchObject({ edge: 0, inside: [], outside: [] });
        expect(flat.floor).not.toBe(CLEAR);

        await wear(page, "embossed");
        await expect(events.first()).toBeVisible();
        const pressed = await pressedIn(events.first());
        // Its own colour still: only the shade is new.
        expect(pressed.floor).toBe(flat.floor);
        // Every event of every day, one that has ended among them.
        const all = await events.evaluateAll((rows) => rows.map((row) => getComputedStyle(row).boxShadow));
        expect(all.length).toBeGreaterThan(3);
        expect(new Set(all).size).toBe(1);

        // Home's Calendar card: the same rows.
        await page.goto("/home");
        const home = page.locator('[data-card="calendar"] [data-calendar-event]');
        await expect(home.first()).toBeAttached();
        expect(await pressedIn(home.first())).toEqual(pressed);
        await wear(page, "gray");
        await expect(home.first()).toBeAttached();
        expect(await drawn(home.first())).toEqual(flat);

        // The energy drawer's sections: flat in Gray…
        const open = async () => {
          await page.getByRole("button", { name: "Show energy detail" }).click({ position: { x: 60, y: 30 } });
          const wells = page.getByRole("dialog").locator("[data-board-panel] > .chakra-card__root");
          await expect(wells).toHaveCount(3);
          await expect(page.getByRole("dialog").getByText("Solar covered today")).toBeVisible();
          return wells;
        };
        for (const well of await (await open()).all()) expect(await drawn(well)).toEqual(flat);
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toBeHidden();
        // …and in Embossed pressed into the drawer, as a calendar's event is into its card.
        await wear(page, "embossed");
        for (const well of await (await open()).all()) expect(await drawn(well)).toEqual(pressed);
      });

      // 0.173.0, the user: "Make all badges like 1 on and 13% be concave
      // in embossed mode. Edit the theme so it applies to all badges app
      // wide" — the badge recipe, so no badge names it.
      test(`every badge is pressed in, a shallower well than a card's, and flat in any other theme (${scheme})`, async ({ page, request, isMobile }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await quietHouse(request);
        await page.goto("/home");
        await wear(page, "gray");
        const badges = {
          // The two the user named: the Fans card's count and the Energy card's coverage.
          "1 on": page.locator('[data-card="fan"] .chakra-card__header .chakra-badge'),
          coverage: page.locator('[data-card="energy"] .chakra-card__header .chakra-badge').first(),
          // And one on a tile that stands up: a fan's Off.
          Off: page.getByRole("button", { name: "Guest Room Fan: off" }).locator(".chakra-badge"),
        };
        await expect(badges["1 on"]).toHaveText("1 on");
        const flat: Record<string, string> = {};
        for (const [name, badge] of Object.entries(badges)) {
          await expect(badge, name).toBeAttached();
          const look = await drawn(badge);
          expect(look, name).toMatchObject({ edge: 0, inside: [], outside: [] });
          flat[name] = look.floor;
        }

        await wear(page, "embossed");
        // "rgba(…) 0px 3px 7px 0px inset": how far down the shade falls, and how soft.
        const depth = (layer: string) => layer.replace(/^.*\)\s*/, "").split(" ").slice(1, 3).map(parseFloat);
        const colour = (layer: string) => /^rgba?\([^)]*\)/.exec(layer)![0];
        for (const [name, badge] of Object.entries(badges)) {
          await expect(badge, name).toBeAttached();
          // The card of the board it is on: the outermost, where a tile is a card too.
          const card = await drawn(badge.locator("xpath=ancestor::*[contains(@class, 'chakra-card__root')][last()]"));
          const own = await drawn(badge);
          // A recess as its card's is — the shade inside its top edge, a
          // hairline of it all round, the light on its lip under it — in
          // the card's own shade and light.
          expect(own.inside, name).toHaveLength(2);
          expect(own.outside, name).toHaveLength(1);
          expect(own.inside.map(colour)).toEqual(card.inside.map(colour));
          expect(own.outside).toEqual(card.outside);
          // But at a badge's size: its shade falls half as far, or it
          // would fill the badge.
          const [down, soft] = depth(own.inside[0]);
          const [cardDown, cardSoft] = depth(card.inside[0]);
          expect(down).toBeGreaterThan(0);
          expect(down).toBeLessThan(cardDown);
          expect(soft).toBeLessThan(cardSoft);
          expect(down).toBeLessThan((await badge.boundingBox())!.height / 4);
          // Its colour is its own still: only the shade is new.
          expect(own.floor, name).toBe(flat[name]);
          expect(own.edge).toBe(0);
        }

        // A badge that is only an outline — a Navigation row's More — keeps
        // that outline in any other theme; pressed in, the recess's edge is
        // the outline, on the wells' floor.
        // A phone's bar holds five entries: a sixth, and two go under More
        // (a desktop's rail holds them all, and has no such row).
        if (!isMobile) return;
        await page.goto("/control/device");
        const sixth = page.getByRole("checkbox", { name: "Show Speed test in the nav" });
        await page.locator("label", { has: sixth }).click();
        await expect(sixth).toBeChecked();
        const more = page.locator(".chakra-badge", { hasText: "More" }).first();
        await expect(more).toBeVisible();
        const pressed = await drawn(more);
        expect(pressed.inside).toHaveLength(2);
        expect(pressed.outside).toHaveLength(1);
        expect(pressed.floor).not.toBe(CLEAR);
        await wear(page, "gray");
        await expect(more).toBeVisible();
        const outlined = await drawn(more);
        expect(outlined.floor).toBe(CLEAR);
        expect(outlined.outside).toEqual([]);
        // One layer inside its edge, with no blur: the 1px ring that is its outline.
        expect(outlined.inside).toHaveLength(1);
        expect(outlined.inside[0]).toMatch(/ 0px 0px 0px 1px inset$/);
      });

      test(`an Unraid container's and VM's tiles are pressed into their cards, and outlined cards in any other theme (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        const tiles = [page.locator('[data-kind="container"][data-guest="Plex"]'), page.locator('[data-kind="vm"][data-guest="Windows 11"]')];
        await page.goto("/unraid");
        await wear(page, "gray");
        const outlined: string[] = [];
        for (const tile of tiles) {
          await expect(tile).toBeVisible();
          const flat = await drawn(tile);
          expect(flat).toMatchObject({ edge: 1, inside: [], outside: [] });
          outlined.push(flat.floor);
        }

        await wear(page, "embossed");
        for (const [i, tile] of tiles.entries()) {
          await expect(tile).toBeVisible();
          // No outline: the recess's own edge in its place — and the wells'
          // colour, where an outlined card's is its card's own by night.
          const floor = (await pressedIn(tile)).floor;
          expect(floor).not.toBe(outlined[i]);
        }
        // Not a button: nothing under a pointer changes it.
        const box = (await tiles[0].boundingBox())!;
        const atRest = await drawn(tiles[0]);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        expect(await tiles[0].evaluate((el) => el.hasAttribute("data-pressing"))).toBe(false);
        expect(await drawn(tiles[0])).toEqual(atRest);
        await page.mouse.up();
      });
    }
  });
});
