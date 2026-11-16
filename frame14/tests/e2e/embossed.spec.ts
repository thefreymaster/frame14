import { expect, test, type Locator, type Page } from "@playwright/test";
import { lightTile, resetStub } from "./helpers";

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

  test("the buttons stand up too — the voice and screen buttons, All off, a remote's Views — and one with no face doesn't", async ({ page, isMobile }) => {
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
      await page.goto("/control/views");
      const views = page.getByRole("button", { name: "Overview" });
      await expect(views).toBeVisible();
      expect(await button(views)).toEqual(RAISED);
      expect(await button(page.getByRole("button", { name: "Clock" }))).toEqual(RAISED);
      // The views the frames aren't on: the header buttons' colour, no outline.
      expect(await face(views)).toEqual([await headerFace(page), "0px"]);
    }
  });
});
