import { expect, test } from "@playwright/test";
import { resetStub } from "./helpers";

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
  await page.getByRole("button", { name: "Show energy detail" }).click();
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
