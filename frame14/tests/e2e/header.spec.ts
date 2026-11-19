import { expect, test, type Page } from "@playwright/test";
import { cardPaint, quietHouse, resetStub, splashGone, stub } from "./helpers";
import { APP_URL } from "./ports";

// The header's buttons — the mic, a remote's button to refresh the frames
// (0.175.0), the switch between bright and dark (0.176.0) and the power
// button — and its status icons — the running appliances and the connection
// — sit `xs` apart (0.25rem) since 0.163.0, and are all the mic's size: the
// appliance and connection icons are IconButtons too, without a fill. They
// were 0.75rem apart before, and the icons only as wide as their glyphs.
// Since 0.176.0 the buttons are in the header's middle, and since 0.176.1
// they alone are: the status icons are a group of their own at its right
// end — and on a phone all of it is at the right end, one run of icons.
/** The header's buttons that `selector` finds, left to right. */
async function buttonGaps(page: Page, selector: string) {
  return page.locator("[data-header]").evaluate((row, selector) => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const boxes = [...row.querySelectorAll(selector)]
      .map((b) => b.getBoundingClientRect())
      .sort((a, b) => a.left - b.left);
    const inRem = (px: number) => Math.round((px / rem) * 100) / 100;
    return {
      count: boxes.length,
      gaps: boxes.slice(1).map((b, i) => inRem(b.left - boxes[i].right)),
      sizes: [...new Set(boxes.map((b) => `${inRem(b.width)}x${inRem(b.height)}`))],
    };
  }, selector);
}

const STATUS = "[data-header-status] button";
const BUTTONS = "[data-header-buttons] button";

/** Whether each of the header's icons that `selector` finds has a fill. */
const filled = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((buttons) =>
    buttons.map((b) => getComputedStyle(b).backgroundColor !== "rgba(0, 0, 0, 0)"),
  );

test.beforeEach(async ({ request }) => {
  await resetStub(request);
});

test("the header's status icons and its buttons are each one size, xs apart: the appliances and the connection; the mic, a remote's refresh, the theme's switch and the power button", async ({ page, request, isMobile }) => {
  // The stub's printer prints and its vacuum cleans; the dishwasher joins them.
  await stub(request, "/_stub/state", { entity_id: "binary_sensor.dishwasher_running", state: "on" });
  await page.goto("/home");
  await splashGone(page);
  await expect(page.getByRole("button", { name: "Dishwasher running" })).toBeVisible();
  await expect(page.getByRole("button", { name: "3D printer running" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ask the house" })).toBeVisible();
  // The appliances and the connection, in a group of their own.
  const { count } = await buttonGaps(page, STATUS);
  expect(count).toBeGreaterThanOrEqual(3);
  await expect.poll(() => buttonGaps(page, STATUS)).toEqual({ count, gaps: Array(count - 1).fill(0.25), sizes: ["2x2"] });
  await expect(page.locator("[data-header-status]").getByRole("button", { name: "Dishwasher running" })).toBeVisible();
  await expect(page.locator("[data-header-status]").getByRole("button", { name: "Connected" })).toBeVisible();
  // The mic, the theme's switch and the power button — and, after the mic on
  // a remote (the phone project's device), the button that refreshes the
  // frames.
  const faced = isMobile ? 4 : 3;
  await expect.poll(() => buttonGaps(page, BUTTONS)).toEqual({ count: faced, gaps: Array(faced - 1).fill(0.25), sizes: ["2x2"] });
  // Only the buttons are filled.
  expect(await filled(page, STATUS)).toEqual(Array(count).fill(false));
  expect(await filled(page, BUTTONS)).toEqual(Array(faced).fill(true));
  // On a phone the two are one run, the status icons first, xs apart; on a
  // desktop the buttons are in the middle and the status icons well apart.
  const all = await buttonGaps(page, `${STATUS}, ${BUTTONS}`);
  if (isMobile) expect(all.gaps).toEqual(Array(count + faced - 1).fill(0.25));
  else expect(all.gaps[faced - 1]).toBeGreaterThan(2);
});

// 0.175.0, the user: "If you're running in the remote mode, there should be a
// icon button in the header to refresh frames". The Display card's "Refresh
// displays", from wherever the remote is.
test("a remote's header has a button that refreshes the frames: a frame's page loads afresh, the remote's own stays", async ({ page, browser }) => {
  type Marked = { beforeRefresh?: boolean };
  const mark = (p: Page) => p.evaluate(() => ((window as unknown as Marked).beforeRefresh = true));
  const marked = (p: Page) => p.evaluate(() => (window as unknown as Marked).beforeRefresh === true);

  const frames = await browser.newContext({ baseURL: APP_URL });
  try {
    const frame = await frames.newPage();
    await frame.addInitScript(() => localStorage.setItem("device-mode", "frame"));
    await frame.goto("/lights");
    await splashGone(frame);
    // On the socket, where the server's word arrives.
    await expect(frame.getByRole("button", { name: "Connected" })).toBeVisible();
    // A frame has no such button: its own reload is the connection menu's.
    await expect(frame.getByRole("button", { name: "Turn the screen off" })).toBeVisible();
    await expect(frame.getByRole("button", { name: "Refresh the frames" })).toHaveCount(0);
    await mark(frame);

    await page.addInitScript(() => localStorage.setItem("device-mode", "controller"));
    await page.goto("/home");
    await splashGone(page);
    // After the mic, before the theme's switch and the power button: the last four of the group.
    const labels = await page
      .locator("[data-header-buttons] button")
      .evaluateAll((buttons) => buttons.slice(-4).map((b) => b.getAttribute("aria-label")));
    expect(labels).toEqual(["Ask the house", "Refresh the frames", expect.stringMatching(/^Switch to (bright|dark) mode$/), "Turn the frame's screen off"]);
    await mark(page);

    await Promise.all([
      frame.waitForEvent("load"),
      page.getByRole("button", { name: "Refresh the frames" }).click(),
    ]);
    // The frame's page is a new one, on the page it was on.
    expect(await marked(frame)).toBe(false);
    await expect(frame).toHaveURL(/\/lights$/);
    // The remote says it went, and is the page it was.
    await expect(page.getByText("Refreshing the frames")).toBeVisible();
    await frame.waitForTimeout(500);
    expect(await marked(page)).toBe(true);
  } finally {
    await frames.close();
  }
});

/** The header as it is laid out: what shows, and where the buttons lie in it. */
const header = (page: Page) =>
  page.locator("[data-header]").evaluate((row) => {
    const name = row.querySelector("[data-header-name]")!;
    const word = name.querySelector("[data-header-word]")!.getBoundingClientRect();
    const icon = name.querySelector("img")!.getBoundingClientRect();
    const box = row.querySelector("[data-header-buttons]")!.getBoundingClientRect();
    const statusBox = row.querySelector("[data-header-status]")!.getBoundingClientRect();
    const shown = [...row.querySelectorAll("[data-header-status] button, [data-header-buttons] button")]
      .filter((b) => b.getBoundingClientRect().width > 0)
      .map((b) => ({ el: b, box: b.getBoundingClientRect() }));
    const first = Math.min(...shown.map((b) => b.box.left));
    const last = Math.max(...shown.map((b) => b.box.right));
    const style = getComputedStyle(row);
    const [left, right] = [parseFloat(style.paddingLeft), innerWidth - parseFloat(style.paddingRight)];
    return {
      fit: row.dataset.headerFit,
      // The icons on the screen, the status icons and the buttons, and
      // whether the theme's switch is one of them.
      buttons: shown.length,
      toggle: shown.some((b) => b.el.hasAttribute("data-header-theme")),
      // Every one inside the header's own gutters.
      inside: shown.every((b) => b.box.left >= left - 0.5 && b.box.right <= right + 0.5),
      // How far the buttons' middle is from the header's, to the right of it.
      offCentre: Math.round(box.left + box.width / 2 - innerWidth / 2) || 0,
      // From the last icon to the header's right gutter.
      toRight: Math.round(right - last) || 0,
      // The status icons before the buttons (a phone) or after them.
      statusFirst: statusBox.right <= box.left,
      // From the name's end (or the icon's, with no name) to the first icon.
      gap: Math.round(first - Math.max(word.right, icon.right)),
      // Whole or gone, never a cut "Fra".
      name: word.width > 0,
      nameClear: word.width === 0 || word.right <= first,
      icon: icon.width > 0 && icon.left >= left - 0.5,
      iconTop: Math.round(icon.top * 10) / 10,
      scrolls: document.documentElement.scrollWidth > innerWidth,
    };
  });

// 0.176.0, the user: "Move all the actions buttons in the header to be in
// the center of the header". At its right end until then — and still, on a
// phone (0.176.1): the next test. And only the buttons (0.176.1): "only the
// icon buttons should be centered not notifications like the WiFi
// dishwasher. Those should be right".
test("the header's buttons are in the middle of the header, the name at its left and the status icons and a desktop's clock at its right", async ({ page, request, isMobile }) => {
  test.skip(isMobile, "a phone's are at the header's right end: the next test");
  await page.goto("/home");
  await splashGone(page);
  await expect(page.getByRole("button", { name: "Ask the house" })).toBeVisible();
  await expect(page.getByRole("button", { name: "3D printer running" })).toBeVisible();
  // A desktop: the name, the buttons, the status icons, the clock — the
  // buttons' middle the header's.
  await expect.poll(() => header(page)).toMatchObject({ fit: "all", offCentre: 0, statusFirst: false, name: true, toggle: true, inside: true, scrolls: false });
  const boxes = await page.locator("[data-header]").evaluate((el) =>
    ["[data-header-name]", "[data-header-buttons]", "[data-header-status]", "[data-header-end] > :not([data-header-status])"].map((selector) => {
      const r = el.querySelector(selector)!.getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
    }),
  );
  const [name, group, status, clock] = boxes;
  expect(name.right).toBeLessThan(group.left);
  expect(group.right).toBeLessThan(status.left);
  expect(status.right).toBeLessThan(clock.left);
  expect(clock.width).toBeGreaterThan(0);
  // More status icons, or fewer, and the buttons are still in the middle: a
  // quiet house…
  const busy = (await header(page)).buttons;
  await quietHouse(request);
  await expect.poll(async () => (await header(page)).buttons).toBeLessThan(busy);
  await expect.poll(() => header(page)).toMatchObject({ offCentre: 0, statusFirst: false });

  // …and the frame, which has no clock in its header: the status icons at
  // its right end, and the buttons in the middle all the same.
  await page.setViewportSize({ width: 1600, height: 2400 });
  await expect.poll(() => header(page)).toMatchObject({ fit: "all", offCentre: 0, statusFirst: false, toRight: 0, name: true });
});

// With the refresh button a remote's group is one button wider, and on a
// phone a washer, a dryer, a dishwasher, a print and a vacuum at once ran the
// power button off the screen's edge. The name gives way instead (0.175.0) —
// and, with the theme's switch one more button (0.176.0), on the busiest day
// that goes too. The buttons are at the header's right end on a phone
// (0.176.1, the user: "Top nav on mobile should be right justified still"),
// though the frame's and a desktop's are in its middle.
test("on a phone's width the buttons are at the header's right end; on a busy day the name gives way to them, then the theme's switch, and both are back on a quiet one", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("device-mode", "controller"));
  // An ordinary day: the connection, the mic, the refresh, the theme's
  // switch and the power button, the name beside the icon.
  await quietHouse(request);
  await page.goto("/home");
  await splashGone(page);
  await expect(page.getByRole("button", { name: "Refresh the frames" })).toBeVisible();
  // The status icons and then the buttons against the right gutter, the
  // room between them and the name.
  await expect.poll(() => header(page)).toMatchObject({ fit: "all", buttons: 5, toggle: true, name: true, nameClear: true, icon: true, toRight: 0, statusFirst: true, inside: true, scrolls: false });
  const quiet = await header(page);
  expect(quiet.gap).toBeGreaterThan(12);

  // The stub's usual day — a print and a vacuum — and the dishwasher: eight
  // buttons. No room for the name beside them: the icon alone, the buttons
  // still at the right end.
  await resetStub(request);
  await stub(request, "/_stub/state", { entity_id: "binary_sensor.dishwasher_running", state: "on" });
  await expect(page.getByRole("button", { name: "Dishwasher running" })).toBeVisible();
  await expect.poll(() => header(page)).toMatchObject({ fit: "icon", buttons: 8, toggle: true, name: false, icon: true, iconTop: quiet.iconTop, toRight: 0, statusFirst: true, inside: true, scrolls: false });

  // The washer and the dryer too: five appliances. The theme's switch goes
  // as well — Settings has the theme — and every other button is on the screen.
  for (const entity_id of ["binary_sensor.cloths_washer_clothes_washer_running", "binary_sensor.drier_dryer_running"]) {
    await stub(request, "/_stub/state", { entity_id, state: "on" });
  }
  for (const name of ["Washer running", "Dryer running", "Dishwasher running", "3D printer running", "Refresh the frames"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
  // Five appliances, the connection, the mic, the refresh and the power button.
  await expect.poll(() => header(page)).toMatchObject({ fit: "tight", buttons: 9, toggle: false, name: false, icon: true, iconTop: quiet.iconTop, toRight: 0, statusFirst: true, inside: true, scrolls: false });
  await expect(page.getByRole("button", { name: /^Switch to (bright|dark) mode$/ })).toBeHidden();
  await expect(page.getByRole("button", { name: "Turn the frame's screen off" })).toBeVisible();

  // The house quiet again: all of it back, where it was.
  await resetStub(request);
  await quietHouse(request);
  await expect(page.getByRole("button", { name: "3D printer running" })).toHaveCount(0);
  await expect.poll(() => header(page)).toEqual(quiet);
});

// 0.176.0, the user: "Add a bright mode/dark mode toggle icon button to the
// header".
test.describe("the header's bright and dark switch", () => {
  const toggle = (page: Page) => page.locator("[data-header-buttons] [data-header-theme]");
  const mode = (page: Page) => page.locator("html").getAttribute("data-theme-mode");

  test("puts a remote's own theme in the other mode at a tap, and leaves the frames'", async ({ page, browser }) => {
    const frames = await browser.newContext({ baseURL: APP_URL });
    try {
      const frame = await frames.newPage();
      await frame.addInitScript(() => localStorage.setItem("device-mode", "frame"));
      await frame.goto("/lights");
      await splashGone(frame);
      await expect(frame.getByRole("button", { name: "Connected" })).toBeVisible();
      const framesMode = await mode(frame);

      await page.addInitScript(() => {
        localStorage.setItem("device-mode", "controller");
        if (!sessionStorage.getItem("set")) localStorage.setItem("local-theme-mode", "dark");
        sessionStorage.setItem("set", "1");
      });
      await page.goto("/home");
      await splashGone(page);
      await expect(page.locator("html")).toHaveAttribute("data-theme-mode", "dark");
      // Before the power button, after the refresh: the sun, for the bright it brings.
      await expect(toggle(page)).toHaveAccessibleName("Switch to bright mode");
      const painted = () => page.evaluate(() => getComputedStyle(document.querySelector("[data-header]")!).backgroundColor);
      const dark = await painted();
      const sun = await toggle(page).locator("svg").innerHTML();

      await toggle(page).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme-mode", "bright");
      await expect(page.locator("html")).toHaveClass(/\blight\b/);
      // The page's own colour, which the header wears: another by day.
      await expect.poll(painted).not.toBe(dark);
      // Now the moon, for the way back; the colours are as they were.
      await expect(toggle(page)).toHaveAccessibleName("Switch to dark mode");
      expect(await toggle(page).locator("svg").innerHTML()).not.toBe(sun);
      await expect(page.locator("html")).toHaveAttribute("data-palette", "gray");
      // Kept on the device: bright through a reload.
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("data-theme-mode", "bright");
      // The frames' theme is the frames': not a remote's switch to move.
      await frame.waitForTimeout(300);
      expect(await mode(frame)).toBe(framesMode);

      await toggle(page).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme-mode", "dark");
      await expect(toggle(page)).toHaveAccessibleName("Switch to bright mode");
    } finally {
      await frames.close();
    }
  });

  // 0.177.0, the user: "Add a small transition for when the app changes
  // from dark mode to light mode and vice versa". The browser's own view
  // transition (lib/themeTransition): a picture of the page as it was fading
  // into the page as it is. Read off the running transition, and off the
  // screen with it held at its middle.
  test("crossfades the page from one mode to the other, a quarter of a second; at once under reduced motion", async ({ page }) => {
    type Fade = { before?: string; under?: string; fades: string[]; durations: number[] };
    type Watched = { fades: Fade[]; holdAtHalf: boolean; held?: () => void };
    await page.addInitScript(() => {
      localStorage.setItem("device-mode", "controller");
      localStorage.setItem("local-theme-mode", "dark");
      const watched: Watched = { fades: [], holdAtHalf: false };
      (window as unknown as { watched: Watched }).watched = watched;
      const real = document.startViewTransition?.bind(document);
      if (!real) return;
      document.startViewTransition = ((update: ViewTransitionUpdateCallback) => {
        const before = document.documentElement.dataset.themeMode;
        const transition = real(update);
        void transition.ready.then(() => {
          const running = document.getAnimations().filter((a) => (a.effect as KeyframeEffect).pseudoElement?.startsWith("::view-transition"));
          const effect = (a: Animation) => a.effect as KeyframeEffect;
          watched.fades.push({
            before,
            // What is under the pictures while they fade: the mode it turned to.
            under: document.documentElement.dataset.themeMode,
            fades: running.filter((a) => effect(a).getKeyframes().some((k) => "opacity" in k)).map((a) => effect(a).pseudoElement!).sort(),
            durations: [...new Set(running.map((a) => Number(effect(a).getComputedTiming().duration)))],
          });
          if (!watched.holdAtHalf) return;
          for (const a of running) {
            a.pause();
            a.currentTime = Number(effect(a).getComputedTiming().duration) / 2;
          }
          watched.held = () => running.forEach((a) => a.play());
        });
        return transition;
      }) as typeof document.startViewTransition;
    });
    const watched = () => page.evaluate(() => (window as unknown as { watched: Watched }).watched.fades);
    await page.goto("/home");
    await splashGone(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme-mode", "dark");
    await expect(page.locator(".chakra-card__root").first()).toBeVisible();
    const dark = await cardPaint(page);

    // To bright, held at the middle of the fade.
    await page.evaluate(() => ((window as unknown as { watched: Watched }).watched.holdAtHalf = true));
    await toggle(page).click();
    await expect.poll(watched).toHaveLength(1);
    const [fade] = await watched();
    expect(fade).toEqual({
      before: "dark",
      under: "bright",
      // The page as it was fading out and as it is fading in…
      fades: ["::view-transition-new(root)", "::view-transition-old(root)"],
      // …over a quarter of a second: a small transition.
      durations: [250],
    });
    // Half way: on the screen a card is neither the dark one nor the bright one.
    const half = await cardPaint(page);
    await page.evaluate(() => (window as unknown as { watched: Watched }).watched.held?.());
    await expect.poll(async () => Math.min(...(await cardPaint(page)))).toBeGreaterThan(200);
    const bright = await cardPaint(page);
    for (const channel of [0, 1, 2]) {
      expect(half[channel]).toBeGreaterThan(dark[channel] + 20);
      expect(half[channel]).toBeLessThan(bright[channel] - 20);
    }

    // Under reduced motion: no transition, the other mode at once.
    await page.evaluate(() => ((window as unknown as { watched: Watched }).watched.holdAtHalf = false));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await toggle(page).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme-mode", "dark");
    await page.waitForTimeout(300);
    expect(await watched()).toHaveLength(1);
  });

  test("puts every frame in the other mode from a frame's tap", async ({ page, browser }) => {
    const others = await browser.newContext({ baseURL: APP_URL });
    try {
      const other = await others.newPage();
      for (const frame of [page, other]) {
        await frame.addInitScript(() => localStorage.setItem("device-mode", "frame"));
        await frame.goto("/lights");
        await splashGone(frame);
        await expect(frame.getByRole("button", { name: "Connected" })).toBeVisible();
        // The suite's frames are Dark, as the add-on has kept them.
        await expect(frame.locator("html")).toHaveAttribute("data-theme-mode", "dark");
      }
      try {
        await toggle(page).click();
        await expect(page.locator("html")).toHaveAttribute("data-theme-mode", "bright");
        // Through the add-on: the other frame follows, and its switch with it.
        await expect(other.locator("html")).toHaveAttribute("data-theme-mode", "bright");
        await expect(toggle(other)).toHaveAccessibleName("Switch to dark mode");
        // And a frame opened afterwards starts there: the add-on keeps it.
        await other.reload();
        await expect(other.locator("html")).toHaveAttribute("data-theme-mode", "bright");
      } finally {
        // The add-on keeps the theme for every later test's pages: back to Dark.
        if ((await mode(page)) !== "dark") await toggle(page).click();
        await expect(other.locator("html")).toHaveAttribute("data-theme-mode", "dark");
      }
    } finally {
      await others.close();
    }
  });
});

test("the connection menu offers Reload while connected, and a tap reloads the page", async ({ page }) => {
  await page.goto("/home");
  await splashGone(page);
  await page.getByRole("button", { name: "Connected" }).click();
  const reload = page.getByRole("button", { name: "Reload" });
  await expect(reload).toBeVisible();
  await page.evaluate(() => ((window as unknown as { beforeReload: boolean }).beforeReload = true));
  await Promise.all([page.waitForEvent("load"), reload.click()]);
  expect(await page.evaluate(() => (window as unknown as { beforeReload?: boolean }).beforeReload)).toBeUndefined();
});

test.describe("the header's tooltips", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "a tooltip is a pointer's: a touch only taps");
  });

  test("the mic and a frame's power button say what a tap does", async ({ page }) => {
    await page.goto("/home");
    await splashGone(page);
    await page.getByRole("button", { name: "Ask the house" }).hover();
    await expect(page.getByRole("tooltip")).toHaveText("Ask the house");
    await page.getByRole("button", { name: "Turn the screen off" }).hover();
    await expect(page.getByRole("tooltip").filter({ hasText: "Turn the screen off" })).toBeVisible();
  });

  test("the theme's switch says which mode a tap brings", async ({ page }) => {
    await page.goto("/home");
    await splashGone(page);
    await page.locator("[data-header-buttons] [data-header-theme]").hover();
    // The suite's frames are Dark.
    await expect(page.getByRole("tooltip")).toHaveText("Switch to bright mode");
  });

  test("a remote's power button says it switches the frame's screen, and its refresh that it refreshes the frames", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("device-mode", "controller"));
    await page.goto("/home");
    await splashGone(page);
    await page.getByRole("button", { name: "Turn the frame's screen off" }).hover();
    await expect(page.getByRole("tooltip")).toHaveText("Turn the frame's screen off");
    await page.getByRole("button", { name: "Refresh the frames" }).hover();
    await expect(page.getByRole("tooltip").filter({ hasText: "Refresh the frames" })).toBeVisible();
  });
});
