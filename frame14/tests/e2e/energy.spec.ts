import { expect, test } from "@playwright/test";
import { resetStub, stub } from "./helpers";

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

// 0.142: the Home card's dialog has the page's tabs under its Now section —
// Solar, today's curve and totals as before, and Circuits, the per-circuit
// draw. It opens on Solar.
test("the Home card's dialog has a Circuits tab with the per-circuit draw, under Now", async ({ page }) => {
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
  const solar = dialog.getByRole("tab", { name: "Solar" });
  const circuits = dialog.getByRole("tab", { name: "Circuits" });
  await expect(solar).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByText("Solar produced")).toBeVisible();

  await circuits.click();
  await expect(circuits).toHaveAttribute("aria-selected", "true");
  // The house's draw in the title (the stub's main, 1220 W), the circuits
  // by name with the unmonitored rest last, a drawing one's bar flowing.
  await expect(dialog.getByRole("heading", { name: "Circuits · 1.2 kW" })).toBeVisible();
  await expect(dialog.getByText("Heat Pump 1")).toBeVisible();
  await expect(dialog.getByText("Other", { exact: true })).toBeVisible();
  await expect(dialog.locator("[data-part=range][data-flowing]").first()).toBeVisible();
  await expect(dialog.getByText("Solar produced")).toBeHidden();
  // Now stays above the tabs.
  await expect(dialog.getByRole("heading", { name: "Now" })).toBeVisible();

  await solar.click();
  await expect(dialog.getByText("Solar produced")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
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
// 12px, moved a pitch in 0.6s at 1 kW.
test("the flow's wires carry two sine waves, one the other's mirror, travelling the way the power goes as fast as the dots did, and a new reading changes the pace without starting them again", async ({ page, request }) => {
  await page.goto("/home");
  const flow = page.locator('[data-card="energy"]');
  const wires = flow.locator("[data-flow-wire]");
  await expect(wires).toHaveCount(2);
  // The stub's house: 0.903 kW from the panels, 1.184 kW in use — the rest from the grid.
  await expect(wires.nth(0)).toHaveAttribute("data-flow-wire", "right");
  await expect(wires.nth(1)).toHaveAttribute("data-flow-wire", "left");

  /** A wire's wave as it is drawn and as it moves. */
  const read = (wire: ReturnType<typeof wires.nth>) =>
    wire.locator("[data-flow-wave]").evaluate((el) => {
      const cs = getComputedStyle(el);
      const [animation] = el.getAnimations();
      const frames = (animation.effect as KeyframeEffect).getKeyframes();
      const duration = Number(animation.effect!.getComputedTiming().duration);
      const left = () => el.getBoundingClientRect().left;
      const was = { time: animation.currentTime, state: animation.playState };
      animation.pause();
      animation.currentTime = duration * 0.1;
      const early = left();
      animation.currentTime = duration * 0.6;
      const late = left();
      animation.currentTime = was.time;
      if (was.state === "running") animation.play();
      const wireBox = el.parentElement!.getBoundingClientRect();
      const picture = decodeURIComponent(cs.maskImage || cs.webkitMaskImage);
      return {
        root: parseFloat(getComputedStyle(document.documentElement).fontSize),
        moved: [...new Set(frames.flatMap((f) => Object.keys(f)))].filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k)),
        seconds: duration / 1000,
        rate: animation.playbackRate,
        // How far it travels in half its loop, and which way.
        halfLoop: late - early,
        length: parseFloat(cs.maskSize),
        repeat: cs.maskRepeat,
        picture,
        colour: cs.backgroundColor,
        longer: el.getBoundingClientRect().width - wireBox.width,
        height: wireBox.height,
        clipped: getComputedStyle(el.parentElement!).overflow,
        still: cs.animationName === "none",
      };
    });
  const edge = (i: number) => flow.locator("[data-flow-node]").nth(i).evaluate((el) => getComputedStyle(el).borderTopColor);

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
      expect(faint[i][1] + y).toBeCloseTo(12, 5);
    }
    // And a sine: level at the ends of a wave's length and at its middle,
    // at its crest a quarter in and its trough three quarters in.
    const at = (x: number) => full.find(([px]) => px === x)![1];
    expect([at(0), at(12), at(24)]).toEqual([6, 6, 6]);
    expect(at(6)).toBe(2.5);
    expect(at(18)).toBe(9.5);
    // A wave is 1.5rem long and half as high.
    expect(wave.length).toBeCloseTo(wave.root * 1.5, 1);
    expect(wave.height).toBeCloseTo(wave.root * 0.75, 1);
    // The strip is a wave longer than its wire, which clips it: the loop has no join.
    expect(wave.longer).toBeCloseTo(wave.length, 0);
    expect(wave.clipped).toBe("hidden");
    // Moved by the compositor alone, its own length a loop.
    expect(wave.moved).toEqual(["transform"]);
    expect(Math.abs(wave.halfLoop)).toBeCloseTo(wave.length / 2, 0);
    // As fast across the wire as the dots were: 12px in 0.6s at the base
    // type, a wave's 24px in 1.2s.
    expect(wave.seconds).toBe(1.2);
    expect(wave.length / wave.root / wave.seconds).toBeCloseTo(12 / 16 / 0.6, 2);
  }
  // The way the power goes: out of the panels towards the house, and in from the grid towards it.
  expect(solar.halfLoop).toBeGreaterThan(0);
  expect(grid.halfLoop).toBeLessThan(0);
  // At the power's pace, the root of its kilowatts: 0.903 kW, and 0.281 kW.
  expect(solar.rate).toBe(0.95);
  expect(grid.rate).toBe(0.53);
  // In the flow's colour: each node's own.
  expect(solar.colour).toBe(await edge(0));
  expect(grid.colour).toBe(await edge(2));
  expect(solar.colour).not.toBe(grid.colour);

  // The sun comes out: 4 kW. The solar wave runs twice the base pace — the
  // same animation, carrying on from where it was, not a new one — and the
  // grid's turns round, out to the grid, in the export's green.
  const mark = (wire: ReturnType<typeof wires.nth>) =>
    wire.locator("[data-flow-wave]").evaluate((el) => Object.assign(el.getAnimations()[0], { marked: true }) && null);
  const marked = (wire: ReturnType<typeof wires.nth>) =>
    wire.locator("[data-flow-wave]").evaluate((el) => (el.getAnimations()[0] as Animation & { marked?: boolean }).marked === true);
  await mark(wires.nth(0));
  await stub(request, "/_stub/state", { entity_id: "sensor.envoy_482518016321_current_power_production", state: "4.0" });
  await expect(wires.nth(1)).toHaveAttribute("data-flow-wire", "right");
  await expect.poll(async () => (await read(wires.nth(0))).rate).toBe(2);
  expect(await marked(wires.nth(0))).toBe(true);
  const out = await read(wires.nth(1));
  expect(out.halfLoop).toBeGreaterThan(0);
  // 4 − 1.184 = 2.816 kW out.
  expect(out.rate).toBe(1.68);
  expect(out.colour).toBe(await edge(2));
  expect(out.colour).not.toBe(grid.colour);

  // Under reduced motion the wave stands: drawn, and still.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(wires.nth(0).locator("[data-flow-wave]")).toHaveCSS("animation-name", "none");
  await expect(wires.nth(0).locator("[data-flow-wave]")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });

  // Night: nothing from the panels. Their wire is a hairline with no wave on it.
  await stub(request, "/_stub/state", { entity_id: "sensor.envoy_482518016321_current_power_production", state: "0" });
  await expect(wires.nth(0)).toHaveAttribute("data-flow-wire", "idle");
  await expect(wires.nth(0).locator("[data-flow-wave]")).toHaveCount(0);
  expect((await wires.nth(0).boundingBox())!.height).toBeLessThan(2);
  await expect(wires.nth(1)).toHaveAttribute("data-flow-wire", "left");
});

