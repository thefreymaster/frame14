import { devices, expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { lightTile, PAGES, resetStub, splashGone } from "./helpers";
import { APP_URL } from "./ports";

// A press that feels like a real button's (0.170.0, lib/press): whatever is
// under the pointer goes in at contact — smaller, shaded along its top edge —
// and springs back when let go; a tap ticks where there is a motor
// (lib/haptics), and on an iPhone every button wears the ios-haptics
// library's label, with the hidden switch that ticks there.

const pressing = (el: Locator) => el.evaluate((e) => e.hasAttribute("data-pressing"));
/** The element's scale as Chromium reports it: "none" at rest. */
const scaleOf = (el: Locator) => el.evaluate((e) => getComputedStyle(e).scale);
const shade = (el: Locator) =>
  el.evaluate((e) => {
    const after = getComputedStyle(e, "::after");
    return { drawn: after.content !== "none" && after.boxShadow !== "none", opacity: after.opacity };
  });

/** Puts the mouse down on the middle of `el` and leaves it there. */
async function pressOn(page: Page, el: Locator) {
  await el.scrollIntoViewIfNeeded();
  const box = (await el.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
}

/** Lifts the mouse somewhere that is nothing, so no click lands on what was held. */
async function liftAway(page: Page) {
  await page.mouse.move(1, 1);
  await page.mouse.up();
}

test.describe("a press", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test("a tile goes in under the pointer, shaded, and comes back when it lifts", async ({ page }) => {
    await page.goto("/lights");
    await splashGone(page);
    const tile = lightTile(page, "Floor Lamp");
    await expect(tile).toBeVisible();
    expect(await scaleOf(tile)).toBe("none");
    expect((await shade(tile)).opacity).toBe("0");

    await pressOn(page, tile);
    expect(await pressing(tile)).toBe(true);
    // Further in than the 0.98 it had, and all the way there.
    await expect.poll(() => scaleOf(tile)).toBe("0.96");
    await expect.poll(() => shade(tile)).toEqual({ drawn: true, opacity: "1" });
    // Going in is quick; the way back is the slower, sprung one.
    expect(await tile.evaluate((e) => getComputedStyle(e).transitionDuration.split(", ")[0])).toBe("0.08s");

    await liftAway(page);
    await expect.poll(() => pressing(tile)).toBe(false);
    expect(await tile.evaluate((e) => getComputedStyle(e).transitionDuration.split(", ")[0])).toBe("0.38s");
    expect(await tile.evaluate((e) => getComputedStyle(e).transitionTimingFunction.split(/, (?![^(]*\))/)[0])).toMatch(
      /^cubic-bezier\(0\.\d+, 1\.\d+,/,
    );
    await expect.poll(() => scaleOf(tile)).toBe("none");
    await expect.poll(async () => (await shade(tile)).opacity).toBe("0");
    // The pointer left before it lifted: nothing was switched.
    await expect(tile).toHaveAccessibleName("Floor Lamp: Off");
  });

  test("a button goes in further than a tile, and a nav entry without a shade", async ({ page }) => {
    await page.goto("/lights");
    await splashGone(page);
    const allOff = page.getByRole("button", { name: "Turn off all lights" });
    await expect(allOff).toBeVisible();
    await pressOn(page, allOff);
    await expect.poll(() => scaleOf(allOff)).toBe("0.93");
    await expect.poll(() => shade(allOff)).toEqual({ drawn: true, opacity: "1" });
    await liftAway(page);
    await expect.poll(() => scaleOf(allOff)).toBe("none");

    const nav = page.locator("[data-nav] [role=tab]:visible", { hasText: "Climate" });
    await pressOn(page, nav);
    expect(await pressing(nav)).toBe(true);
    await expect.poll(() => scaleOf(nav)).toBe("0.93");
    // An icon and a word, with no face to shade.
    expect((await shade(nav)).drawn).toBe(false);
    await liftAway(page);
    await expect.poll(() => pressing(nav)).toBe(false);
    await expect(page).toHaveURL(/\/lights$/);
  });

  test("a button inside a card that is one button is pressed alone", async ({ page }) => {
    await page.goto("/home");
    await splashGone(page);
    const tile = page.getByRole("button", { name: /^1st Floor:/ });
    await expect(tile).toBeVisible();
    await pressOn(page, tile);
    await expect.poll(() => scaleOf(tile)).toBe("0.96");
    expect(await page.locator("[data-pressing]").count()).toBe(1);
    await liftAway(page);
  });

  test("the shade of everything that has one lies over that thing itself, on every page", async ({ page }) => {
    // The shade is an ::after laid over its nearest positioned ancestor: on a
    // static button it would darken someone else's box while that button is
    // held (the sheets' close buttons were static until 0.170.0).
    // Board's collapsible header stretches its tap target on purpose, with a
    // pseudo-element of its own, and says so (`data-stretched`).
    const strays = () =>
      page.evaluate(() =>
        [...document.querySelectorAll("button:not([data-stretched]), [role=button], [role=tab]")]
          .filter((el) => {
            const after = getComputedStyle(el, "::after");
            return after.content !== "none" && after.position === "absolute" && getComputedStyle(el).position === "static";
          })
          .map((el) => `${el.tagName.toLowerCase()}[${el.getAttribute("aria-label") ?? (el.textContent ?? "").trim().slice(0, 24)}]`),
      );
    for (const path of PAGES) {
      await page.goto(path);
      await splashGone(page);
      await page.waitForTimeout(400);
      expect(await strays(), path).toEqual([]);
    }

    // And in a sheet, whose close button sits in the title's row.
    await page.goto("/climate");
    await page.getByRole("button", { name: /^1st Floor:/ }).click();
    const close = page.getByRole("dialog").getByRole("button", { name: "Close" });
    await expect(close).toBeVisible();
    expect(await strays()).toEqual([]);
    await pressOn(page, close);
    await expect.poll(() => shade(close)).toEqual({ drawn: true, opacity: "1" });
    // The shade is the button's own size.
    expect(
      await close.evaluate((el) => {
        const after = getComputedStyle(el, "::after");
        return [parseFloat(after.width), parseFloat(after.height)].map(Math.round);
      }),
    ).toEqual(await close.evaluate((el) => [el.clientWidth, el.clientHeight]));
    await liftAway(page);
  });
});

test.describe("a tap's tick", () => {
  test.beforeEach(async ({ request, page }) => {
    await resetStub(request);
    // A motor that keeps count.
    await page.addInitScript(() => {
      const ticks: number[] = [];
      Object.assign(window, { __ticks: ticks });
      Object.defineProperty(Navigator.prototype, "vibrate", {
        configurable: true,
        value: (ms: number) => (ticks.push(ms), true),
      });
    });
  });

  const ticks = (page: Page) => page.evaluate(() => (window as unknown as { __ticks: number[] }).__ticks);

  test("one tap, one short tick — on a tile, a button, a nav entry — and none for a tap on nothing", async ({ page }) => {
    await page.goto("/lights");
    await splashGone(page);
    const tile = lightTile(page, "Floor Lamp");
    await tile.click();
    await expect(tile).toHaveAccessibleName("Floor Lamp: 100%");
    expect(await ticks(page)).toEqual([15]);

    await page.getByRole("heading", { name: "Lights", exact: true }).first().click();
    expect(await ticks(page)).toHaveLength(1);

    await page.getByRole("button", { name: "Turn off all lights" }).click();
    await expect(tile).toHaveAccessibleName("Floor Lamp: Off");
    expect(await ticks(page)).toHaveLength(2);

    await page.locator("[data-nav] [role=tab]:visible", { hasText: "Climate" }).click();
    await expect(page).toHaveURL(/\/climate$/);
    expect(await ticks(page)).toHaveLength(3);
  });

  test("a hold's release isn't a tap: the sheet opens and nothing ticks", async ({ page }) => {
    await page.goto("/lights");
    await splashGone(page);
    const tile = lightTile(page, "Floor Lamp");
    await pressOn(page, tile);
    await page.waitForTimeout(800);
    await page.mouse.up();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await ticks(page)).toEqual([]);
    await expect(page.locator('[data-light-entry][aria-label="Floor Lamp: Off"]')).toHaveCount(1);
  });
});

test.describe("a touch", () => {
  test.skip(({ isMobile }) => !isMobile, "touch is the phone project's");

  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  // When each press was shown, measured in the page: the round trips of a
  // test's own calls are longer than the wait being measured.
  async function timePresses(page: Page) {
    await page.addInitScript(() => {
      const log: { down: number; shown: number | null }[] = [];
      Object.assign(window, { __presses: log });
      window.addEventListener("pointerdown", () => log.push({ down: performance.now(), shown: null }), true);
      new MutationObserver((records) => {
        const last = log.at(-1);
        for (const record of records) {
          if (last && last.shown == null && (record.target as Element).hasAttribute("data-pressing")) last.shown = performance.now();
        }
      }).observe(document, { attributes: true, attributeFilter: ["data-pressing"], subtree: true });
    });
  }
  const presses = (page: Page) =>
    page.evaluate(() => (window as unknown as { __presses: { down: number; shown: number | null }[] }).__presses);

  async function touch(page: Page) {
    const cdp = await page.context().newCDPSession(page);
    return (type: "touchStart" | "touchMove" | "touchEnd", x?: number, y?: number) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: x == null ? [] : [{ x, y: y! }] });
  }

  test("on a page that scrolls, waits a moment to be told from a scroll; where nothing scrolls, shows at contact", async ({ page }) => {
    await timePresses(page);
    await page.goto("/lights");
    await splashGone(page);
    const send = await touch(page);

    const tile = lightTile(page, "Floor Lamp");
    await tile.scrollIntoViewIfNeeded();
    const box = (await tile.boundingBox())!;
    await send("touchStart", box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(() => pressing(tile)).toBe(true);
    await send("touchEnd");
    await expect.poll(() => pressing(tile)).toBe(false);
    await expect(tile).toHaveAccessibleName("Floor Lamp: 100%");

    // The bottom bar is over the page, not in it.
    const nav = page.locator('[data-nav="bar"] [role=tab]', { hasText: "Lights" });
    const at = (await nav.boundingBox())!;
    await send("touchStart", at.x + at.width / 2, at.y + at.height / 2);
    await expect.poll(() => pressing(nav)).toBe(true);
    await send("touchEnd");

    const [onPage, onBar] = await presses(page);
    expect(onPage.shown! - onPage.down).toBeGreaterThanOrEqual(65);
    expect(onBar.shown! - onBar.down).toBeLessThan(40);
  });

  test("a swipe that starts on a tile scrolls the page, and switches and holds nothing", async ({ page }) => {
    await page.goto("/lights");
    await splashGone(page);
    const send = await touch(page);
    const tile = lightTile(page, "Floor Lamp");
    await tile.scrollIntoViewIfNeeded();
    const box = (await tile.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const scroller = () => page.evaluate(() => Math.max(...[...document.querySelectorAll("*")].map((el) => el.scrollTop)));
    const before = await scroller();
    await send("touchStart", x, y);
    for (let dy = 20; dy <= 200; dy += 20) await send("touchMove", x, y - dy);
    await send("touchEnd");
    await expect.poll(scroller).toBeGreaterThan(before);
    await expect.poll(() => page.locator("[data-pressing]").count()).toBe(0);
    await expect(tile).toHaveAccessibleName("Floor Lamp: Off");
  });
});

test.describe("on an iPhone", () => {
  // Safari gives a page no call for the Taptic Engine: what ticks is a real
  // switch under a real tap, which the ios-haptics library lays over a
  // button (0.170.1; Frame14's own code for it in 0.170.0). The engine here
  // is still Chromium, which ticks nothing — what is held is that every
  // button wears the label, and that a tap is still the button's one click
  // and toggles the label's switch as a trusted one.
  test.skip(({ isMobile }) => !isMobile, "once is enough");

  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  async function iphone(browser: Browser) {
    // An iPhone's size, touch and name; the engine stays this project's.
    const { userAgent, viewport, deviceScaleFactor, isMobile, hasTouch } = devices["iPhone 15"];
    const context = await browser.newContext({ userAgent, viewport, deviceScaleFactor, isMobile, hasTouch, baseURL: APP_URL });
    await context.addInitScript(() => {
      // Safari has no Vibration API.
      Reflect.deleteProperty(Navigator.prototype, "vibrate");
    });
    const page = await context.newPage();
    return { context, page };
  }

  /** How often a label's hidden switch was toggled, and whether by trusted events. */
  async function watchSwitch(page: Page) {
    await page.evaluate(() => {
      const toggles: boolean[] = [];
      Object.assign(window, { __toggles: toggles });
      document.addEventListener("change", (e) => {
        if ((e.target as Element).matches("label[data-haptic-trigger] > input[switch]")) toggles.push(e.isTrusted);
      });
    });
    return () => page.evaluate(() => (window as unknown as { __toggles: boolean[] }).__toggles);
  }

  test("every button wears a label with a hidden switch, and a tap is its click and the switch's", async ({ browser }) => {
    const { context, page } = await iphone(browser);
    try {
      await page.goto("/lights");
      await splashGone(page);
      const tile = lightTile(page, "Floor Lamp");
      await expect(tile).toBeVisible();
      await expect(tile.locator("label[data-haptic-trigger] > input[type=checkbox][switch]")).toHaveCount(1);
      // Each button, one label, laid over the button and nothing else.
      const buttons = await page.locator("button").evaluateAll((els) =>
        els.map((el) => {
          const labels = el.querySelectorAll(":scope > label[data-haptic-trigger]");
          const label = labels[0] as HTMLElement | undefined;
          const a = el.getBoundingClientRect();
          const b = label?.getBoundingClientRect();
          return {
            name: el.getAttribute("aria-label") ?? (el.textContent ?? "").trim().slice(0, 20),
            labels: labels.length,
            stretched: el.hasAttribute("data-stretched"),
            // Within a pixel of the button's own box (its border aside).
            fits: !!b && Math.abs(a.width - b.width) <= 2 && Math.abs(a.height - b.height) <= 2,
          };
        }),
      );
      expect(buttons.length).toBeGreaterThan(10);
      expect(buttons.filter((b) => b.labels !== 1)).toEqual([]);
      expect(buttons.filter((b) => !b.stretched && !b.fits)).toEqual([]);

      const toggles = await watchSwitch(page);
      await tile.tap();
      await expect(tile).toHaveAccessibleName("Floor Lamp: 100%");
      // Once: the light went on and stayed on.
      await page.waitForTimeout(400);
      await expect(tile).toHaveAccessibleName("Floor Lamp: 100%");
      expect(await toggles()).toEqual([true]);

      // A Chakra button and a nav entry the same.
      await page.getByRole("button", { name: "Turn off all lights" }).tap();
      await expect(tile).toHaveAccessibleName("Floor Lamp: Off");
      await page.locator('[data-nav="bar"] [role=tab]', { hasText: "Climate" }).tap();
      await expect(page).toHaveURL(/\/climate$/);
      expect(await toggles()).toEqual([true, true, true]);
    } finally {
      await context.close();
    }
  });

  test("a collapsible card's header still folds it from anywhere along it, and its button is still its own", async ({ browser }) => {
    const { context, page } = await iphone(browser);
    try {
      await page.goto("/lights");
      await splashGone(page);
      const card = page
        .locator(".chakra-card__root")
        .filter({ has: page.getByRole("heading", { name: "Living Room", exact: true }) })
        .first();
      const tile = lightTile(page, "Floor Lamp");
      await expect(tile).toBeVisible();
      const toggles = await watchSwitch(page);

      // The room's own All off, in the header: its tap, not the header's.
      await tile.tap();
      await expect(tile).toHaveAccessibleName("Floor Lamp: 100%");
      await card.getByRole("button", { name: "Turn off Living Room" }).tap();
      await expect(tile).toHaveAccessibleName("Floor Lamp: Off");
      await expect(tile).toBeVisible();

      // The chevron at the header's far end: the header's tap.
      const header = card.locator(".chakra-card__header");
      const box = (await header.boundingBox())!;
      await page.touchscreen.tap(box.x + box.width - 14, box.y + box.height / 2);
      await expect(tile).toBeHidden();
      await page.touchscreen.tap(box.x + box.width - 14, box.y + box.height / 2);
      await expect(tile).toBeVisible();
      expect(await toggles()).toEqual([true, true, true, true]);
    } finally {
      await context.close();
    }
  });

  test("a switch is a real one, which ticks by itself", async ({ browser }) => {
    const { context, page } = await iphone(browser);
    try {
      await page.goto("/control/device");
      await splashGone(page);
      const inputs = page.locator('label[data-scope="switch"] input[type="checkbox"]');
      await expect(inputs.first()).toBeAttached();
      expect(await inputs.evaluateAll((els) => els.every((el) => el.hasAttribute("switch")))).toBe(true);
    } finally {
      await context.close();
    }
  });
});
