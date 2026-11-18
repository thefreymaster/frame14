import { expect, test, type Page } from "@playwright/test";
import { quietHouse, resetStub, splashGone, stub } from "./helpers";
import { APP_URL } from "./ports";

// The header's buttons — the running appliances, the connection, the mic, a
// remote's button to refresh the frames (0.175.0), the switch between bright
// and dark (0.176.0) and the power button — sit `xs` apart (0.25rem), one
// group, since 0.163.0, and are all the mic's size: the appliance and
// connection icons are IconButtons too, without a fill. They were 0.75rem
// apart before, and the icons only as wide as their glyphs. Since 0.176.0
// the group is in the header's middle, not at its right end.
async function buttonGaps(page: Page) {
  return page.locator("[data-header-buttons]").evaluate((group) => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const boxes = [...group.querySelectorAll("button")].map((b) => b.getBoundingClientRect());
    const inRem = (px: number) => Math.round((px / rem) * 100) / 100;
    return {
      count: boxes.length,
      gaps: boxes.slice(1).map((b, i) => inRem(b.left - boxes[i].right)),
      sizes: [...new Set(boxes.map((b) => `${inRem(b.width)}x${inRem(b.height)}`))],
    };
  });
}

test.beforeEach(async ({ request }) => {
  await resetStub(request);
});

test("the header's buttons are one size, xs apart: the appliances, the connection, the mic, a remote's refresh, the theme's switch and the power button", async ({ page, request, isMobile }) => {
  // The stub's printer prints and its vacuum cleans; the dishwasher joins them.
  await stub(request, "/_stub/state", { entity_id: "binary_sensor.dishwasher_running", state: "on" });
  await page.goto("/home");
  await splashGone(page);
  await expect(page.getByRole("button", { name: "Dishwasher running" })).toBeVisible();
  await expect(page.getByRole("button", { name: "3D printer running" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ask the house" })).toBeVisible();
  const { count } = await buttonGaps(page);
  expect(count).toBeGreaterThanOrEqual(5);
  await expect.poll(() => buttonGaps(page)).toEqual({ count, gaps: Array(count - 1).fill(0.25), sizes: ["2x2"] });
  // Only the mic, the theme's switch and the power button are filled — and,
  // after the mic on a remote (the phone project's device), the button that
  // refreshes the frames.
  const fills = await page.locator("[data-header-buttons] button").evaluateAll((buttons) =>
    buttons.map((b) => getComputedStyle(b).backgroundColor !== "rgba(0, 0, 0, 0)"),
  );
  const faced = isMobile ? 4 : 3;
  expect(fills).toEqual([...Array(count - faced).fill(false), ...Array(faced).fill(true)]);
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
  page.locator("[data-header-buttons]").evaluate((group) => {
    const row = group.closest<HTMLElement>("[data-header]")!;
    const name = row.querySelector("[data-header-name]")!;
    const word = name.querySelector("[data-header-word]")!.getBoundingClientRect();
    const icon = name.querySelector("img")!.getBoundingClientRect();
    const box = group.getBoundingClientRect();
    const shown = [...group.querySelectorAll("button")].filter((b) => b.getBoundingClientRect().width > 0);
    const style = getComputedStyle(row);
    const [left, right] = [parseFloat(style.paddingLeft), innerWidth - parseFloat(style.paddingRight)];
    return {
      fit: row.dataset.headerFit,
      // The buttons on the screen, and whether the theme's switch is one of them.
      buttons: shown.length,
      toggle: shown.some((b) => b.hasAttribute("data-header-theme")),
      // Every one inside the header's own gutters.
      inside: shown.every((b) => b.getBoundingClientRect().left >= left - 0.5 && b.getBoundingClientRect().right <= right + 0.5),
      // How far the group's middle is from the header's, to the right of it.
      offCentre: Math.round(box.left + box.width / 2 - innerWidth / 2) || 0,
      // From the name's end (or the icon's, with no name) to the first button.
      gap: Math.round(box.left - Math.max(word.right, icon.right)),
      // Whole or gone, never a cut "Fra".
      name: word.width > 0,
      nameClear: word.width === 0 || word.right <= box.left,
      icon: icon.width > 0 && icon.left >= left - 0.5,
      iconTop: Math.round(icon.top * 10) / 10,
      scrolls: document.documentElement.scrollWidth > innerWidth,
    };
  });

// 0.176.0, the user: "Move all the actions buttons in the header to be in
// the center of the header". At its right end until then.
test("the header's buttons are in the middle of the header, the name at its left and a desktop's clock at its right", async ({ page, request, isMobile }) => {
  test.skip(isMobile, "a phone's are as near the middle as its name lets them: the next test");
  await page.goto("/home");
  await splashGone(page);
  await expect(page.getByRole("button", { name: "Ask the house" })).toBeVisible();
  // A desktop: the name, the buttons, the clock — the buttons' middle the header's.
  await expect.poll(() => header(page)).toMatchObject({ fit: "all", offCentre: 0, name: true, toggle: true, inside: true, scrolls: false });
  const row = page.locator("[data-header]");
  const boxes = await row.evaluate((el) =>
    [...el.children].slice(0, 3).map((child) => {
      const r = child.getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
    }),
  );
  const [name, group, clock] = boxes;
  expect(name.right).toBeLessThan(group.left);
  expect(group.right).toBeLessThan(clock.left);
  expect(clock.width).toBeGreaterThan(0);
  // More buttons, or fewer, and it is still the middle: a quiet house…
  const busy = (await header(page)).buttons;
  await quietHouse(request);
  await expect.poll(async () => (await header(page)).buttons).toBeLessThan(busy);
  await expect.poll(() => header(page)).toMatchObject({ offCentre: 0 });

  // …and the frame, which has no clock in its header: nothing at the right,
  // and the buttons in the middle all the same.
  await page.setViewportSize({ width: 1600, height: 2400 });
  await expect.poll(() => header(page)).toMatchObject({ fit: "all", offCentre: 0, name: true });
});

// With the refresh button a remote's group is one button wider, and on a
// phone a washer, a dryer, a dishwasher, a print and a vacuum at once ran the
// power button off the screen's edge. The name gives way instead (0.175.0) —
// and, with the theme's switch one more button (0.176.0), on the busiest day
// that goes too. In the middle of the header where the name leaves it room.
test("on a phone's width the buttons sit as near the header's middle as the name lets them; on a busy day the name gives way to them, then the theme's switch, and both are back on a quiet one", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("device-mode", "controller"));
  // An ordinary day: the connection, the mic, the refresh, the theme's
  // switch and the power button, the name beside the icon.
  await quietHouse(request);
  await page.goto("/home");
  await splashGone(page);
  await expect(page.getByRole("button", { name: "Refresh the frames" })).toBeVisible();
  await expect.poll(() => header(page)).toMatchObject({ fit: "all", buttons: 5, toggle: true, name: true, nameClear: true, icon: true, inside: true, scrolls: false });
  const quiet = await header(page);
  // In the middle, or — beside a name wider than half of what they leave —
  // hard against the name's own gap, right of the middle by no more than that.
  expect(quiet.offCentre).toBeGreaterThanOrEqual(0);
  if (quiet.offCentre > 0) expect(quiet.gap).toBe(12);
  else expect(quiet.gap).toBeGreaterThanOrEqual(12);

  // The stub's usual day — a print and a vacuum — and the dishwasher: eight
  // buttons. No room for the name beside them: the icon alone, and with it
  // gone the buttons are in the header's middle.
  await resetStub(request);
  await stub(request, "/_stub/state", { entity_id: "binary_sensor.dishwasher_running", state: "on" });
  await expect(page.getByRole("button", { name: "Dishwasher running" })).toBeVisible();
  await expect.poll(() => header(page)).toMatchObject({ fit: "icon", buttons: 8, toggle: true, name: false, icon: true, iconTop: quiet.iconTop, offCentre: 0, inside: true, scrolls: false });

  // The washer and the dryer too: five appliances. The theme's switch goes
  // as well — Settings has the theme — and every other button is on the screen.
  for (const entity_id of ["binary_sensor.cloths_washer_clothes_washer_running", "binary_sensor.drier_dryer_running"]) {
    await stub(request, "/_stub/state", { entity_id, state: "on" });
  }
  for (const name of ["Washer running", "Dryer running", "Dishwasher running", "3D printer running", "Refresh the frames"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
  // Five appliances, the connection, the mic, the refresh and the power button.
  await expect.poll(() => header(page)).toMatchObject({ fit: "tight", buttons: 9, toggle: false, name: false, icon: true, iconTop: quiet.iconTop, inside: true, scrolls: false });
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
