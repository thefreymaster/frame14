import { expect, test } from "@playwright/test";
import { resetStub, splashGone, stub } from "./helpers";
import { APP_URL } from "./ports";

test.describe("the Settings page", () => {
  test.describe("with a newer version in the store", () => {
    test.afterEach(async ({ request }) => {
      await resetStub(request);
    });

    test("the Software card lists the version's changes, and an install's progress", async ({ page, request }) => {
      const { version } = await (await request.get("/api")).json();
      const attributes = { title: "Frame14", installed_version: version, latest_version: "9.9.9", release_url: "https://example.test" };
      await stub(request, "/_stub/state", { entity_id: "update.frame14_update", state: "on", attributes });
      await page.goto("/control");
      await page.getByRole("tab", { name: "Device" }).click();
      await expect(page.getByText("Update available")).toBeVisible();
      await expect(page.getByText("Frame14 9.9.9 is ready to download.")).toBeVisible();
      // The version's section of the CHANGELOG, from Home Assistant's release
      // notes (0.136) — the stub's, for the store's version only — in the
      // install prompt, not the card (the user's call).
      const notes = page.getByRole("list", { name: "What's new in 9.9.9" });
      await expect(notes).toHaveCount(0);
      await page.getByRole("button", { name: "Install 9.9.9" }).click();
      const prompt = page.getByRole("alertdialog");
      await expect(prompt.getByText("Install Frame14 9.9.9?")).toBeVisible();
      await expect(notes.getByText("a stub's new thing, for 9.9.9")).toBeVisible();
      await expect(notes.getByText("Added:")).toBeVisible();
      await expect(prompt.getByText("what the installed version changed")).toHaveCount(0);
      await prompt.getByRole("button", { name: "Not now" }).click();
      await expect(prompt).toBeHidden();
      // An install under way — from here or from Home Assistant's add-on page
      // — shows as such, live (0.136), with an indeterminate bar (0.138: the
      // Supervisor's percentage never came).
      await stub(request, "/_stub/state", {
        entity_id: "update.frame14_update",
        state: "on",
        attributes: { ...attributes, in_progress: true, update_percentage: 42 },
      });
      await expect(page.getByText(/Installing Frame14 9\.9\.9/)).toBeVisible();
      // The header's badge says so too, in the bar's blue (0.140.1).
      await expect(page.getByText("Installing", { exact: true })).toBeVisible();
      await expect(page.getByText("Update available")).toHaveCount(0);
      const bar = page.getByRole("progressbar", { name: "Install progress" });
      await expect(bar).toBeVisible();
      await expect(bar).not.toHaveAttribute("aria-valuenow", /./);
      await expect(page.getByText("42%")).toHaveCount(0);
      await expect(notes).toHaveCount(0);
    });
  });

  test("the Software card shows the installed version, up to date", async ({ page, request }) => {
    const { version } = await (await request.get("/api")).json();
    await page.goto("/control");
    // The sections are in tabs on every device (0.139); Software is under Device.
    await page.getByRole("tab", { name: "Device" }).click();
    await expect(page.getByRole("heading", { name: "Software" })).toBeVisible();
    await expect(page.getByText("Up to date")).toBeVisible();
    await expect(page.getByText(version, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Check for updates" })).toBeVisible();
    // The installed version links its release on GitHub, in a new tab
    // (0.149.1; a "v… on GitHub" button from 0.147.0), as the latest does.
    const release = page.getByRole("link", { name: `${version} release on GitHub` });
    await expect(release).toHaveText(version);
    await expect(release).toHaveAttribute("href", `https://github.com/thefreymaster/frame14/releases/tag/v${version}`);
    await expect(release).toHaveAttribute("target", "_blank");
    await expect(page.getByText(/on GitHub$/)).toHaveCount(0);
  });

  test("the Display card's theme and colors are every frame's, and not a remote's (0.146.0, 0.148.0)", async ({ page, browser, isMobile }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/control/display");
    const html = page.locator("html");
    const display = page.locator(".chakra-card__root", { has: page.getByRole("heading", { name: "Display" }) });
    const theme = display.getByRole("radiogroup", { name: "Theme" });
    const colors = display.getByRole("radiogroup", { name: "Colors" });
    const pageColour = () =>
      page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--chakra-colors-bg").trim());
    // A frame (the desktop project) and another: a fresh context, nothing
    // stored, made a frame — it has the project's device, a phone's in the
    // phone project, which would be a remote.
    const other = await browser.newContext({ baseURL: APP_URL });
    await other.addInitScript(() => localStorage.setItem("device-mode", "frame"));
    const frame = await other.newPage();
    try {
      await frame.goto("/home");
      await theme.getByText("Dark", { exact: true }).click();
      await colors.getByText("Slate", { exact: true }).click();
      await expect(frame.locator("html")).toHaveAttribute("data-palette", "slate");
      await expect(frame.locator("html")).toHaveAttribute("data-theme-mode", "dark");
      if (isMobile) {
        // A remote wears its own (0.148.0): the frames' choice leaves it be.
        await expect(display.getByText("This remote's own are under Device.")).toBeVisible();
        await expect(html).toHaveAttribute("data-palette", "gray");
      } else {
        // A frame wears it: Slate's page, and a card in dark mode.
        await expect(html).toHaveAttribute("data-palette", "slate");
        await expect.poll(pageColour).toBe("#0f141c");
        await expect(page.locator(".chakra-card__root").first()).toHaveCSS("background-color", "rgb(32, 39, 49)");
        // Device: its system's setting, followed as it changes.
        await theme.getByText("Device", { exact: true }).click();
        await expect(html).toHaveAttribute("data-theme-mode", "dark");
        await page.emulateMedia({ colorScheme: "light" });
        await expect(html).toHaveAttribute("data-theme-mode", "bright");
        await expect(html).not.toHaveClass(/\bdark\b/);
        await expect.poll(pageColour).toBe("#f2f6fa");
      }
      // A change reaches the frames live.
      await colors.getByText("Embossed", { exact: true }).click();
      await expect(frame.locator("html")).toHaveAttribute("data-palette", "embossed");
      // Sand, a palette until 0.169.0, is offered no more.
      await expect(colors.getByRole("radio")).toHaveCount(4);
      await expect(colors.getByText("Sand", { exact: true })).toHaveCount(0);
    } finally {
      await other.close();
      // The add-on keeps the theme for every later page: back to Dark, Gray.
      await theme.getByText("Dark", { exact: true }).click();
      await colors.getByText("Gray", { exact: true }).click();
      await expect(colors.getByRole("radio", { name: "Gray" })).toBeChecked();
    }
  });

  test("Outlines draws the cards and the nav by their outline alone: the page's colour, no shadow (0.166.0)", async ({ page, isMobile }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    // A frame's theme is the Display card's (the server's, put back below); a
    // remote's its own, under Device.
    await page.goto(isMobile ? "/control/device" : "/control/display");
    const html = page.locator("html");
    const board = page.locator(".chakra-card__root", {
      has: page.getByRole("heading", { name: isMobile ? "Appearance" : "Display", exact: true }),
    });
    const theme = board.getByRole("radiogroup", { name: "Theme" });
    const colors = board.getByRole("radiogroup", { name: "Colors" });
    // The nav this screen shows: a phone's portrait bar, a desktop's rail.
    const nav = page.locator(`[data-nav="${isMobile ? "bar" : "rail"}"]`);
    // The page as painted: Chakra puts `bg` on <html> (body is transparent).
    const pageColour = () => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    const drawn = (el: typeof board) =>
      el.evaluate((node) => {
        const s = getComputedStyle(node);
        return { shadow: s.boxShadow, edge: s.borderTopWidth, edgeColour: s.borderTopColor };
      });
    try {
      await theme.getByText("Dark", { exact: true }).click();
      await expect(html).toHaveAttribute("data-theme-mode", "dark");
      // Gray: a card of its own colour on the page, casting the navs' shadow.
      await expect(html).toHaveAttribute("data-palette", "gray");
      await expect(board).toHaveCSS("background-color", "rgb(28, 28, 30)");
      expect((await drawn(board)).shadow).not.toBe("none");
      expect((await drawn(nav)).shadow).not.toBe("none");

      await colors.getByText("Outlines", { exact: true }).click();
      await expect(html).toHaveAttribute("data-palette", "outlines");
      await expect(colors.getByRole("radio", { name: "Outlines" })).toBeChecked();
      // The page's own near-black, and only the 1px edge to say where it is.
      await expect.poll(pageColour).toBe("rgb(9, 9, 11)");
      await expect(board).toHaveCSS("background-color", "rgb(9, 9, 11)");
      await expect.poll(() => drawn(board)).toEqual({ shadow: "none", edge: "1px", edgeColour: "rgb(63, 63, 70)" });
      await expect.poll(() => drawn(nav)).toEqual({ shadow: "none", edge: "1px", edgeColour: "rgb(63, 63, 70)" });

      // By day: white on white.
      await theme.getByText("Bright", { exact: true }).click();
      await expect(html).toHaveAttribute("data-theme-mode", "bright");
      await expect.poll(pageColour).toBe("rgb(255, 255, 255)");
      await expect(board).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect.poll(() => drawn(board)).toEqual({ shadow: "none", edge: "1px", edgeColour: "rgb(228, 228, 231)" });

      // Worn from the first paint after a reload (index.html's early script).
      await page.reload();
      await expect(html).toHaveAttribute("data-palette", "outlines");
      await expect(board).toHaveCSS("background-color", "rgb(255, 255, 255)");

    } finally {
      // Back to what every later page expects: Dark, Gray (the frames' is the
      // add-on's to keep; a remote's goes with its context).
      if (!isMobile) {
        await theme.getByText("Dark", { exact: true }).click();
        await colors.getByText("Gray", { exact: true }).click();
        await expect(colors.getByRole("radio", { name: "Gray" })).toBeChecked();
      }
    }
  });

  test("Embossed presses the cards and the nav into the page — an inner shadow, the cards the page's floor by night (0.168.0; the nav again since 0.172.0)", async ({ page, isMobile }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(isMobile ? "/control/device" : "/control/display");
    const html = page.locator("html");
    const board = page.locator(".chakra-card__root", {
      has: page.getByRole("heading", { name: isMobile ? "Appearance" : "Display", exact: true }),
    });
    const theme = board.getByRole("radiogroup", { name: "Theme" });
    const colors = board.getByRole("radiogroup", { name: "Colors" });
    const nav = page.locator(`[data-nav="${isMobile ? "bar" : "rail"}"]`);
    const pageColour = () => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    // A shadow's layers: how many are drawn inside the box, and, of those
    // cast outside it, how many are blurred — a shade under a floating card,
    // where a hairline (the lip's light) has no blur.
    const shadow = (el: typeof board) =>
      el.evaluate((node) => {
        const layers = getComputedStyle(node).boxShadow.split(/,(?![^(]*\))/).map((l) => l.trim());
        const cast = layers.filter((l) => l !== "none" && !l.includes("inset"));
        // "<colour> <x> <y> <blur> <spread>": the blur is the third length
        // (the colour is rgb(), rgba() or color(), as Chromium writes it).
        const blur = (l: string) => parseFloat(l.replace(/^[a-z-]+\([^)]*\)\s*/, "").split(/\s+/)[2]);
        return { inset: layers.filter((l) => l.includes("inset")).length, shade: cast.filter((l) => blur(l) > 0).length, hairline: cast.filter((l) => blur(l) === 0).length };
      });
    // How far the Colors control's right edge is past the inside of its card.
    const overflow = () =>
      colors.evaluate((group) => {
        const body = group.closest(".chakra-card__body") as HTMLElement;
        const inner = body.getBoundingClientRect().right - parseFloat(getComputedStyle(body).paddingRight);
        return group.getBoundingClientRect().right - inner;
      });
    try {
      await theme.getByText("Dark", { exact: true }).click();
      await expect(html).toHaveAttribute("data-theme-mode", "dark");
      // Gray: the card stands on the page and casts a shade under it.
      await expect(html).toHaveAttribute("data-palette", "gray");
      expect((await shadow(board)).shade).toBeGreaterThan(0);
      expect((await shadow(nav)).shade).toBeGreaterThan(0);

      // The palettes, each its swatch over its name, inside the card: a
      // desktop's half-width one here, a phone's below.
      await expect(colors.getByRole("radio")).toHaveCount(4);
      expect(await overflow()).toBeLessThanOrEqual(0);

      await colors.getByText("Embossed", { exact: true }).click();
      await expect(html).toHaveAttribute("data-palette", "embossed");
      await expect(colors.getByRole("radio", { name: "Embossed" })).toBeChecked();
      // A charcoal page, and the card darker than it: the floor of a recess.
      await expect.poll(pageColour).toBe("rgb(31, 31, 35)");
      await expect(board).toHaveCSS("background-color", "rgb(17, 17, 19)");
      // Shaded inside its edge, and no shade cast under it: all there is
      // outside is the hairline of light on its lower lip. The nav is
      // pressed in with it (0.172.0, "Make the navigation concave also. It
      // is currently convex" — it stood up for one version, 0.171.3, with
      // nothing inside its edge and a shade cast under it).
      await expect.poll(() => shadow(board)).toEqual({ inset: 2, shade: 0, hairline: 1 });
      await expect.poll(() => shadow(nav)).toEqual({ inset: 2, shade: 0, hairline: 1 });

      // By day: the cards keep their white, in a page a step deeper than
      // gray's, and are pressed in the same.
      await theme.getByText("Bright", { exact: true }).click();
      await expect(html).toHaveAttribute("data-theme-mode", "bright");
      await expect.poll(pageColour).toBe("rgb(236, 236, 240)");
      await expect(board).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect.poll(() => shadow(board)).toEqual({ inset: 2, shade: 0, hairline: 1 });

      // Worn from the first paint after a reload (index.html's early script).
      await page.reload();
      await expect(html).toHaveAttribute("data-palette", "embossed");
      await expect.poll(pageColour).toBe("rgb(236, 236, 240)");
      await expect.poll(() => shadow(board)).toEqual({ inset: 2, shade: 0, hairline: 1 });

      if (isMobile) {
        // The palettes still fit a small phone's card.
        await page.setViewportSize({ width: 360, height: 780 });
        await expect.poll(overflow).toBeLessThanOrEqual(0);
      }
    } finally {
      if (!isMobile) {
        await theme.getByText("Dark", { exact: true }).click();
        await colors.getByText("Gray", { exact: true }).click();
        await expect(colors.getByRole("radio", { name: "Gray" })).toBeChecked();
      }
    }
  });

  test("buttons and segmented controls have a tile's inner corner, as a thermostat's, not the card's own (0.169.1)", async ({ page, isMobile }) => {
    // The inner corner, from the thermostats (the user: "it should've been
    // the inner radius, like on the thermostats"): a tile that's off, since a
    // lit one's is that much rounder for its ring.
    await page.goto("/climate");
    const tile = page.getByRole("button", { name: /^2nd Floor: 68°, Off/ });
    await expect(tile).toBeVisible();
    const rem = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    const inner = await tile.evaluate((node) => getComputedStyle(node).borderTopLeftRadius);
    // The theme's `sm`, a quarter of a rem.
    expect(parseFloat(inner)).toBeCloseTo(0.25 * rem, 1);

    await page.goto(isMobile ? "/control/device" : "/control/display");
    const board = page.locator(".chakra-card__root", {
      has: page.getByRole("heading", { name: isMobile ? "Appearance" : "Display", exact: true }),
    });
    await expect(board).toBeVisible();
    // The card's own corner is the rounder one: the `surface` radius, three
    // quarters of a rem — what 0.169.0 gave the controls.
    const outer = await board.evaluate((node) => getComputedStyle(node).borderTopLeftRadius);
    expect(parseFloat(outer)).toBeCloseTo(0.75 * rem, 1);
    // A segmented control: its track, and the indicator that sits flush in it.
    const theme = board.getByRole("radiogroup", { name: "Theme" });
    await expect(theme).toHaveCSS("border-radius", inner);
    await expect(theme.locator('[data-part="indicator"]')).toHaveCSS("border-radius", inner);
    await expect(board.getByRole("radiogroup", { name: "Colors" })).toHaveCSS("border-radius", inner);
    // The page header's own, Device mode.
    await expect(page.getByRole("radiogroup", { name: "Device mode" })).toHaveCSS("border-radius", inner);
    // Buttons: every one on the page — text buttons and icon buttons, the
    // header's small ones too. (The navs' entries are concentric with their
    // bar, and aren't the button recipe's.)
    const buttons = await page.locator(".chakra-button:visible").evaluateAll((els) =>
      els.map((el) => ({
        label: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 24),
        radius: getComputedStyle(el).borderTopLeftRadius,
      })),
    );
    expect(buttons.length).toBeGreaterThan(2);
    expect(buttons.filter((b) => b.radius !== inner)).toEqual([]);
    // The header's small icon buttons among them: the mic and the power.
    await expect(page.getByRole("button", { name: "Ask the house" })).toHaveCSS("border-radius", inner);
    if (!isMobile) await expect(board.getByRole("button", { name: "Refresh displays" })).toHaveCSS("border-radius", inner);
  });

  test("a remote has its own theme and colors under Device; a frame has none (0.148.0)", async ({ page, browser, isMobile }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/control/device");
    const appearance = page.locator(".chakra-card__root", { has: page.getByRole("heading", { name: "Appearance" }) });
    if (!isMobile) {
      await expect(page.getByRole("heading", { name: "Software" })).toBeVisible();
      await expect(appearance).toHaveCount(0);
      return;
    }
    const html = page.locator("html");
    // A new remote follows its system.
    await expect(appearance.getByRole("radio", { name: "Device" })).toBeChecked();
    await expect(appearance.getByText("device · dark")).toBeVisible();
    await expect(html).toHaveAttribute("data-theme-mode", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(html).toHaveAttribute("data-theme-mode", "bright");
    await expect(appearance.getByText("device · bright")).toBeVisible();
    // Its colors: worn here, kept through a reload, and the frames' untouched.
    await appearance.getByRole("radiogroup", { name: "Colors" }).getByText("Embossed", { exact: true }).click();
    await expect(html).toHaveAttribute("data-palette", "embossed");
    await page.reload();
    await expect(html).toHaveAttribute("data-palette", "embossed");
    const other = await browser.newContext({ baseURL: APP_URL });
    await other.addInitScript(() => localStorage.setItem("device-mode", "frame"));
    const frame = await other.newPage();
    await frame.goto("/home");
    await expect(frame.locator("html")).toHaveAttribute("data-palette", "gray");
    await other.close();
  });

  test("the Views tiles are three across on a phone, and six or more small ones on a desktop (0.148.0)", async ({ page, isMobile }) => {
    await page.goto("/control");
    // The Views tab is a remote's: the desktop switches to one.
    if (!isMobile) await page.getByText("Use as remote").click();
    await page.getByRole("tab", { name: "Views" }).click();
    const tiles = page.locator(".chakra-card__root", { has: page.getByRole("heading", { name: "Views" }) }).locator("button[aria-pressed]");
    await expect(tiles.first()).toBeVisible();
    const tops = await tiles.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    const firstRow = tops.filter((t) => t === tops[0]).length;
    if (isMobile) expect(firstRow).toBe(3);
    else expect(firstRow).toBeGreaterThanOrEqual(6);
  });

  test("the tabs' cards are two columns on a desktop, one on a phone (0.148.0)", async ({ page, isMobile }) => {
    await page.goto("/control/device");
    const box = async (name: string) =>
      (await page.locator(".chakra-card__root", { has: page.getByRole("heading", { name, exact: true }) }).boundingBox())!;
    await expect(page.getByRole("heading", { name: "Navigation" })).toBeVisible();
    // Polled: the page scales in as it opens (PageTransition), and a box read
    // meanwhile is off by a pixel or two.
    // Notifications heads the left column (0.160.0; Software did before),
    // Navigation the right.
    const apart = async () => {
      const notifications = await box("Notifications");
      const navigation = await box("Navigation");
      return {
        across: Math.round(navigation.x - (notifications.x + notifications.width)),
        down: Math.round(navigation.y - (notifications.y + notifications.height)),
        tops: Math.round(Math.abs(navigation.y - notifications.y)),
        lefts: Math.round(Math.abs(navigation.x - notifications.x)),
      };
    };
    if (isMobile) {
      await expect.poll(async () => (await apart()).lefts).toBe(0);
      expect((await apart()).down).toBeGreaterThan(0);
    } else {
      // Side by side, their tops level: Navigation heads the right column.
      await expect.poll(async () => (await apart()).tops).toBe(0);
      expect((await apart()).across).toBeGreaterThan(0);
    }
  });

  // 0.172.0, the user, of the Display and Device tabs: "Make the cards on
  // both of these routes to be collapsible".
  test("every card of the Display and Device tabs folds to its header, and stays folded on this device through a reload (0.172.0)", async ({ page, isMobile }) => {
    const card = (title: string) => page.locator(".chakra-card__root", { has: page.getByRole("heading", { name: title, exact: true }) });
    // A card's fold: its title, stretched over the whole header (Board).
    const header = (title: string) => card(title).locator("button[data-stretched]");
    const body = (title: string) => card(title).locator(".chakra-card__body").first();
    // A frame — a desktop, by default — wears the frames' theme and has no
    // Appearance card of its own; the Account card is Cloudflare Access's
    // (account.spec folds it).
    const tabs = {
      display: ["Display", "Screen", "Album"],
      device: [...(isMobile ? ["Appearance"] : []), "Notifications", "Software", "Navigation", "Voice"],
    };
    for (const [tab, titles] of Object.entries(tabs)) {
      await page.goto(`/control/${tab}`);
      for (const title of titles) {
        // Open until it is folded.
        await expect(body(title)).toBeVisible();
        await expect(header(title)).toHaveAttribute("aria-expanded", "true");
        await header(title).click();
        await expect(header(title)).toHaveAttribute("aria-expanded", "false");
        await expect(body(title)).toBeHidden();
        // The header is all there is, and still says what the card is.
        await expect(card(title).getByRole("heading", { name: title, exact: true })).toBeVisible();
      }
      await page.reload();
      for (const title of titles) {
        await expect(header(title)).toHaveAttribute("aria-expanded", "false");
        await expect(body(title)).toBeHidden();
      }
      // One opened again; the rest stay as they were left.
      await header(titles[0]).click();
      await expect(header(titles[0])).toHaveAttribute("aria-expanded", "true");
      await expect(body(titles[0])).toBeVisible();
      await expect(body(titles[1])).toBeHidden();
    }
    // What a header holds besides its title is still its own: the Software
    // card's badge shows on the folded card.
    await expect(card("Software").getByText("Up to date")).toBeVisible();
    // The Views card — a remote's whole tab — doesn't fold.
    if (isMobile) {
      await page.goto("/control/views");
      await expect(card("Views")).toBeVisible();
      await expect(card("Views").locator("button[data-stretched]")).toHaveCount(0);
    }
  });

  // 0.172.0, the user: "remove the auto refresh toggle, just make it default
  // to always refresh a device on a new install". Until then a device asked
  // first — a toast with a Refresh button — unless its Updates card's switch
  // was on.
  test.describe("a new version", () => {
    // Without the service worker: a page it controls makes its requests
    // through it, where a route can't answer them.
    test.use({ serviceWorkers: "block" });

    test("a page older than the installed add-on reloads itself, once and without asking, and Settings has no switch for it (0.172.0)", async ({ page }) => {
      // The add-on says it is a version this page isn't.
      await page.route("**/api", async (route) => {
        const response = await route.fetch();
        await route.fulfill({ response, json: { ...(await response.json()), version: "9.9.9" } });
      });
      let loads = 0;
      page.on("load", () => loads++);
      await page.goto("/control/device");
      // It reloads itself: the page has loaded twice.
      await expect.poll(() => loads).toBe(2);
      // Still the old page after that — here the add-on only says it is newer
      // — it asks, rather than reloading for ever.
      await expect(page.getByText("New version available")).toBeVisible();
      await expect(page.getByRole("button", { name: "Update to v9.9.9" })).toBeVisible();
      expect(loads).toBe(2);
      // Nothing to choose: no Updates card, no switch.
      await expect(page.getByRole("heading", { name: "Software", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Updates", exact: true })).toHaveCount(0);
      await expect(page.getByText("Refresh automatically")).toHaveCount(0);
      await expect(page.getByRole("switch", { name: /refresh/i })).toHaveCount(0);
    });
  });

  // A card that folds clips what it holds, so a row can't be let out of it.
  test("a Navigation row dragged past its card's edge stays in its list, and still lands where it was taken (0.172.0)", async ({ page, isMobile }) => {
    test.skip(isMobile, "a mouse's drag; a touch's goes through the same sensor");
    await page.goto("/control/device");
    const card = page.locator(".chakra-card__root", { has: page.getByRole("heading", { name: "Navigation", exact: true }) });
    const moves = () => card.getByRole("button", { name: /^Move / }).evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")!));
    await expect(card.getByRole("button", { name: /^Move / }).first()).toBeVisible();
    await splashGone(page);
    const before = await moves();
    expect(before.length).toBeGreaterThan(2);
    // The second row that moves, by its handle: the row is the handle's
    // parent, and the list the rows' own.
    const handle = card.getByRole("button", { name: before[1], exact: true });
    const row = handle.locator("xpath=..");
    const list = row.locator("xpath=..");
    const grip = (await handle.boundingBox())!;
    const edge = (await card.boundingBox())!;
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(grip.x + grip.width / 2, grip.y - 20, { steps: 4 });
    // Far above the card: over the tabs.
    await page.mouse.move(grip.x + grip.width / 2, edge.y - 80, { steps: 8 });
    // The row has gone as far as the list's head and no further, whole.
    await expect
      .poll(async () => Math.round((await row.boundingBox())!.y - (await list.boundingBox())!.y))
      .toBe(0);
    await page.mouse.up();
    // Dropped there, it is the first of the rows that move.
    await expect.poll(moves).toEqual([before[1], before[0], ...before.slice(2)]);
    // And back, for this device's nav is kept (localStorage, cleared with the context).
    await card.getByRole("button", { name: "Reset" }).click();
    await expect.poll(moves).toEqual(before);
  });

  test("the device mode switches the navigation between frame and remote", async ({ page, isMobile }) => {
    test.skip(isMobile, "a phone starts as a remote; the frame's switch is a desktop's");
    await page.goto("/control");
    await expect(page.getByRole("tab", { name: "Clock" })).toBeVisible();

    await page.getByText("Use as remote").click();
    await expect(page.getByRole("tab", { name: "Clock" })).toHaveCount(0);
    // A remote has the Views tab (0.139: the tabs on every device).
    await page.getByRole("tab", { name: "Views" }).click();
    await expect(page.getByRole("heading", { name: "Views" })).toBeVisible();

    await page.getByText("Use as frame").click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("tab", { name: "Clock" })).toBeVisible();
  });

  test("the Views card sends every view to the frames, and this remote stays on Settings", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the Views card is a remote's");
    await page.goto("/control");
    // Lights (with Climate, Weather, Calendar and Timer) used to open on the
    // remote itself (0.127).
    const lights = page.getByRole("button", { name: "Lights", exact: true });
    await expect(lights).toHaveAttribute("aria-pressed", "false");
    await lights.click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/control\/views$/);
    await expect(lights).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Clock", exact: true }).click();
    await expect(page).toHaveURL(/\/control\/views$/);
    await expect(page.getByRole("button", { name: "Clock", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("the Screen card turns the frames' screen off and on, and keeps the hours it is on", async ({ page, request, isMobile }) => {
    const screen = async () => (await request.get("/api/screen")).json();
    // As the add-on starts: on, no schedule.
    await request.put("/api/screen/schedule", { data: { enabled: false, on: "06:30", off: "23:00" } });
    await request.get("/api/screen/on");

    await page.goto("/control");
    await page.getByRole("tab", { name: "Display" }).click();
    await expect(page.getByRole("heading", { name: "Screen", exact: true })).toBeVisible();
    const power = page.getByRole("checkbox", { name: "Screen on" });
    await expect(power).toBeChecked();
    await page.getByText("Screen on", { exact: true }).click();
    await expect(power).not.toBeChecked();
    await expect.poll(async () => (await screen()).state).toBe("off");

    // The hours, saved as they are set (0.129).
    await page.getByText("On a schedule", { exact: true }).click();
    await page.getByLabel("On at").fill("07:00");
    await page.getByLabel("Off at").fill("22:00");
    await expect.poll(async () => (await screen()).schedule).toEqual({ enabled: true, on: "07:00", off: "22:00" });
    // Kept by the add-on: a fresh page has them.
    await page.reload();
    if (isMobile) await page.getByRole("tab", { name: "Display" }).click();
    await expect(page.getByRole("checkbox", { name: "On a schedule" })).toBeChecked();
    await expect(page.getByLabel("On at")).toHaveValue("07:00");
    await expect(page.getByLabel("Off at")).toHaveValue("22:00");

    // Back as it was, for the specs after this one.
    await request.put("/api/screen/schedule", { data: { enabled: false, on: "06:30", off: "23:00" } });
    await request.get("/api/screen/on");
  });

  // 0.131: the brightness slider and the dark hours are a phone's and the
  // frame's; a desktop's card has neither.
  test("the Screen card's brightness and dark hours are kept by the add-on, and are not a desktop's", async ({ page, request, isMobile }) => {
    const screen = async () => (await request.get("/api/screen")).json();
    await request.put("/api/screen/dark", { data: { enabled: false, from: "21:00", to: "06:30" } });
    await request.put("/api/screen/auto", { data: { enabled: false, min: 25, max: 255 } });

    await page.goto("/control");
    if (isMobile) await page.getByRole("tab", { name: "Display" }).click();
    await expect(page.getByRole("heading", { name: "Screen", exact: true })).toBeVisible();
    const slider = page.getByRole("slider", { name: "Brightness" });
    if (!isMobile) {
      await expect(page.getByRole("checkbox", { name: "Screen on" })).toBeVisible();
      await expect(slider).toHaveCount(0);
      await expect(page.getByRole("checkbox", { name: "Adjust to the room" })).toHaveCount(0);
      await expect(page.getByRole("checkbox", { name: "Dark hours" })).toHaveCount(0);
      return;
    }

    // Brightness from the room's light (0.137): the switch is the add-on's
    // setting, and the range's thumbs are its levels. No frame reports here.
    await expect(page.getByText(/Room light now: \d+ lx|No reading from the light sensor yet/)).toBeVisible();
    await page.getByText("Adjust to the room", { exact: true }).click();
    await expect.poll(async () => (await screen()).auto).toEqual({ enabled: true, min: 25, max: 255 });
    const dimmest = page.getByRole("slider", { name: "Dimmest" });
    await dimmest.focus();
    await page.keyboard.press("Home");
    await expect.poll(async () => (await screen()).auto.min).toBe(0);
    await expect(page.getByText("0%–100%")).toBeVisible();

    // The slider sets the frames' level — Home is the slider's lowest.
    await slider.focus();
    await page.keyboard.press("Home");
    await expect.poll(async () => (await screen()).brightness).toBe(0);
    await expect(page.getByText("0%", { exact: true })).toBeVisible();

    // The dark hours, saved as they are set.
    await page.getByText("Dark hours", { exact: true }).click();
    await page.getByLabel("Dark from").fill("20:00");
    await page.getByLabel("Dark until").fill("05:00");
    await expect.poll(async () => (await screen()).dark).toEqual({ enabled: true, from: "20:00", to: "05:00" });
    // Kept by the add-on: a fresh page has them.
    await page.reload();
    await page.getByRole("tab", { name: "Display" }).click();
    await expect(page.getByRole("checkbox", { name: "Dark hours" })).toBeChecked();
    await expect(page.getByLabel("Dark from")).toHaveValue("20:00");
    await expect(page.getByLabel("Dark until")).toHaveValue("05:00");
    await expect(page.getByRole("slider", { name: "Brightness" })).toHaveAttribute("aria-valuenow", "0");

    // The slider by hand is the end of the room's say.
    await page.getByRole("slider", { name: "Brightness" }).focus();
    await page.keyboard.press("End");
    await expect.poll(async () => (await screen()).auto.enabled).toBe(false);
    await expect(page.getByRole("checkbox", { name: "Adjust to the room" })).not.toBeChecked();

    // Back as it was, for the specs after this one.
    await request.put("/api/screen/dark", { data: { enabled: false, from: "21:00", to: "06:30" } });
    await request.put("/api/screen/auto", { data: { enabled: false, min: 25, max: 255 } });
    await request.get("/api/screen/brightness/255");
  });
});
