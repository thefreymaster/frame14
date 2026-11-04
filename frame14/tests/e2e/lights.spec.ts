import { expect, test, type Page } from "@playwright/test";
import { dialReading, lightTile, resetStub, splashGone, stub } from "./helpers";

/** The board titled `title`, and the tiles in it. */
function board(page: Page, title: string) {
  return page
    .locator(".chakra-card__root")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) })
    .first();
}

/** Press and hold the middle of `tile` with the mouse, past the hold's 600ms. */
async function hold(page: Page, tile: ReturnType<Page["getByRole"]>) {
  await splashGone(page);
  await tile.scrollIntoViewIfNeeded();
  const box = (await tile.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
}

/** The labels of the tiles in `scope`, in order. */
const labels = (scope: ReturnType<Page["locator"]>) =>
  scope.locator("[data-light-entry]").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));

test.describe("the Lights page", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test("groups the lights by Home Assistant's rooms", async ({ page }) => {
    await page.goto("/lights");
    // The configured rooms first, then the rooms the other lights are in,
    // then the switches in no room; nothing is left for "Other lights".
    for (const room of ["Living Room", "Kitchen", "Outside", "Aiden's Room", "Basement", "Evan's Office", "Primary Bedroom", "Switches"]) {
      await expect(page.getByRole("heading", { name: room, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Other lights" })).toHaveCount(0);

    // Living Room holds the three configured lights and the Floor Lamp the
    // room brought in; Outside the porch light, placed through its device.
    await expect(board(page, "Living Room").locator("[data-light-entry]")).toHaveCount(4);
    await expect(board(page, "Living Room").getByRole("button", { name: /^Floor Lamp:/ })).toBeVisible();
    await expect(board(page, "Kitchen").locator("[data-light-entry]")).toHaveCount(2);
    await expect(board(page, "Outside").getByRole("button", { name: /^Front Porch:/ })).toBeVisible();
    await expect(board(page, "Switches").locator("[data-light-entry]")).toHaveCount(1);
  });

  test("a tap turns a light off, and on again", async ({ page }) => {
    await page.goto("/lights");
    const tile = lightTile(page, "Living Room");
    await expect(tile).toHaveAttribute("aria-label", "Living Room: 80%");
    await expect(tile).toHaveAttribute("aria-pressed", "true");

    await tile.click();
    await expect(tile).toHaveAttribute("aria-label", "Living Room: Off");
    await expect(tile).toHaveAttribute("aria-pressed", "false");

    await tile.click();
    await expect(tile).toHaveAttribute("aria-label", "Living Room: 80%");
  });

  test("the tile spins until Home Assistant reports the change", async ({ page, request }) => {
    await stub(request, "/_stub/service", { delay_ms: 1500 });
    await page.goto("/lights");
    const tile = lightTile(page, "Living Room");
    await tile.click();
    await expect(tile).toHaveAttribute("aria-busy", "true");
    await expect(tile).toHaveAttribute("aria-busy", "false");
    await expect(tile).toHaveAttribute("aria-label", "Living Room: Off");
  });

  test("a call Home Assistant refuses shows an error toast and leaves the light as it was", async ({ page, request }) => {
    await stub(request, "/_stub/service", { fail: { "light.kitchen_main_lights": "The bulb isn't answering" } });
    await page.goto("/lights");
    // "Kitchen Main Lights" in Home Assistant: the tile drops the word (0.139),
    // and draws the icon set for it there (the stub's mdi:ceiling-light).
    const tile = lightTile(page, "Kitchen Main");
    await expect(tile).toHaveAttribute("aria-label", "Kitchen Main: Off");
    const glyph = tile.locator("[data-mdi-icon=ceiling-light]");
    await expect(glyph).toHaveCSS("mask-image", /\/api\/icon\/ceiling-light/);
    expect((await page.request.get("/api/icon/ceiling-light")).status()).toBe(200);
    await tile.click();
    await expect(page.getByText("Couldn't turn on Kitchen Main")).toBeVisible();
    await expect(page.getByText("The bulb isn't answering")).toBeVisible();

    // In the bottom-right corner (0.157.0), 1rem in from the right edge; on
    // the phone just above its bottom bar, on the desktop (no bar) 1rem up
    // from the bottom. Polled: the toast slides in.
    const view = page.viewportSize()!;
    const gaps = async () => {
      const box = (await page.locator('[data-scope="toast"][data-part="root"]').first().boundingBox())!;
      const bar = await page.locator('[data-nav="bar"]').boundingBox();
      const floor = bar && bar.height > 0 && bar.y < view.height ? bar.y : view.height;
      return { right: Math.round(view.width - box.x - box.width), bottom: Math.round(floor - box.y - box.height) };
    };
    await expect.poll(async () => { const g = await gaps(); return g.right >= 8 && g.right <= 24 && g.bottom >= 8 && g.bottom <= 24; }).toBe(true);
    await expect(tile).toHaveAttribute("aria-busy", "false");
    await expect(tile).toHaveAttribute("aria-label", "Kitchen Main: Off");
  });

  test("All off turns off every light but the kid's hatch light", async ({ page, request }) => {
    await page.goto("/lights");
    const on = page.locator("[data-light-entry][aria-pressed=true]");
    await expect(on).toHaveCount(5);
    await page.getByRole("button", { name: "Turn off all lights" }).click();
    await expect(on).toHaveCount(1);
    await expect(on).toHaveAttribute("aria-label", /^Kid's Hatch: /);
    // With only the spared light on there is nothing left to turn off.
    await expect(page.getByRole("button", { name: "Turn off all lights" })).toHaveCount(0);
    // The title's bulb is lit while a light is on and dim with none, as the
    // rooms' are (0.157.0).
    const bulb = board(page, "Lights").locator(".chakra-card__header svg").first();
    await expect(bulb).toHaveCSS("color", "rgb(234, 179, 8)");
    await stub(request, "/_stub/state", { entity_id: "light.aidens_hatch_light", state: "off" });
    await expect(on).toHaveCount(0);
    await expect(bulb).not.toHaveCSS("color", "rgb(234, 179, 8)");
  });

  test("a light the registry moves to another room regroups live", async ({ page, request }) => {
    await page.goto("/lights");
    await expect(board(page, "Living Room").locator("[data-light-entry]")).toHaveCount(4);
    await stub(request, "/_stub/registry", { entity_id: "light.lady_lamp", area_id: "kitchen" });
    await expect(board(page, "Kitchen").getByRole("button", { name: /^Reading Nook:/ })).toBeVisible();
    await expect(board(page, "Living Room").locator("[data-light-entry]")).toHaveCount(3);
  });

  // 0.139: a sideways swipe across a dimmable tile sets its brightness where
  // the finger ends; the release is not a tap.
  test("a swipe across a light's tile dims it to where the finger ends", async ({ page }) => {
    await page.goto("/lights");
    // In its room: the page regroups once the rooms arrive, and a tile
    // remounted under a finger forgets the drag.
    const tile = board(page, "Living Room").getByRole("button", { name: /^Living Room: / });
    await expect(tile).toHaveAttribute("aria-label", "Living Room: 80%");
    // The mouse, unlike a click, doesn't wait for the launch splash to leave.
    await splashGone(page);
    const box = (await tile.boundingBox())!;
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 8, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.3, y, { steps: 4 });
    await page.mouse.move(box.x + box.width * 0.5, y, { steps: 4 });
    await page.mouse.up();
    // Half way: the stub sets the light's brightness from the call.
    await expect(tile).toHaveAttribute("aria-label", /^Living Room: (49|50|51)%$/);
    await expect(tile).toHaveAttribute("aria-pressed", "true");
  });

  // 0.141: a press and hold opens the light's drawer, the thermostat's dial
  // with the brightness on its arc; its + steps a tenth, sent once the taps
  // stop — after the drawer has closed, even.
  test("a hold opens the thermostat's dial for the brightness, and its + steps it", async ({ page }) => {
    await page.goto("/lights");
    const tile = board(page, "Living Room").getByRole("button", { name: /^Living Room: / });
    await expect(tile).toHaveAttribute("aria-label", "Living Room: 80%");
    await splashGone(page);
    const box = (await tile.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(800);
    await page.mouse.up();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Living Room" })).toBeVisible();
    const dial = dialog.getByRole("slider", { name: "Brightness" });
    await expect(dial).toHaveAttribute("aria-valuemin", "0");
    await expect(dial).toHaveAttribute("aria-valuemax", "100");
    await expect(dial).toHaveAttribute("aria-valuenow", "80");
    await expect(dialog.getByText("Light on")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close" })).toBeVisible();
    // The presets still follow the dial.
    await expect(dialog.getByRole("button", { name: "Warm" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Blue" })).toBeVisible();
    // No mode and no temperature: a light has a brightness.
    await expect(dialog.getByText("Heat", { exact: true })).toHaveCount(0);

    await dialog.getByRole("button", { name: "Raise the brightness" }).click();
    await expect.poll(() => dialReading(dialog)).toBe("90%");
    await expect(dial).toHaveAttribute("aria-valuenow", "90");
    // Closed before the taps' send: it still reaches Home Assistant.
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
    await expect(tile).toHaveAttribute("aria-label", "Living Room: 90%");
  });

  test("the drawer's switch turns the light off, and the dial reads 0%", async ({ page }) => {
    await page.goto("/lights");
    const tile = board(page, "Living Room").getByRole("button", { name: /^Living Room: / });
    await splashGone(page);
    const box = (await tile.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(800);
    await page.mouse.up();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // The switch's input is visually hidden; its label takes the tap.
    await dialog.getByText("On", { exact: true }).click();
    await expect(dialog.getByRole("checkbox")).not.toBeChecked();
    await expect.poll(() => dialReading(dialog)).toBe("0%");
    await expect(dialog.getByText("Light off")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Lower the brightness" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(tile).toHaveAttribute("aria-label", "Living Room: Off");
  });
  // 0.154.0: a group with a light on lights its header's icon and has an
  // All off of its own, which spares what the page's spares.
  test("a room with a light on has its icon lit and its own All off, which turns the room off alone", async ({ page }) => {
    await page.goto("/lights");
    const kitchen = board(page, "Kitchen");
    const icon = kitchen.locator(".chakra-card__header svg").first();
    // Chakra's yellow.500, the page header's.
    const LIT = "rgb(234, 179, 8)";
    await expect(kitchen.getByRole("button", { name: "Kitchen Cabinet: 35%" })).toBeVisible();
    await expect(icon).toHaveCSS("color", LIT);
    // A room with nothing on: neither.
    const outside = board(page, "Outside");
    await expect(outside.getByRole("button", { name: "Backyard: Off" })).toBeVisible();
    await expect(outside.locator(".chakra-card__header svg").first()).not.toHaveCSS("color", LIT);
    await expect(page.getByRole("button", { name: "Turn off Outside" })).toHaveCount(0);
    // The kid's hatch light alone in its room: lit, but no All off for it.
    await expect(board(page, "Aiden's Room").locator(".chakra-card__header svg").first()).toHaveCSS("color", LIT);
    await expect(page.getByRole("button", { name: "Turn off Aiden's Room" })).toHaveCount(0);

    await kitchen.getByRole("button", { name: "Turn off Kitchen" }).click();
    await expect(kitchen.getByRole("button", { name: "Kitchen Cabinet: Off" })).toBeVisible();
    await expect(kitchen.getByRole("button", { name: "Turn off Kitchen" })).toHaveCount(0);
    await expect(icon).not.toHaveCSS("color", LIT);
    // The rest of the house as it was.
    await expect(board(page, "Living Room").getByRole("button", { name: "Living Room: 80%" })).toBeVisible();
    await expect(page.getByText("4 on")).toBeVisible();
  });

  // 0.153.0: the star in a light's drawer makes it one of this device's
  // favourites, in a card across the top of the page.
  test("a light starred from its drawer joins the Favorites card at the top, through a reload, and leaves it unstarred", async ({ page }) => {
    await page.goto("/lights");
    const outside = board(page, "Outside");
    await expect(outside.getByRole("button", { name: "Backyard: Off" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Favorites" })).toHaveCount(0);

    await hold(page, outside.getByRole("button", { name: "Backyard: Off" }));
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Backyard" })).toBeVisible();
    // The close button keeps the first focus; the star sits beside it.
    await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
    const star = dialog.getByRole("button", { name: "Favorite" });
    await expect(star).toHaveAttribute("aria-pressed", "false");
    await star.click();
    await expect(star).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // The card, first on the page, holding the light — which its room keeps.
    const favorites = board(page, "Favorites");
    await expect.poll(() => labels(favorites)).toEqual(["Backyard: Off"]);
    await expect(outside.getByRole("button", { name: "Backyard: Off" })).toBeVisible();
    const top = (await favorites.boundingBox())!.y;
    expect(top).toBeLessThan((await board(page, "Living Room").boundingBox())!.y);
    // A tap there is the light's, as anywhere.
    await favorites.getByRole("button", { name: "Backyard: Off" }).click();
    await expect(favorites.getByRole("button", { name: /^Backyard: / })).toHaveAttribute("aria-label", "Backyard: 100%");

    await page.reload();
    await expect.poll(() => labels(board(page, "Favorites"))).toEqual(["Backyard: 100%"]);

    // Unstarred from the card's own drawer: the card goes, the drawer stays.
    await hold(page, board(page, "Favorites").getByRole("button", { name: /^Backyard: / }));
    await dialog.getByRole("button", { name: "Favorite" }).click();
    await expect(dialog.getByRole("button", { name: "Favorite" })).toHaveAttribute("aria-pressed", "false");
    await expect(dialog.getByRole("slider", { name: "Brightness" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("heading", { name: "Favorites" })).toHaveCount(0);
    await expect(outside.getByRole("button", { name: "Backyard: 100%" })).toBeVisible();
  });

  // 0.153.0: a switch's hold opens a drawer too — its power switch and the
  // star — so it can be a favourite like any light.
  test("a hold on a switch opens its drawer, whose switch turns it on and whose star makes it a favourite", async ({ page }) => {
    await page.goto("/lights");
    const tile = board(page, "Switches").getByRole("button", { name: /^Smart Plug: / });
    await expect(tile).toHaveAttribute("aria-label", "Smart Plug: Off");
    await hold(page, tile);

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Smart Plug" })).toBeVisible();
    await expect(dialog.getByRole("slider")).toHaveCount(0);
    await expect(dialog.getByRole("checkbox")).not.toBeChecked();
    // The hold's release wasn't a tap. (The page under a drawer is
    // aria-hidden, so the tile by its attribute.)
    const under = (label: string) => page.locator(`[data-light-entry][aria-label="${label}"]`);
    await expect(under("Smart Plug: Off")).toHaveCount(1);
    await dialog.getByText("Off", { exact: true }).click();
    await expect(dialog.getByRole("checkbox")).toBeChecked();
    await expect(under("Smart Plug: On")).toHaveCount(1);

    await dialog.getByRole("button", { name: "Favorite" }).click();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
    await expect.poll(() => labels(board(page, "Favorites"))).toEqual(["Smart Plug: On"]);
  });
});
