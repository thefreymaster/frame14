import { expect, test } from "@playwright/test";
import { resetStub, settled, splashGone, stub } from "./helpers";

test.beforeEach(async ({ request }) => {
  await resetStub(request);
});

// 0.131.1: on a phone the Solar tab — the Now card, the Today card and the
// month chart — is taller than the screen. In WebKit (Safari, the iPhone's
// home-screen app) the page was held to the screen's height, so the month
// card got the sliver left over, its figures ran out of it and the chart was
// cut off under the nav. These projects are Chromium, which always grew the
// page; the test keeps that contract here, and the WebKit layout was checked
// by hand (an iPhone 13 profile in Playwright's WebKit) when it was fixed.
test("the month card holds its chart, the page scrolling to it where it is taller than the screen", async ({ page }) => {
  await page.goto("/energy");
  const chart = page.getByRole("img", { name: /running totals|by day|by month/ });
  await expect(chart).toBeVisible();
  const card = chart.locator("xpath=ancestor::*[contains(@class, 'chakra-card__root')][1]");
  const lead = page.getByText(/^Solar covered in /);

  await chart.scrollIntoViewIfNeeded();
  const c = (await card.boundingBox())!;
  const p = (await chart.boundingBox())!;
  const l = (await lead.boundingBox())!;
  // The plot has its height, and the card's figures and plot are inside it.
  expect(p.height).toBeGreaterThanOrEqual(120);
  expect(l.y + l.height).toBeLessThanOrEqual(p.y);
  expect(p.y + p.height).toBeLessThanOrEqual(c.y + c.height);
  // And the plot comes into view: nothing clips it.
  await expect(chart).toBeInViewport({ ratio: 0.9 });
});

// 0.138 / 0.138.1: a circuit drawing power has a highlight running along its
// bar, at the draw's pace — the range's ::after animation, its playback rate
// lib energy's flowPace (`data-pace`); the bars are pills.
test("a drawing circuit's bar flows at the pace of its draw, and the bars are pills", async ({ page }) => {
  await page.goto("/energy/circuits");
  const ranges = page.locator("[data-part=range][data-flowing]");
  await expect(ranges.first()).toBeVisible();
  const paces = await ranges.evaluateAll((els) =>
    els.map((el) => {
      const animation = el.getAnimations({ subtree: true })[0];
      return { pace: Number(el.getAttribute("data-pace")), rate: animation?.playbackRate ?? null, running: animation?.playState };
    }),
  );
  expect(paces.length).toBeGreaterThan(1);
  for (const p of paces) {
    expect(p.running).toBe("running");
    expect(p.rate).toBe(p.pace);
    expect(p.pace).toBeGreaterThanOrEqual(0.25);
    expect(p.pace).toBeLessThanOrEqual(3);
  }
  // The circuits are listed by their draw, so the paces never rise down the list.
  for (let i = 1; i < paces.length; i++) expect(paces[i].pace).toBeLessThanOrEqual(paces[i - 1].pace);
  // An idle circuit's bar is still.
  const idle = page.locator("[data-part=range]:not([data-flowing])").first();
  await expect(idle).toHaveCount(1);
  expect(await idle.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  await expect(page.locator("[data-part=track]").first()).toHaveCSS("border-radius", "9999px");
  await expect(ranges.first()).toHaveCSS("border-radius", "9999px");
});

// 0.176.0, the user: "When clicking the energ card from the Home Screen it
// should just show the same energy components as the energy route. Don't
// actually route though still should be in drawer". The drawer had a today's
// chart and split totals of its own from 0.142; now it is the page's parts —
// Now, then Solar (today's card over the month's) and Circuits — each a
// section of the drawer, and the address stays Home's.
test("the Home card's drawer shows the Energy page's own parts, in a drawer, and goes nowhere", async ({ page }) => {
  /** What an energy view is made of, wherever it is: its headings, in order. */
  const parts = (scope: ReturnType<typeof page.locator>) =>
    scope.getByRole("heading", { level: 2 }).evaluateAll((headings) => headings.map((h) => h.textContent?.trim() ?? "").filter((text) => text !== "Energy"));

  await page.goto("/home");
  // At the flow, the card's first half: on a desktop the board fits the
  // screen (0.171.0) and the second may be cut off, under the card's More.
  await page.getByRole("button", { name: "Show energy detail" }).click({ position: { x: 60, y: 30 } });
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Energy" })).toBeVisible();
  // The focus opens on the panel itself, which draws no ring: the card's
  // trigger is no button, so after a tap Chromium would ring whatever the
  // dialog focused — the Solar tab, when it was the first tabbable thing.
  await expect(dialog).toBeFocused();
  await expect(dialog).toHaveCSS("outline-style", "none");
  await expect(page).toHaveURL(/\/home$/);

  // Now, with the flow, over the page's two tabs; it opens on Solar.
  await expect(dialog.getByRole("heading", { name: "Now" })).toBeVisible();
  await expect(dialog.locator("[data-flow]")).toBeVisible();
  const solar = dialog.getByRole("tab", { name: "Solar" });
  const circuits = dialog.getByRole("tab", { name: "Circuits" });
  await expect(solar).toHaveAttribute("aria-selected", "true");
  // Solar is the page's Today card — the coverage figure beside the day's
  // totals, over the curve — and its month card, whose chart has a height
  // to be drawn in though nothing here hands it one.
  await expect(dialog.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(dialog.getByText("Solar covered today")).toBeVisible();
  const month = dialog.getByRole("img", { name: /running totals/ });
  await month.scrollIntoViewIfNeeded();
  await expect(month).toBeVisible();
  expect((await month.boundingBox())!.height).toBeGreaterThanOrEqual(120);
  await expect(dialog.getByText(/^Solar covered in /)).toBeVisible();
  // With its controls: a month back, and by day.
  const title = dialog.getByRole("heading", { name: /^\w+ \d{4}$/ });
  const before = await title.textContent();
  await dialog.getByRole("button", { name: "Previous month" }).click();
  await expect(title).not.toHaveText(before!);
  await dialog.getByRole("button", { name: "Next month" }).click();
  await expect(title).toHaveText(before!);
  // Not the split totals it had to itself, which the page never had.
  await expect(dialog.getByText("Solar produced")).toHaveCount(0);
  // Each part is a section of the drawer — its title over a well — not a card in it.
  await expect(dialog.locator("[data-board-panel]")).toHaveCount(3);
  for (const section of await dialog.locator("[data-board-panel]").all()) {
    await expect(section.locator(":scope > .chakra-card__root")).toHaveCount(1);
    await expect(section.locator(":scope > .chakra-card__root").getByRole("heading")).toHaveCount(0);
  }
  const inDrawer = await parts(dialog);

  await circuits.click();
  await expect(circuits).toHaveAttribute("aria-selected", "true");
  // The house's draw in the title (the stub's main, 1220 W), the circuits
  // by name with the unmonitored rest last, a drawing one's bar flowing.
  await expect(dialog.getByRole("heading", { name: "Circuits · 1.2 kW" })).toBeVisible();
  await expect(dialog.getByText("Heat Pump 1")).toBeVisible();
  await expect(dialog.getByText("Other", { exact: true })).toBeVisible();
  await expect(dialog.locator("[data-part=range][data-flowing]").first()).toBeVisible();
  await expect(dialog.getByText("Solar covered today")).toBeHidden();
  // Now stays above the tabs.
  await expect(dialog.getByRole("heading", { name: "Now" })).toBeVisible();
  const circuitsInDrawer = await parts(dialog);

  await solar.click();
  await expect(dialog.getByText("Solar covered today")).toBeVisible();
  // A tab is the drawer's own: the page behind is still Home.
  await expect(page).toHaveURL(/\/home$/);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/home$/);
  // And it opens on Solar again.
  await page.getByRole("button", { name: "Show energy detail" }).click({ position: { x: 60, y: 30 } });
  await expect(dialog.getByRole("tab", { name: "Solar" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // The page itself: the same parts under the same names, tab for tab.
  await page.goto("/energy/solar");
  const main = page.locator("[data-page-shell]");
  await expect(main.getByText("Solar covered today")).toBeVisible();
  await expect(main.getByRole("img", { name: /running totals/ })).toBeVisible();
  expect(await parts(main)).toEqual(inDrawer);
  // There they are cards, not sections.
  await expect(main.locator("[data-board-panel]")).toHaveCount(0);
  await page.goto("/energy/circuits");
  await expect(main.getByRole("heading", { name: "Circuits · 1.2 kW" })).toBeVisible();
  expect(await parts(main)).toEqual(circuitsInDrawer);
});

// 0.176.0, the user, of the Now card: "add a tag to the header of the card
// says Importing or Exporting depending on what is happenjng".
test("the Now card's header says which way the power is going through the meter, on the page and in the drawer", async ({ page, request }) => {
  const E = "sensor.envoy_482518016321";
  await page.goto("/energy");
  const now = page.locator(".chakra-card__root", { has: page.getByRole("heading", { name: "Now", exact: true }) });
  const tag = now.locator("[data-grid-direction]");
  const colour = () => tag.evaluate((el) => getComputedStyle(el).color);
  // The stub's house: 0.903 kW from the panels, 1.184 kW in use — the rest comes in.
  await expect(tag).toHaveText("Importing");
  await expect(tag).toHaveAttribute("data-grid-direction", "importing");
  // Beside the figure it had, in its colour, before it.
  const figure = now.getByLabel("Importing 0.3 kW");
  await expect(figure).toHaveText("↓ 0.3 kW");
  expect(await colour()).toBe(await figure.evaluate((el) => getComputedStyle(el).color));
  expect((await tag.boundingBox())!.x).toBeLessThan((await figure.boundingBox())!.x);
  const importing = await colour();

  // The sun comes out: 4 kW, 2.8 of it out to the grid.
  await stub(request, "/_stub/state", { entity_id: `${E}_current_power_production`, state: "4.0" });
  await expect(tag).toHaveText("Exporting");
  await expect(tag).toHaveAttribute("data-grid-direction", "exporting");
  await expect(now.getByLabel("Exporting 2.8 kW")).toHaveText("↑ 2.8 kW");
  expect(await colour()).not.toBe(importing);

  // The panels cover the house to the watt: nothing through the meter, no tag.
  await stub(request, "/_stub/state", { entity_id: `${E}_current_power_production`, state: "1.184" });
  await expect(tag).toHaveCount(0);
  await expect(now.getByText("Grid idle")).toBeVisible();

  // The drawer's Now is the same card: the same tag. Home's own Energy card
  // keeps the figure alone — its header has the day's coverage to hold too.
  await stub(request, "/_stub/state", { entity_id: `${E}_current_power_production`, state: "4.0" });
  await page.goto("/home");
  await expect(page.locator('[data-card="energy"]').getByLabel("Exporting 2.8 kW")).toBeAttached();
  await expect(page.locator('[data-card="energy"] [data-grid-direction]')).toHaveCount(0);
  await page.getByRole("button", { name: "Show energy detail" }).click({ position: { x: 60, y: 30 } });
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("[data-grid-direction]")).toHaveText("Exporting");
});

// 0.176.0, the user, of the flow: "Add small rays of light hitting the solar
// panels on the solar icon, make the house icon yellow when below 100% and
// green when over 100%, add electric animation around the far right
// lightning bolt. Make the far right grid bolt and circle be blue" — and, of
// that bolt, "Is there a better icon to represent the grid? Like high
// voltage power lines": a transmission tower.
test("the flow's nodes say what they are: light falls on the panels, the house is the colour of the day's coverage, and the grid is a blue pylon with electricity round it", async ({ page, request }) => {
  const E = "sensor.envoy_482518016321";
  await page.goto("/energy");
  const flow = page.locator("[data-page-shell] [data-flow]");
  const node = (name: string) => flow.locator(`[data-flow-part="${name}"]`);
  const edge = (name: string) => node(name).evaluate((el) => getComputedStyle(el).borderTopColor);
  const glyph = (name: string) => node(name).locator("[data-flow-icon] > svg").evaluate((el) => getComputedStyle(el).color);
  /** What an element's animation changes, whether it runs, and how long a turn is. */
  const moving = (el: ReturnType<typeof page.locator>) =>
    el.evaluate((box) => {
      const [animation] = box.getAnimations();
      if (!animation) return null;
      const frames = (animation.effect as KeyframeEffect).getKeyframes();
      return {
        changes: [...new Set(frames.flatMap((f) => Object.keys(f)))].filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k)).sort(),
        state: animation.playState,
        seconds: Number(animation.effect!.getComputedTiming().duration) / 1000,
        endless: animation.effect!.getComputedTiming().iterations === Infinity,
      };
    });
  await expect(flow.locator("[data-flow-node]")).toHaveCount(3);
  const root = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));

  // The panels are making power: three rays over the roof, each falling
  // and fading — opacity and transform, nothing a frame has to repaint.
  const rays = node("solar").locator("[data-flow-ray]");
  await expect(rays).toHaveCount(3);
  const solarYellow = await edge("solar");
  expect(await glyph("solar")).toBe(solarYellow);
  const icon = (await node("solar").locator("[data-flow-icon] > svg").boundingBox())!;
  const disc = (await node("solar").boundingBox())!;
  for (const ray of await rays.all()) {
    expect(await moving(ray)).toMatchObject({ changes: ["opacity", "transform"], state: "running", endless: true });
    await expect(ray).toHaveCSS("background-color", solarYellow);
    // Small: a fifth of the icon long, as thin as its own lines.
    const { width, height } = await ray.evaluate((el) => ({ width: (el as HTMLElement).offsetWidth, height: (el as HTMLElement).offsetHeight }));
    expect(height).toBeCloseTo(icon.width * 0.2, 0);
    expect(width).toBeLessThanOrEqual(2);
  }
  // One after another, not together: each a third of a fall behind the last.
  const starts = await rays.evaluateAll((els) => els.map((el) => Number(el.getAnimations()[0].effect!.getComputedTiming().progress)));
  const behind = (a: number, b: number) => Math.round((((a - b) % 1) + 1) * 3) % 3;
  expect([behind(starts[0], starts[1]), behind(starts[1], starts[2])]).toEqual([2, 2]);
  // Where a ray is as it sets out and as it lands: above the roof, coming
  // down onto it from the right, inside the node's circle all the way.
  const fall = await rays.first().evaluate((el) => {
    const [animation] = el.getAnimations();
    const duration = Number(animation.effect!.getComputedTiming().duration);
    const delay = Number(animation.effect!.getComputedTiming().delay);
    const at = (share: number) => {
      animation.currentTime = duration * share + delay;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top, shown: Number(getComputedStyle(el).opacity) };
    };
    const was = animation.currentTime;
    animation.pause();
    const read = [at(0.02), at(0.5), at(0.98)];
    animation.currentTime = was;
    animation.play();
    return read;
  });
  expect(fall[2].y).toBeGreaterThan(fall[0].y + icon.height * 0.15);
  expect(fall[2].x).toBeLessThan(fall[0].x);
  expect(fall[0].top).toBeGreaterThan(disc.y);
  expect(fall[2].y).toBeLessThan(icon.y + icon.height * 0.3);
  // It comes in out of nothing, is brightest on its way and is gone as it lands.
  expect(fall[0].shown).toBeLessThan(0.2);
  expect(fall[1].shown).toBe(1);
  expect(fall[2].shown).toBeLessThan(0.2);

  // The house: 15 of the day's 22 kWh from the panels, so the solar's
  // yellow — the glyph alone, in the grey disc it had, the ring its coverage.
  await expect(node("home").locator("[data-flow-icon]")).toHaveAttribute("data-flow-icon", "solar");
  expect(await glyph("home")).toBe(solarYellow);
  expect(await node("home").evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(await node("solar").evaluate((el) => getComputedStyle(el).backgroundColor));

  // The grid: blue, icon and circle, while power comes in…
  const blue = await edge("grid");
  expect(blue).toBe("rgb(59, 130, 246)");
  expect(await glyph("grid")).toBe(blue);
  const wire = () => flow.locator("[data-flow-wire] [data-flow-wave]").nth(1).evaluate((el) => getComputedStyle(el).backgroundColor);
  const taken = await wire();
  expect(taken).not.toBe(blue);
  // …with electricity round its tower: the tower's own glow, crackling —
  // opacity alone, the blur it is drawn with never changing — and six sparks.
  const glow = node("grid").locator("[data-flow-glow]");
  expect(await moving(glow)).toMatchObject({ changes: ["opacity"], state: "running", endless: true });
  expect(await glow.evaluate((el) => getComputedStyle(el).filter)).toMatch(/^blur\(/);
  const sparks = node("grid").locator("[data-flow-spark]");
  await expect(sparks).toHaveCount(6);
  const turns = [];
  for (const spark of await sparks.all()) {
    const motion = (await moving(spark))!;
    expect(motion).toMatchObject({ changes: ["opacity", "transform"], state: "running", endless: true });
    turns.push(motion.seconds);
  }
  // Each on a turn of its own length, so they never fall into step.
  expect(new Set(turns).size).toBe(6);
  // A spark is nothing for most of its turn, then there, out from the tower
  // and inside the circle; and round the tower, not all to one side.
  const gridDisc = (await node("grid").boundingBox())!;
  const middle = { x: gridDisc.x + gridDisc.width / 2, y: gridDisc.y + gridDisc.height / 2 };
  const where = await sparks.evaluateAll((els) =>
    els.map((el) => {
      const [animation] = el.getAnimations();
      const timing = animation.effect!.getComputedTiming();
      const duration = Number(timing.duration);
      // A share of its own turn: it set out part-way through one (a negative
      // delay), so that share comes round a turn or two into the page's time.
      const at = (share: number) => {
        let time = duration * share + Number(timing.delay);
        while (time < 0) time += duration;
        animation.currentTime = time;
      };
      const was = animation.currentTime;
      animation.pause();
      at(0.5);
      const resting = Number(getComputedStyle(el).opacity);
      at(0.11);
      const lit = Number(getComputedStyle(el).opacity);
      const r = el.getBoundingClientRect();
      animation.currentTime = was;
      animation.play();
      return { resting, lit, x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }),
  );
  for (const spark of where) {
    expect(spark.resting).toBe(0);
    expect(spark.lit).toBe(1);
    const out = Math.hypot(spark.x - middle.x, spark.y - middle.y);
    expect(out).toBeGreaterThan(root * 0.5);
    expect(out).toBeLessThan(gridDisc.width / 2 - 2);
  }
  expect(where.some((s) => s.x < middle.x) && where.some((s) => s.x > middle.x)).toBe(true);
  expect(where.some((s) => s.y < middle.y) && where.some((s) => s.y > middle.y)).toBe(true);

  // …and while it goes out: the same blue, the wire in the export's own colour.
  await stub(request, "/_stub/state", { entity_id: `${E}_current_power_production`, state: "4.0" });
  await expect(flow.locator("[data-flow-wire]").nth(1)).toHaveAttribute("data-flow-wire", "right");
  expect(await edge("grid")).toBe(blue);
  expect(await glyph("grid")).toBe(blue);
  await expect(sparks).toHaveCount(6);
  const sent = await wire();
  expect(sent).not.toBe(blue);
  expect(sent).not.toBe(taken);

  // Under reduced motion the rays stand on the roof, the glow is steady and there are no sparks.
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const ray of await rays.all()) {
    await expect(ray).toHaveCSS("animation-name", "none");
    await expect(ray).toBeVisible();
  }
  await expect(glow).toHaveCSS("animation-name", "none");
  await expect(glow).toBeVisible();
  for (const spark of await sparks.all()) await expect(spark).toBeHidden();
  await page.emulateMedia({ reducedMotion: "no-preference" });

  // Nothing through the meter: the grid is grey and still, as the panels are at night.
  await stub(request, "/_stub/state", { entity_id: `${E}_current_power_production`, state: "1.184" });
  await expect(node("grid").locator("[data-flow-sparks]")).toHaveCount(0);
  expect(await edge("grid")).not.toBe(blue);
  await stub(request, "/_stub/state", { entity_id: `${E}_current_power_production`, state: "0" });
  await expect(node("solar").locator("[data-flow-rays]")).toHaveCount(0);
  expect(await edge("solar")).not.toBe(solarYellow);
  // The same on Home's card, at its smaller size.
  await stub(request, "/_stub/state", { entity_id: `${E}_current_power_production`, state: "0.903" });
  await page.goto("/home");
  const card = page.locator('[data-card="energy"]');
  await expect(card.locator("[data-flow-ray]")).toHaveCount(3);
  await expect(card.locator("[data-flow-spark]")).toHaveCount(6);
  expect(await card.locator('[data-flow-part="grid"]').evaluate((el) => getComputedStyle(el).borderTopColor)).toBe(blue);
});

test.describe("on a day the panels have covered", () => {
  // The test answers /api/energy itself, which a page the service worker
  // controls would ask through it, unseen.
  test.use({ serviceWorkers: "block" });

  test("the flow's house is green", async ({ page }) => {
    await page.route("**/api/energy", async (route) => {
      const response = await route.fetch();
      const day = (await response.json()) as { production: number; consumption: number };
      await route.fulfill({ response, json: { ...day, production: day.consumption * 1.07 } });
    });
    await page.goto("/energy");
    const flow = page.locator("[data-page-shell] [data-flow]");
    const house = flow.locator('[data-flow-part="home"] [data-flow-icon]');
    await expect(house).toHaveAttribute("data-flow-icon", "export");
    // The green the ring's second lap is, and the card's figure turns.
    const green = await house.locator("svg").evaluate((el) => getComputedStyle(el).color);
    expect(green).toBe("rgb(22, 163, 74)");
    expect(green).not.toBe(await flow.locator('[data-flow-part="solar"]').evaluate((el) => getComputedStyle(el).borderTopColor));
    await expect(page.getByLabel("Solar covered 107% of today's use").first()).toBeAttached();
  });
});

// 0.173.0, the user, of the Energy card's flow: "The center circle border
// is too thick. Make it match the other two for generation and grid" — the
// home node's ring was a stroke of 3 in a drawing that grew with the type,
// beside two 2px borders that didn't — and "Use the same home icon for the
// solar card as the home icon in the navigation".
test("the flow's home node has a ring as thick as the other nodes' borders at any size of type, and the navigation's house in it", async ({ page, isMobile }) => {
  await page.goto("/home");
  const flow = page.locator('[data-card="energy"]');
  await expect(flow.locator("[data-flow-node]")).toHaveCount(3);
  // The ring is read through its screen matrix, which the splash's hand-over
  // (the cards rising, scaled 0.98) is part of until it ends: a 2px stroke
  // read 1.96 whenever the splash took longer than the test to get here.
  await settled(page);

  const measure = () =>
    flow.evaluate((card) => {
      const nodes = [...card.querySelectorAll<HTMLElement>("[data-flow-node]")];
      const bordered = nodes.filter((n) => n.dataset.flowNode === "");
      const home = nodes.find((n) => n.dataset.flowNode === "ring")!;
      const ring = home.querySelector<SVGSVGElement>("svg[data-flow-ring]")!;
      const circles = [...ring.querySelectorAll("circle")];
      // How many pixels a unit of the drawing is: one, with no scale of its own.
      const matrix = ring.getScreenCTM()!;
      const unit = Math.hypot(matrix.a, matrix.b);
      return {
        root: parseFloat(getComputedStyle(document.documentElement).fontSize),
        borders: bordered.map((n) => parseFloat(getComputedStyle(n).borderTopWidth)),
        sizes: nodes.map((n) => n.getBoundingClientRect().width),
        ownBorder: parseFloat(getComputedStyle(home).borderTopWidth),
        strokes: circles.map((c) => parseFloat(getComputedStyle(c).strokeWidth) * unit),
        // Where the ring's outside lies: the circle's radius and half its stroke, from the node's middle.
        outer: circles.map((c) => (c.r.baseVal.value + parseFloat(getComputedStyle(c).strokeWidth) / 2) * unit),
        // The arcs start at the top: the drawing is turned a quarter back.
        turned: Math.round((Math.atan2(matrix.b, matrix.a) * 180) / Math.PI),
      };
    });

  const check = async () => {
    const m = await measure();
    expect(m.borders).toEqual([2, 2]);
    // The ring is the home node's edge: no border under it, and each of its
    // strokes the others' border to the pixel.
    expect(m.ownBorder).toBe(0);
    expect(m.strokes).toHaveLength(3);
    for (const stroke of m.strokes) expect(stroke).toBeCloseTo(2, 2);
    // The three nodes are one size, and the ring's outside is its node's edge, as a border's is.
    expect(new Set(m.sizes.map((s) => Math.round(s * 10))).size).toBe(1);
    for (const outer of m.outer) expect(outer).toBeCloseTo(m.sizes[0] / 2, 1);
    expect(m.turned).toBe(-90);
    return m;
  };
  const small = await check();
  if (!isMobile) {
    // The frame's size, where the type is 28px and the nodes are 70px
    // across: the ring was over 5px there. Still the borders' two.
    await page.setViewportSize({ width: 1600, height: 2400 });
    await expect.poll(async () => (await measure()).root).toBe(28);
    const large = await check();
    expect(large.sizes[0]).toBeGreaterThan(small.sizes[0] * 1.3);
  }

  // The house in it is the one the navigation draws for Home, the page in hand.
  const drawing = (svg: ReturnType<typeof page.locator>) => svg.evaluate((el) => el.innerHTML);
  const nav = page.locator("[data-nav]").getByRole("tab", { name: "Home" }).locator("svg").first();
  const house = await drawing(flow.locator('[data-flow-node="ring"] svg:not([data-flow-ring])'));
  expect(house).toBe(await drawing(nav));
  // And the day's "Home used" beside the panels' wears the same.
  expect(await drawing(flow.getByLabel(/Home used/).locator("svg").first())).toBe(house);
});

// 0.173.0, the user: "Make the dotted lines between production house and
// usage be AC waves. Maintain flow direction and speed of consumption" —
// and, of one wave a wire, "Doesn't AC have two waves?": a house's two legs,
// each the other turned over. Each wire carried dots until then, one every
// 12px, moved a pitch in 0.6s at 1 kW. 0.177.1, the user, of the waves
// sliding along their wire: "lets try instead the wave is static in place
// representing the 60hz but the lines are redrawn tracing the wave itself".
test("the flow's wires carry two sine waves, one the other's mirror, standing still, with a trace running along them the way the power goes as fast as the dots did, and a new reading changes the pace without starting it again", async ({ page, request }) => {
  await page.goto("/home");
  const flow = page.locator('[data-card="energy"]');
  const wires = flow.locator("[data-flow-wire]");
  await expect(wires).toHaveCount(2);
  // The stub's house: 0.903 kW from the panels, 1.184 kW in use — the rest from the grid.
  await expect(wires.nth(0)).toHaveAttribute("data-flow-wire", "right");
  await expect(wires.nth(1)).toHaveAttribute("data-flow-wire", "left");
  // The card rises in scaled 0.98 as the splash goes: a wave measured during
  // it is short by as much (27.9px for 28.35 on GitHub's runners).
  await settled(page);

  /** A wire's wave as it is drawn, and its trace as it moves. */
  const read = (wire: ReturnType<typeof wires.nth>) =>
    wire.locator("[data-flow-wave]").evaluate((el) => {
      const cs = getComputedStyle(el);
      const trace = el.querySelector<HTMLElement>(":scope > [data-flow-trace]")!;
      const [animation] = trace.getAnimations();
      const frames = (animation.effect as KeyframeEffect).getKeyframes();
      const duration = Number(animation.effect!.getComputedTiming().duration);
      const left = () => trace.getBoundingClientRect().left;
      const was = { time: animation.currentTime, state: animation.playState };
      animation.pause();
      animation.currentTime = duration * 0.1;
      const early = left();
      animation.currentTime = duration * 0.6;
      const late = left();
      animation.currentTime = was.time;
      if (was.state === "running") animation.play();
      const wire = el.closest<HTMLElement>("[data-flow-wire]")!;
      const wireBox = wire.getBoundingClientRect();
      const picture = decodeURIComponent(cs.maskImage || cs.webkitMaskImage);
      return {
        root: parseFloat(getComputedStyle(document.documentElement).fontSize),
        // The wave itself: nothing of its own moves, and it is its wire's width.
        standing: el.getAnimations().length === 0,
        wide: el.getBoundingClientRect().width - wireBox.width,
        moved: [...new Set(frames.flatMap((f) => Object.keys(f)))].filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k)),
        seconds: duration / 1000,
        rate: animation.playbackRate,
        // How far the trace travels in half its loop, and which way.
        halfLoop: late - early,
        // One trace's stretch of the strip: its picture's tile.
        stretch: parseFloat(getComputedStyle(trace).backgroundSize),
        longer: trace.getBoundingClientRect().width - wireBox.width,
        length: parseFloat(cs.maskSize),
        repeat: cs.maskRepeat,
        picture,
        height: wireBox.height,
        node: el.closest("[data-card]")!.querySelector("[data-flow-node]")!.getBoundingClientRect().height,
        clipped: getComputedStyle(wire).overflow,
      };
    });
  const edge = (i: number) => flow.locator("[data-flow-node]").nth(i).evaluate((el) => getComputedStyle(el).borderTopColor);
  const colour = (wire: ReturnType<typeof wires.nth>) => wire.locator("[data-flow-wave]").evaluate((el) => getComputedStyle(el).backgroundColor);

  const solar = await read(wires.nth(0));
  const grid = await read(wires.nth(1));
  for (const wave of [solar, grid]) {
    // Sines, one wave after another along the wire: a picture of one
    // wave's length repeated, its lines the nodes' 2px at any size of type.
    expect(wave.picture).toContain("data:image/svg+xml");
    expect(wave.repeat).toBe("repeat-x");
    // Two of them: the house's two legs, the second the fainter.
    const legs = [...wave.picture.matchAll(/<path d='M([^']+)'([^>]*)\/>/g)].map(([, d, rest]) => ({
      points: d.split("L").map((point) => point.split(" ").map(Number)),
      faint: /stroke-opacity='0\.\d+'/.test(rest),
      line: rest,
    }));
    expect(legs.map((leg) => leg.faint)).toEqual([true, false]);
    for (const leg of legs) {
      expect(leg.line).toContain("stroke-width='2'");
      expect(leg.line).toContain("non-scaling-stroke");
    }
    // Each the other turned over about the wire's middle: where one is up, the other is as far down.
    const [faint, full] = legs.map((leg) => leg.points);
    expect(faint).toHaveLength(full.length);
    for (const [i, [x, y]] of full.entries()) {
      expect(faint[i][0]).toBe(x);
      expect(faint[i][1] + y).toBeCloseTo(24, 5);
    }
    // And a sine, drawn 40 long and 24 high: level at the ends of a wave's
    // length and at its middle, at its crest a quarter in and its trough
    // three quarters in — the line's own width inside the box's edges.
    const at = (x: number) => full.find(([px]) => px === x)![1];
    expect([at(0), at(20), at(40)]).toEqual([12, 12, 12]);
    expect(at(10)).toBe(1.5);
    expect(at(30)).toBe(22.5);
    // A wave is 2.5rem long and 1.5rem from crest to trough: more than
    // half a node's height (0.173.1, "Maybe make the waves taller. It feels
    // like DNA double helix at the current height" — it was 0.75rem high).
    expect(wave.length).toBeCloseTo(wave.root * 2.5, 1);
    expect(wave.height).toBeCloseTo(wave.root * 1.5, 1);
    expect(wave.height).toBeGreaterThan(wave.node / 2);
    expect(wave.height).toBeLessThan(wave.node);
    // The wave stands in place: no animation of its own, and as wide as its wire.
    expect(wave.standing).toBe(true);
    expect(wave.wide).toBeCloseTo(0, 0);
    // The trace is a strip a stretch of three waves longer than its wire,
    // which clips it, moved a stretch a loop: the loop has no join.
    expect(wave.stretch).toBeCloseTo(wave.length * 3, 0);
    expect(wave.longer).toBeCloseTo(wave.stretch, 0);
    expect(wave.clipped).toBe("hidden");
    // Moved by the compositor alone.
    expect(wave.moved).toEqual(["transform"]);
    expect(Math.abs(wave.halfLoop)).toBeCloseTo(wave.stretch / 2, 0);
    // As fast across the wire at 1 kW as the dots were: 12px in 0.6s at
    // the base type, a wave's 40px in 2s — its stretch of three in 6s.
    expect(wave.seconds).toBe(6);
    expect(wave.stretch / wave.root / wave.seconds).toBeCloseTo(12 / 16 / 0.6, 2);
  }
  // The way the power goes: out of the panels towards the house, and in from the grid towards it.
  expect(solar.halfLoop).toBeGreaterThan(0);
  expect(grid.halfLoop).toBeLessThan(0);
  // At the power's pace — under a kilowatt, the root of it: 0.903 kW, and 0.281 kW.
  expect(solar.rate).toBe(0.95);
  expect(grid.rate).toBe(0.53);
  // In the flow's colour: the panels' wire their node's yellow, and the
  // grid's wire what is taken from it — not the grid's own blue (0.176.0),
  // which is the same whichever way the power goes.
  const blue = await edge(2);
  expect(await colour(wires.nth(1))).not.toBe(blue);
  expect(await colour(wires.nth(0))).not.toBe(await colour(wires.nth(1)));

  // What is painted: the wave drawn faint where no trace is, and in its
  // full colour just behind a trace's head. The trace stopped with a head
  // at the wire's middle, then a picture of the wire read column by column.
  await splashGone(page);
  await flow.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(500);
  const rgb = (c: string) => c.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  const solarYellow = rgb(await edge(0));
  const ground = rgb(await flow.locator("[data-flow]").evaluate((el) => getComputedStyle(el.closest(".chakra-card__root")!).backgroundColor));
  /** How strongly the wire is drawn in a band of columns, 0 the card and 1 the full colour: the strongest pixel's share. */
  async function drawn(clip: { x: number; y: number; width: number; height: number }) {
    const png = (await page.screenshot({ clip })).toString("base64");
    return page.evaluate(
      async ({ png, wave, ground }) => {
        const image = new Image();
        image.src = `data:image/png;base64,${png}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        [canvas.width, canvas.height] = [image.width, image.height];
        const g = canvas.getContext("2d")!;
        g.drawImage(image, 0, 0);
        const { data } = g.getImageData(0, 0, image.width, image.height);
        const way = wave.map((c, i) => c - ground[i]);
        const whole = way.reduce((sum, c) => sum + c * c, 0);
        let most = 0;
        for (let i = 0; i < data.length; i += 4) {
          const from = [0, 1, 2].map((c) => data[i + c] - ground[c]);
          const along = from.reduce((sum, c, k) => sum + c * way[k], 0) / whole;
          if (Math.hypot(...from.map((c, k) => c - along * way[k])) < 30) most = Math.max(most, along);
        }
        return most;
      },
      { png, wave: solarYellow, ground },
    );
  }
  const head = await wires.nth(0).evaluate((wire) => {
    const trace = wire.querySelector<HTMLElement>("[data-flow-trace]")!;
    const [animation] = trace.getAnimations();
    const duration = Number(animation.effect!.getComputedTiming().duration);
    const stretch = parseFloat(getComputedStyle(trace).backgroundSize);
    const box = wire.getBoundingClientRect();
    const middle = box.left + box.width / 2;
    animation.pause();
    animation.currentTime = 0;
    // Moving right, each stretch's head is its right end: at the strip's left and whole stretches on.
    const start = trace.getBoundingClientRect().left;
    const share = (((middle - start) % stretch) + stretch) % stretch / stretch;
    animation.currentTime = share * duration;
    const now = trace.getBoundingClientRect().left;
    return { at: now + Math.round((middle - now) / stretch) * stretch, middle, top: box.top, height: box.height };
  });
  expect(head.at).toBeCloseTo(head.middle, 0);
  const band = (from: number) => ({ x: from, width: 0.3 * solar.root, y: head.top, height: head.height });
  // Just behind it, towards the panels: the wave in full.
  expect(await drawn(band(head.at - 0.6 * solar.root))).toBeGreaterThan(0.75);
  // Just ahead of it, towards the house: the wave is there, standing, but faint.
  const ahead = await drawn(band(head.at + 0.3 * solar.root));
  expect(ahead).toBeGreaterThan(0.15);
  expect(ahead).toBeLessThan(0.5);
  await wires.nth(0).evaluate((wire) => wire.querySelector("[data-flow-trace]")!.getAnimations()[0].play());

  // The sun comes out: 4 kW. From a kilowatt up the pace is in proportion
  // to the power (0.173.1, "Make the speeds faster fir the lines for higher
  // wattage"; the root of it until then, twice the base pace here): the
  // solar trace runs four times the base pace — the same animation, carrying
  // on from where it was, not a new one — and the grid's turns round, out
  // to the grid, in the export's green.
  const mark = (wire: ReturnType<typeof wires.nth>) =>
    wire.locator("[data-flow-trace]").evaluate((el) => Object.assign(el.getAnimations()[0], { marked: true }) && null);
  const marked = (wire: ReturnType<typeof wires.nth>) =>
    wire.locator("[data-flow-trace]").evaluate((el) => (el.getAnimations()[0] as Animation & { marked?: boolean }).marked === true);
  const taken = await colour(wires.nth(1));
  await mark(wires.nth(0));
  await stub(request, "/_stub/state", { entity_id: "sensor.envoy_482518016321_current_power_production", state: "4.0" });
  await expect(wires.nth(1)).toHaveAttribute("data-flow-wire", "right");
  await expect.poll(async () => (await read(wires.nth(0))).rate).toBe(4);
  expect(await marked(wires.nth(0))).toBe(true);
  const out = await read(wires.nth(1));
  expect(out.halfLoop).toBeGreaterThan(0);
  // 4 − 1.184 = 2.816 kW out: the slower of the two, by as much as it is less.
  expect(out.rate).toBe(2.82);
  expect(await edge(2)).toBe(blue);
  expect(await colour(wires.nth(1))).not.toBe(blue);
  expect(await colour(wires.nth(1))).not.toBe(taken);

  // Under reduced motion there is no trace: the wave stands drawn whole, in the flow's full colour.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(wires.nth(0).locator("[data-flow-trace]")).toBeHidden();
  await expect(wires.nth(0).locator("[data-flow-wave]")).toBeVisible();
  await expect(wires.nth(0).locator("[data-flow-wave]")).toHaveCSS("background-color", await edge(0));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // And back: the trace is a new animation, run at the power's pace again — not the 1 kW one.
  await expect.poll(async () => (await read(wires.nth(0))).rate).toBe(4);
  expect((await read(wires.nth(1))).rate).toBe(2.82);

  // Night: nothing from the panels. Their wire is a hairline with no wave on it.
  await stub(request, "/_stub/state", { entity_id: "sensor.envoy_482518016321_current_power_production", state: "0" });
  await expect(wires.nth(0)).toHaveAttribute("data-flow-wire", "idle");
  await expect(wires.nth(0).locator("[data-flow-wave]")).toHaveCount(0);
  expect((await wires.nth(0).boundingBox())!.height).toBeLessThan(2);
  await expect(wires.nth(1)).toHaveAttribute("data-flow-wire", "left");
});

// The user: "The speed should still change based on the amount of energy
// going through / Make the solar and sparks animations also scale up and
// down with production/consuption" — the rays at the pace of what the panels
// make, the grid's glow and sparks at the pace of what goes through the
// meter: lib/energy's flowPace, the root of the kilowatts. And all of it,
// the wires too, still at that pace once the card has been folded and opened
// again, when the browser makes its animations anew.
test("the light on the panels and the grid's sparks keep the pace of the power, and a folded card opened again keeps every pace", async ({ page, request }) => {
  const E = "sensor.envoy_482518016321";
  await page.goto("/home");
  const card = page.locator('[data-card="energy"]');
  const flow = card.locator("[data-flow]");
  /** Each part's animations' rates, and whether they are the ones marked earlier. */
  const paces = () =>
    flow.evaluate((el) => {
      const of = (selector: string) =>
        [...el.querySelectorAll(selector)].flatMap((part) => part.getAnimations()).map((a) => ({ rate: a.playbackRate, marked: (a as Animation & { marked?: boolean }).marked === true }));
      const rates = (selector: string) => [...new Set(of(selector).map((a) => a.rate))];
      return {
        rays: rates("[data-flow-ray]"),
        sparks: rates("[data-flow-glow], [data-flow-spark]"),
        wires: [...el.querySelectorAll("[data-flow-trace]")].map((t) => t.getAnimations()[0]?.playbackRate ?? null),
        counts: [of("[data-flow-ray]").length, of("[data-flow-glow], [data-flow-spark]").length],
        marked: of("[data-flow-ray], [data-flow-glow], [data-flow-spark]").every((a) => a.marked),
      };
    });
  const mark = () =>
    flow.evaluate((el) => {
      for (const part of el.querySelectorAll("[data-flow-ray], [data-flow-glow], [data-flow-spark]")) for (const a of part.getAnimations()) Object.assign(a, { marked: true });
    });

  // The stub's house: 0.903 kW from the panels, 0.281 kW in from the grid — both under a kilowatt, the root of it.
  await expect.poll(async () => (await paces()).rays).toEqual([0.95]);
  expect(await paces()).toMatchObject({ rays: [0.95], sparks: [0.53], wires: [0.95, 0.53], counts: [3, 7] });

  // The sun comes out: 4 kW, and 2.816 kW of it out to the grid. Faster
  // light, harder sparks — the same animations, carrying on, not new ones.
  await mark();
  await stub(request, "/_stub/state", { entity_id: `${E}_current_power_production`, state: "4.0" });
  await expect.poll(async () => (await paces()).rays).toEqual([2]);
  expect(await paces()).toMatchObject({ rays: [2], sparks: [1.68], wires: [4, 2.82], marked: true });

  // A cloud: 0.2 kW, and 0.984 kW back in from the grid. The light slows, the sparks pick up.
  await stub(request, "/_stub/state", { entity_id: `${E}_current_power_production`, state: "0.2" });
  await expect.poll(async () => (await paces()).rays).toEqual([0.45]);
  expect(await paces()).toMatchObject({ rays: [0.45], sparks: [0.99], wires: [0.45, 0.99] });

  // Folded and opened again: every animation in the card is a new one, and each runs at its power's pace.
  // The header's title, named with what the header says ("Energy Solar covered 69% …").
  const title = card.getByRole("button", { name: /^Energy/ });
  await title.click();
  await expect(flow).toBeHidden();
  await title.click();
  await expect(flow).toBeVisible();
  await expect.poll(async () => (await paces()).wires).toEqual([0.45, 0.99]);
  expect(await paces()).toMatchObject({ rays: [0.45], sparks: [0.99], counts: [3, 7], marked: false });
});

// 0.173.2, the user, with a screenshot of the waves cut off square a gap
// short of each circle: "The animation is currently clipped behind paddi g
// it looks like. It should go behind the circles".
test("a wire's waves come out from behind one circle and go in behind the next, with no gap and nothing showing through", async ({ page, request }) => {
  await page.goto("/home");
  const flow = page.locator('[data-card="energy"] [data-flow]');
  await expect(flow.locator("[data-flow-wave]")).toHaveCount(2);
  // Once the page is all there — the launch splash off it, on the screen
  // (a phone's Home scrolls), its scale-in over and nothing moving — and
  // standing still, so a picture of them can be read where they were measured.
  await splashGone(page);
  // The screen's middle: in view alone can be under a phone's bottom bar,
  // which is drawn over the page (as it was once the weather card above
  // grew a line, 0.176.0), and a picture of the wire is then of the bar.
  await flow.evaluate((el) => el.scrollIntoView({ block: "center" }));
  for (let last = ""; ; ) {
    const now = JSON.stringify(await flow.boundingBox());
    if (now === last) break;
    last = now;
    await page.waitForTimeout(250);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(flow.locator("[data-flow-trace]").first()).toBeHidden();

  const drawn = await flow.evaluate((grid) => {
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, middle: r.left + r.width / 2, level: r.top + r.height / 2, across: r.width };
    };
    const mask = (el: Element) => {
      const cs = getComputedStyle(el);
      return cs.maskImage || cs.webkitMaskImage;
    };
    const nodes = [...grid.querySelectorAll("[data-flow-node]")];
    const wires = [...grid.querySelectorAll("[data-flow-wire]")];
    return {
      apart: getComputedStyle(grid).isolation,
      nodes: nodes.map((node) => ({ ...box(node), over: getComputedStyle(node).zIndex })),
      wires: wires.map((wire) => ({
        ...box(wire),
        // The circle cut out of each end: one on the wire's box, one on the box inside it.
        cuts: [mask(wire), mask(wire.firstElementChild!)],
        colour: getComputedStyle(wire.querySelector("[data-flow-wave]")!).backgroundColor,
      })),
      // What the diagram is drawn on: its card.
      ground: getComputedStyle(grid.closest(".chakra-card__root")!).backgroundColor,
    };
  });

  // The nodes lie over the wires' ends, among themselves alone.
  expect(drawn.apart).toBe("isolate");
  expect(drawn.nodes.map((node) => node.over)).toEqual(["1", "1", "1"]);
  for (const [i, wire] of drawn.wires.entries()) {
    const [from, to] = [drawn.nodes[i], drawn.nodes[i + 1]];
    // A wire's box runs from the middle of one node to the middle of the
    // next, level with them — not from a gap past one to a gap short of the other.
    expect(wire.left).toBeCloseTo(from.middle, 0);
    expect(wire.right).toBeCloseTo(to.middle, 0);
    expect(wire.level).toBeCloseTo(from.level, 0);
    // And each node's circle is cut out of its end: nothing inside the
    // circle, the cut under the node's 2px edge.
    const radius = from.across / 2;
    const cut = (gradient: string) => {
      const [, at, clear, full] = /^radial-gradient\(circle at (\d+%) 50%, rgba\(0, 0, 0, 0\) ([\d.]+)px, rgb\(0, 0, 0\) ([\d.]+)px\)$/.exec(gradient)!;
      return { at, clear: Number(clear), full: Number(full) };
    };
    const [left, right] = wire.cuts.map(cut);
    expect([left.at, right.at]).toEqual(["0%", "100%"]);
    for (const end of [left, right]) {
      expect(end.clear).toBeGreaterThan(radius - 2);
      expect(end.full).toBeLessThan(radius);
      expect(end.full).toBeGreaterThan(end.clear);
    }
  }

  // What is painted. How many pixels of a strip are a wave's colour — more
  // than half way from the card's to the wave's, on the line between the
  // two: a thin line's pixels are a blend of both.
  /** `[r, g, b]` of "rgb(r, g, b)". */
  const rgb = (colour: string) => colour.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  async function painted(clip: { x: number; y: number; width: number; height: number }, colour: string) {
    const png = (await page.screenshot({ clip })).toString("base64");
    return page.evaluate(
      async ({ png, wave, ground }) => {
        const image = new Image();
        image.src = `data:image/png;base64,${png}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const g = canvas.getContext("2d")!;
        g.drawImage(image, 0, 0);
        const { data } = g.getImageData(0, 0, image.width, image.height);
        const way = wave.map((c, i) => c - ground[i]);
        const whole = way.reduce((sum, c) => sum + c * c, 0);
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const from = [0, 1, 2].map((c) => data[i + c] - ground[c]);
          // How far along from the card's colour to the wave's, and how far off that line.
          const along = from.reduce((sum, c, k) => sum + c * way[k], 0) / whole;
          const off = Math.hypot(...from.map((c, k) => c - along * way[k]));
          if (along > 0.5 && off < 30) count += 1;
        }
        return count;
      },
      { png, wave: rgb(colour), ground: rgb(drawn.ground) },
    );
  }
  const [solar, home] = drawn.nodes;
  const [first] = drawn.wires;
  const tall = { y: first.top, height: first.bottom - first.top };
  // Right beside a circle — bare card until now, for the gap and more
  // between it and where the wave began — the wave is drawn: at both ends
  // of the wire.
  const beside = 4;
  expect(await painted({ x: solar.right + 1, width: beside, ...tall }, first.colour)).toBeGreaterThan(0);
  expect(await painted({ x: home.left - 1 - beside, width: beside, ...tall }, first.colour)).toBeGreaterThan(0);
  // Inside the circle it runs in behind, none of it: a node's fill is a
  // tint, and a wave under it would show through. (The house's circle,
  // inside its ring and clear of its glyph — both the wave's yellow on a
  // day the panels haven't covered — where the disc itself is grey.)
  expect(await painted({ x: home.left + 4, width: 5, y: home.level - 4, height: 8 }, first.colour)).toBe(0);

  // A wire with nothing on it — the panels' at night — is a hairline from
  // the one circle's edge to the other's: it stopped short of both, too.
  await stub(request, "/_stub/state", { entity_id: "sensor.envoy_482518016321_current_power_production", state: "0" });
  const idle = flow.locator('[data-flow-wire="idle"]');
  await expect(idle).toHaveCount(1);
  const line = (await idle.boundingBox())!;
  expect(line.x).toBeCloseTo(solar.right, 0);
  expect(line.x + line.width).toBeCloseTo(home.left, 0);
  expect(line.y + line.height / 2).toBeCloseTo(solar.level, 0);
});

