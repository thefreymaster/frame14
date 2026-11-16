import { expect, test, type Locator, type Page } from "@playwright/test";
import { lightTile, resetStub } from "./helpers";

// In the Embossed colour theme the tiles that are buttons — a light's, a
// scene's, a thermostat's, a fan's — are pressed into their card as the card
// is into the page (0.170.0, the user: "make the lights and thermostat cards
// embossed in embossed mode"): the same shade inside the top edge and the
// same hairline of light under the lower one, on a floor lifted off the
// card's. A ringed tile's ring is its rim, as the dial's is: the shade starts
// where the ring ends.

/** A tile's recess, layer by layer as Chromium writes the shadows, beside its card's. */
const look = (tile: Locator) =>
  tile.evaluate((el) => {
    const layers = (shadow: string) => (shadow === "none" ? [] : shadow.split(/,(?![^(]*\))/).map((l) => l.trim()));
    // A shadow of nothing: transparent, no offset, blur or spread.
    const nothing = (layer: string) => /^rgba\(0, 0, 0, 0\) 0px 0px 0px 0px( inset)?$/.test(layer);
    const ring = (layer: string) => /^.+ 0px 0px 0px [\d.]+px inset$/.test(layer) && !nothing(layer);
    const own = layers(getComputedStyle(el).boxShadow).filter((l) => !nothing(l));
    const before = getComputedStyle(el, "::before");
    const card = layers(getComputedStyle(el.parentElement!.closest(".chakra-card__root")!).boxShadow);
    return {
      ring: own.filter(ring).map((l) => parseFloat(/([\d.]+)px inset$/.exec(l)![1])),
      lip: own.filter((l) => !l.includes("inset")),
      shade: layers(before.boxShadow),
      shadeFrom: parseFloat(before.top),
      floor: before.backgroundColor,
      card: { inside: card.filter((l) => l.includes("inset")), outside: card.filter((l) => !l.includes("inset")) },
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

test.describe("the Embossed theme's tiles", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test("a light's and a scene's are pressed in as their card is, and flat in any other theme", async ({ page }) => {
    await page.goto("/lights");
    await wear(page, "gray");
    const off = lightTile(page, "Floor Lamp");
    const on = page.locator('[data-light-entry][aria-pressed="true"]').first();
    const scene = page.locator("[data-scene-entry]").first();
    for (const tile of [off, on, scene]) {
      await expect(tile).toBeVisible();
      expect(await look(tile)).toMatchObject({ ring: [], lip: [], shade: [], floor: CLEAR });
    }

    await wear(page, "embossed");
    for (const tile of [off, on, scene]) {
      await expect(tile).toBeVisible();
      const tiled = await look(tile);
      // A card's recess, in its two halves.
      expect(tiled.card.inside).toHaveLength(2);
      expect(tiled.card.outside).toHaveLength(1);
      // The tile's are the same: the shade from its border in, on a floor of
      // its own, and the light under its lower edge.
      expect(tiled.shade).toEqual(tiled.card.inside);
      expect(tiled.shadeFrom).toBe(0);
      expect(tiled.floor).not.toBe(CLEAR);
      expect(tiled.lip).toEqual(tiled.card.outside);
      expect(tiled.ring).toEqual([]);
    }
  });

  test("a thermostat's and a fan's are too, with the ring of one that is on as the rim", async ({ page }) => {
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
      expect(flat).toMatchObject({ lip: [], shade: [], floor: CLEAR });
      expect(flat.ring).toHaveLength(1);
      expect(flat.ring[0]).toBeCloseTo(rim, 1);
    }
    for (const tile of [idle, still]) {
      expect(await look(tile)).toMatchObject({ ring: [], lip: [], shade: [], floor: CLEAR });
    }

    await wear(page, "embossed");
    for (const tile of [heating, spinning, idle, still]) {
      await expect(tile).toBeVisible();
      const tiled = await look(tile);
      expect(tiled.shade).toEqual(tiled.card.inside);
      expect(tiled.floor).not.toBe(CLEAR);
      expect(tiled.lip).toEqual(tiled.card.outside);
    }
    // On: the ring is still the tile's, as wide, and the shade starts at its
    // inner edge. Off: no ring, and the shade starts at the border.
    for (const tile of [heating, spinning]) {
      const tiled = await look(tile);
      expect(tiled.ring).toHaveLength(1);
      expect(tiled.ring[0]).toBeCloseTo(rim, 1);
      expect(tiled.shadeFrom).toBeCloseTo(rim, 1);
    }
    for (const tile of [idle, still]) {
      expect(await look(tile)).toMatchObject({ ring: [], shadeFrom: 0 });
    }
  });

  test("a tile's ring still comes and goes as one shadow fading into the other", async ({ page }) => {
    // On and off are the same list of shadows — the ring, then the lip — so
    // the browser tweens them; a list of another length or kind would jump.
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
});
