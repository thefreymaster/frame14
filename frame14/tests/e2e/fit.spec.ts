import { expect, test, type Page } from "@playwright/test";
import { quietHouse, resetStub, splashGone } from "./helpers";

// /home fits the screen instead of scrolling, wherever there is the room
// (0.171.0, the user: "I want the Home Screen on frame14 and desktops to not
// scroll. Figure out a way so that cards are shown but the content does not
// scroll. I want it to feel more native app"). Every card stays on the board;
// one that doesn't fit whole is cut under a row of its content — an event, a
// row of tiles — or folded to its header, says what it hides, and opens out
// whole from there ("All content should still be viewable … if it says and
// four more items there should be a way to see those items"). A phone's
// board scrolls as before.

/** How far the page can scroll, and what the board looks like. */
const board = (page: Page) =>
  page.evaluate(() => {
    const grid = document.querySelector(".home-board") as HTMLElement;
    const pad = parseFloat(getComputedStyle(grid).paddingBottom);
    const floor = grid.offsetTop + grid.offsetHeight - pad;
    // The page's own scrollers: the document, and whatever the board is in
    // (Layout's box) — not a nav rail that is longer than the window.
    const around: Element[] = [document.scrollingElement as Element];
    for (let el = grid.parentElement; el; el = el.parentElement) {
      if (/auto|scroll/.test(getComputedStyle(el).overflowY)) around.push(el);
    }
    const scrollers = around.filter((el) => el.scrollHeight > el.clientHeight + 1);
    const cards = [...document.querySelectorAll<HTMLElement>(".home-card")]
      .filter((card) => card.offsetHeight > 0)
      .map((card) => {
        // (A hidden card's stand-in, while arranging, has no card of its own.)
        const box = card.querySelector<HTMLElement>(":scope > .home-card-body > .chakra-card__root") ?? card;
        const more = card.querySelector<HTMLElement>(":scope > .home-card-more");
        return {
          id: card.dataset.card!,
          cut: card.dataset.fitCut ?? null,
          more: more && !more.hidden ? more.textContent : null,
          // Its foot against the board's, in layout pixels.
          over: Math.max(0, Math.round(card.offsetTop + card.offsetHeight - floor)),
          rows: box.querySelectorAll("[data-fit-row]").length,
          hidden: box.querySelectorAll("[data-fit-row][inert]").length,
        };
      });
    return { fits: grid.hasAttribute("data-fits"), scrolls: scrollers.length > 0, cards };
  });

const card = (state: Awaited<ReturnType<typeof board>>, id: string) => state.cards.find((c) => c.id === id)!;

test.describe("the fitted Home", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test("a phone's board scrolls, every card whole", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the phone project's");
    await page.goto("/home");
    await splashGone(page);
    await expect(page.locator(".home-card").first()).toBeVisible();
    const state = await board(page);
    expect(state.fits).toBe(false);
    expect(state.scrolls).toBe(true);
    expect(state.cards.filter((c) => c.cut != null)).toEqual([]);
  });

  test.describe("on a desktop", () => {
    test.skip(({ isMobile }) => isMobile, "the desktop project's");

    test("nothing scrolls: every card is on the board, and none runs past its foot", async ({ page }) => {
      await page.goto("/home");
      await splashGone(page);
      // The stub's house is a busy one: a game, a print, a vacuum out.
      await expect.poll(async () => (await board(page)).cards.length).toBeGreaterThanOrEqual(8);
      await expect.poll(async () => (await board(page)).cards.some((c) => c.cut != null)).toBe(true);
      const state = await board(page);
      expect(state.fits).toBe(true);
      expect(state.scrolls).toBe(false);
      expect(state.cards.filter((c) => c.over > 0)).toEqual([]);
    });

    test("a cut card ends under a row, says how many it hides, and keeps the hidden ones out of reach", async ({ page }) => {
      await page.goto("/home");
      await splashGone(page);
      await expect.poll(async () => card(await board(page), "calendar")?.cut).toBe("");
      const calendar = card(await board(page), "calendar");
      // Ten events, today's and tomorrow's; the ones under the cut are counted.
      expect(calendar.rows).toBe(10);
      expect(calendar.hidden).toBeGreaterThan(0);
      expect(calendar.more).toBe(`+${calendar.hidden} more`);

      const slot = page.locator('.home-card[data-card="calendar"]');
      const root = slot.locator(".chakra-card__root").first();
      const more = slot.locator(":scope > .home-card-more");
      await expect(more).toBeVisible();
      // Along the card's foot, inside its edge: the card's padding again, in
      // the card's own colour.
      const foot = await root.evaluate((el) => {
        const button = el.closest(".home-card")!.querySelector(":scope > .home-card-more") as HTMLElement;
        const card = el.getBoundingClientRect();
        const strip = button.getBoundingClientRect();
        return {
          height: Math.round(strip.height),
          pad: Math.round(parseFloat(getComputedStyle(el.querySelector(".chakra-card__body")!).paddingBottom)),
          inside: strip.left >= card.left && strip.right <= card.right && Math.abs(card.bottom - strip.bottom - 1) < 1,
          sameColour: getComputedStyle(button).backgroundColor === getComputedStyle(el).backgroundColor,
          // The cut falls in the gap under the last row shown: that row is
          // whole above the button, and the next starts under it.
          rows: (() => {
            const rows = [...el.querySelectorAll<HTMLElement>("[data-fit-row]")];
            const shown = rows.filter((row) => !row.inert).at(-1)!.getBoundingClientRect();
            const next = rows.find((row) => row.inert)!.getBoundingClientRect();
            return { lastEndsAbove: shown.bottom <= strip.top + 1, nextStartsBelow: next.top >= strip.top - 1 };
          })(),
        };
      });
      expect(foot.height).toBe(foot.pad);
      expect(foot).toMatchObject({ inside: true, sameColour: true, rows: { lastEndsAbove: true, nextStartsBelow: true } });
      // It can't be scrolled to what it hides.
      expect(await root.evaluate((el) => ((el.scrollTop = 200), el.scrollTop))).toBe(0);
    });

    test("its button opens the card out whole: every row, in a dialog that scrolls inside itself", async ({ page }) => {
      await page.goto("/home");
      await splashGone(page);
      const slot = page.locator('.home-card[data-card="calendar"]');
      const more = slot.locator(":scope > .home-card-more");
      await expect(more).toBeVisible();
      await expect(more).toHaveAccessibleName("Show all of Calendar");
      await more.click();

      const dialog = page.getByRole("dialog", { name: "Calendar" });
      await expect(dialog).toBeVisible();
      // The card's own header — its title and what it says of today — and
      // every event, none held back.
      await expect(dialog.getByRole("heading", { name: "Calendar" })).toBeVisible();
      await expect(dialog.getByText("Eight events today")).toBeVisible();
      await expect(dialog.locator("[data-fit-row]")).toHaveCount(10);
      await expect(dialog.locator("[data-fit-row][inert]")).toHaveCount(0);
      await expect(dialog.getByText("Soccer practice").last()).toBeVisible();
      // In a window shorter than the list, it scrolls in itself.
      await page.setViewportSize({ width: 1920, height: 620 });
      await expect
        .poll(() => dialog.evaluate((el) => [...el.querySelectorAll("*")].some((n) => n.scrollHeight > n.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(n).overflowY))))
        .toBe(true);
      await page.setViewportSize({ width: 1920, height: 1080 });

      await dialog.getByRole("button", { name: "Close" }).click();
      await expect(dialog).toBeHidden();
      // The board is as it was: still cut, still not scrolling.
      await expect.poll(async () => card(await board(page), "calendar")?.cut).toBe("");
      expect((await board(page)).scrolls).toBe(false);
    });

    test("a card folded to its header says in it what its body would have", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 620 });
      await page.goto("/home");
      await splashGone(page);
      await expect.poll(async () => card(await board(page), "header")?.cut).toBe("header");
      const weather = page.locator('.home-card[data-card="header"]');
      await expect(weather.locator("[data-fit-folded]")).toBeVisible();
      await expect(weather.locator("[data-fit-folded]")).toHaveText(/^74° Cloudy ·/);
      expect((await board(page)).scrolls).toBe(false);

      // The folded card is all one button to the whole of it — its header's
      // own buttons aside.
      const lights = page.locator('.home-card[data-card="lights"]');
      await expect.poll(async () => card(await board(page), "lights")?.cut).toBe("header");
      const more = lights.locator(":scope > .home-card-more");
      await expect(more).toBeVisible();
      await expect(more).toHaveText("");
      // The whole of the card, title and all, is under it…
      expect(
        await lights.evaluate((el) => {
          const title = el.querySelector("h2")!.getBoundingClientRect();
          return document.elementFromPoint(title.x + title.width / 2, title.y + title.height / 2)?.className;
        }),
      ).toBe("home-card-more");
      await more.click();
      const dialog = page.getByRole("dialog", { name: "Lights" });
      await expect(dialog.locator("[data-light-entry]")).toHaveCount(5);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      // …but All off, in the folded header, is still All off.
      await lights.getByRole("button", { name: "Turn off all lights" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(lights.getByText("1 on")).toBeVisible();
    });

    test("a taller window shows more of the same board", async ({ page }) => {
      // (Under about 900px tall: above that the type grows with the window,
      // and the board holds as much as it did.)
      await page.setViewportSize({ width: 1920, height: 660 });
      await page.goto("/home");
      await splashGone(page);
      await expect.poll(async () => (await board(page)).cards.some((c) => c.cut != null)).toBe(true);
      const hidden = async () => {
        const state = await board(page);
        return state.cards.reduce((sum, c) => sum + c.hidden, 0) + 20 * state.cards.filter((c) => c.cut === "header").length;
      };
      const before = await hidden();
      await page.setViewportSize({ width: 1920, height: 900 });
      await expect.poll(hidden).toBeLessThan(before);
      const state = await board(page);
      expect(state.scrolls).toBe(false);
      expect(state.cards.filter((c) => c.over > 0)).toEqual([]);
    });

    test("a quieter house gives the room to what is left", async ({ page, request }) => {
      await page.goto("/home");
      await splashGone(page);
      await expect.poll(async () => card(await board(page), "calendar")?.cut).toBe("");
      const shown = async () => {
        const calendar = card(await board(page), "calendar");
        return calendar.rows - calendar.hidden;
      };
      const before = await shown();
      // The game over, the print done, the vacuum home: three cards leave.
      await quietHouse(request);
      await expect.poll(async () => (await board(page)).cards.length).toBeLessThanOrEqual(6);
      await expect.poll(shown).toBeGreaterThanOrEqual(before);
      const state = await board(page);
      expect(state.scrolls).toBe(false);
      expect(state.cards.filter((c) => c.over > 0)).toEqual([]);
      // The thermostats, the fans and the lights are all whole.
      for (const id of ["climate", "fan", "lights"]) expect(card(state, id).cut, id).toBeNull();
    });

    test("folding a card by hand gives its room to the cards cut short under it", async ({ page, request }) => {
      await quietHouse(request);
      await page.goto("/home");
      await splashGone(page);
      await expect.poll(async () => card(await board(page), "calendar")?.cut).toBe("");
      const shown = async () => {
        const calendar = card(await board(page), "calendar");
        return calendar.rows - calendar.hidden;
      };
      const before = await shown();
      // Climate is over the calendar, in its columns.
      await page.getByRole("button", { name: /^Climate\b/ }).first().click();
      await expect(page.getByText("Heating to 70°")).toBeHidden();
      await expect.poll(shown).toBeGreaterThan(before);
      expect((await board(page)).scrolls).toBe(false);
    });

    test("arranging shows every card whole and scrolls, and Done fits the board again", async ({ page }) => {
      await page.goto("/home");
      await splashGone(page);
      await expect.poll(async () => (await board(page)).cards.some((c) => c.cut != null)).toBe(true);

      // Press and hold a card's header to arrange.
      const title = page.locator('.home-card[data-card="climate"] .chakra-card__header').first();
      const box = (await title.boundingBox())!;
      await page.mouse.move(box.x + 60, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(800);
      await page.mouse.up();
      await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
      await expect.poll(async () => (await board(page)).fits).toBe(false);
      const arranging = await board(page);
      expect(arranging.cards.filter((c) => c.cut != null)).toEqual([]);
      expect(arranging.scrolls).toBe(true);
      await expect(page.locator(".home-card [data-fit-row][inert]")).toHaveCount(0);
      await expect(page.locator(".home-card-more")).toHaveCount(0);

      await page.getByRole("button", { name: "Done" }).click();
      await expect.poll(async () => (await board(page)).fits).toBe(true);
      await expect.poll(async () => (await board(page)).scrolls).toBe(false);
      expect((await board(page)).cards.some((c) => c.cut != null)).toBe(true);
    });
  });
});
