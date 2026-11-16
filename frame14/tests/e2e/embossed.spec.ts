import { expect, test, type Locator, type Page } from "@playwright/test";
import { lightTile, resetStub } from "./helpers";

// In the Embossed colour theme the cards are pressed into the page — and
// the buttons stand up out of the cards (0.171.1, the user: "instead of
// having the buttons feel indented, change them to feel like convexed
// popping out, so inverted of the embossed feel. This goes for the light
// buttons the climate buttons and any other button like the voice and
// screen, as well as views in the control/views route"; the tiles were
// pressed in with the cards for a version, 0.170.0). A tile that is a button
// — a light's, a scene's, a thermostat's, a fan's — has a bevelled face, the
// light along its top edge and the shade along its lower one, on a colour
// lifted off the card's, and casts a shadow on the card; a ringed tile's
// ring is its rim, the face inside it. Held down, it casts none.

/** A tile's layers as Chromium writes the shadows: its ring, the shadow it casts, the face inside. */
const look = (tile: Locator) =>
  tile.evaluate((el) => {
    const layers = (shadow: string) => (shadow === "none" ? [] : shadow.split(/,(?![^(]*\))/).map((l) => l.trim()));
    // A shadow of nothing: transparent, no offset, blur or spread.
    const nothing = (layer: string) => /^rgba\(0, 0, 0, 0\) 0px 0px 0px 0px( inset)?$/.test(layer);
    const ring = (layer: string) => /^.+ 0px 0px 0px [\d.]+px inset$/.test(layer) && !nothing(layer);
    // A layer's vertical offset: "rgba(…) 0px 2px 4px 0px".
    const down = (layer: string) => parseFloat(layer.replace(/^.*\)\s*/, "").split(" ")[1]);
    const own = layers(getComputedStyle(el).boxShadow).filter((l) => !nothing(l));
    const before = getComputedStyle(el, "::before");
    const face = layers(before.boxShadow);
    return {
      ring: own.filter(ring).map((l) => parseFloat(/([\d.]+)px inset$/.exec(l)![1])),
      // What it casts: outside the tile, and falling below it.
      cast: own.filter((l) => !l.includes("inset")).map(down),
      // The bevel: inside, each layer's offset — the light from the top
      // edge down, the shade from the lower edge up.
      bevel: face.filter((l) => l.includes("inset")).map(down),
      faceFrom: parseFloat(before.top),
      floor: before.backgroundColor,
    };
  });

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

  test("a light's and a scene's tiles stand up out of their card, and lie flat in any other theme", async ({ page }) => {
    await page.goto("/lights");
    await wear(page, "gray");
    const off = lightTile(page, "Floor Lamp");
    const on = page.locator('[data-light-entry][aria-pressed="true"]').first();
    const scene = page.locator("[data-scene-entry]").first();
    for (const tile of [off, on, scene]) {
      await expect(tile).toBeVisible();
      expect(await look(tile)).toMatchObject({ ring: [], cast: [], bevel: [], floor: CLEAR });
    }

    await wear(page, "embossed");
    for (const tile of [off, on, scene]) {
      await expect(tile).toBeVisible();
      const raised = await look(tile);
      // The light along the top edge, the shade along the lower one…
      expect(raised.bevel).toHaveLength(2);
      expect(raised.bevel[0]).toBeGreaterThan(0);
      expect(raised.bevel[1]).toBeLessThan(0);
      // …on a face of its own, from the tile's border in…
      expect(raised.faceFrom).toBe(0);
      expect(raised.floor).not.toBe(CLEAR);
      // …and a shadow on the card under it.
      expect(raised.cast.length).toBeGreaterThan(0);
      expect(Math.max(...raised.cast)).toBeGreaterThan(0);
      expect(raised.ring).toEqual([]);
    }
  });

  test("a thermostat's and a fan's do too, with the ring of one that is on as the rim", async ({ page }) => {
    await page.goto("/home");
    await wear(page, "gray");
    const heating = page.getByRole("button", { name: /^1st Floor:/ });
    const idle = page.getByRole("button", { name: /^2nd Floor:/ });
    const spinning = page.getByRole("button", { name: /^Living Room Ceiling Fan:/ });
    const still = page.getByRole("button", { name: /^Guest Room Fan:/ });
    // The ring inside the 1px border: a quarter rem in all.
    const rim = 0.25 * (await rem(page)) - 1;
    for (const tile of [heating, spinning]) {
      await expect(tile).toBeVisible();
      const flat = await look(tile);
      expect(flat).toMatchObject({ cast: [], bevel: [], floor: CLEAR });
      expect(flat.ring).toHaveLength(1);
      expect(flat.ring[0]).toBeCloseTo(rim, 1);
    }
    for (const tile of [idle, still]) {
      expect(await look(tile)).toMatchObject({ ring: [], cast: [], bevel: [], floor: CLEAR });
    }

    await wear(page, "embossed");
    for (const tile of [heating, spinning, idle, still]) {
      await expect(tile).toBeVisible();
      const raised = await look(tile);
      expect(raised.bevel).toHaveLength(2);
      expect(raised.floor).not.toBe(CLEAR);
      expect(Math.max(...raised.cast)).toBeGreaterThan(0);
    }
    // On: the ring is still the tile's, as wide, and the face starts at its
    // inner edge. Off: no ring, and the face starts at the border.
    for (const tile of [heating, spinning]) {
      const raised = await look(tile);
      expect(raised.ring).toHaveLength(1);
      expect(raised.ring[0]).toBeCloseTo(rim, 1);
      expect(raised.faceFrom).toBeCloseTo(rim, 1);
    }
    for (const tile of [idle, still]) {
      expect(await look(tile)).toMatchObject({ ring: [], faceFrom: 0 });
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
    const RAISED = { bevel: 2, cast: 2 };

    await page.goto("/lights");
    await wear(page, "gray");
    const screen = page.locator("[data-header-buttons] button").last();
    const allOff = page.getByRole("button", { name: "Turn off all lights" });
    await expect(allOff).toBeVisible();
    expect(await button(screen)).toEqual(FLAT);
    expect(await button(allOff)).toEqual(FLAT);

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
    // An outline button's face is lifted off the card's, as a tile's is.
    expect(await allOff.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(CLEAR);
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
    }
  });
});
