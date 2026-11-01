import { expect, test, type Page } from "@playwright/test";
import { pageErrors, resetStub, splashGone, stub } from "./helpers";

test.beforeEach(async ({ request }) => {
  await resetStub(request);
});

test("the home page comes up with live cards and no errors", async ({ page }) => {
  const errors = pageErrors(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/home$/);

  // The header, the climate card's tiles (named by climate_names, read live
  // from the stub), the energy card's figure.
  await expect(page.getByText("Frame14").first()).toBeVisible();
  await expect(page.getByText("1st Floor AC")).toBeVisible();
  await expect(page.getByText("Heating to 70°")).toBeVisible();
  await expect(page.getByText("Cooling to 72°")).toBeVisible();
  await expect(page.getByText("Solar covered today")).toBeVisible();
  // Beside the titles, in grey like Calendar's count (0.131): who's playing,
  // and the rooms' temperatures, coolest to warmest.
  await expect(page.getByText("FSU vs MIA", { exact: true })).toBeVisible();
  await expect(page.getByText("64–75°", { exact: true })).toBeVisible();

  expect(errors).toEqual([]);
});

test("the 3D printer card shows the job, its status and progress, follows a pause, and opens the Printer page", async ({ page, request }) => {
  await page.goto("/home");
  // The stub's A1 is printing a Benchy: 63%, 1.4 h to go, layer 142 of 226.
  const card = page.locator('[data-card="printer"]');
  await expect(card.getByRole("heading", { name: "3D printer" })).toBeVisible();
  await expect(card.getByText("Printing")).toBeVisible();
  await expect(card.getByText("1h 24m left")).toBeVisible();
  await expect(card.getByText("Benchy_0.2mm_PLA")).toBeVisible();
  await expect(card.getByText(/^Layer 142 of 226 · finishes \d+:\d\d/)).toBeVisible();
  await expect(card.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "63");
  await expect(card.locator('img[src^="/api/printer/cover"]')).toBeVisible();

  await stub(request, "/_stub/state", {
    entity_id: "sensor.a1_03919c442700723_print_status",
    state: "pause",
  });
  await expect(card.getByText("Paused")).toBeVisible();
  await expect(card.getByText("Layer 142 of 226", { exact: true })).toBeVisible();

  await card.getByRole("button", { name: "Open the printer page" }).click();
  await expect(page).toHaveURL(/\/printer$/);
});

test("the navigation reaches every main page", async ({ page }) => {
  await page.goto("/home");
  for (const [label, path] of [
    ["Lights", "/lights"],
    ["Climate", "/climate"],
    ["Settings", "/control"],
  ] as const) {
    await page.getByRole("tab", { name: label }).first().click();
    // A page with tabs lands on its first one (0.138): /control/views on a phone.
    await expect(page).toHaveURL(new RegExp(`${path}(/[a-z]+)?$`));
  }
});

type CardBox = { id: string; left: number; right: number; top: number; bottom: number };

/** Every card on the page and its box, in the grid's own pixels. */
const cardBoxes = (page: Page): Promise<CardBox[]> =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".home-card")]
      .filter((el) => el.offsetHeight > 0)
      .map((el) => ({
        id: el.dataset.card ?? "",
        left: el.offsetLeft,
        right: el.offsetLeft + el.offsetWidth,
        top: el.offsetTop,
        bottom: el.offsetTop + el.offsetHeight,
      })),
  );

/** The cards' boxes once nothing has moved for a moment (a collapse animates). */
async function settledCardBoxes(page: Page) {
  let last = await cardBoxes(page);
  for (;;) {
    await page.waitForTimeout(250);
    const next = await cardBoxes(page);
    if (JSON.stringify(next) === JSON.stringify(last)) return next;
    last = next;
  }
}

test("collapsing a card keeps every card in its column and moves only the cards under it", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByText("Heating to 70°")).toBeVisible();
  await expect(page.getByText("Solar covered today")).toBeVisible();
  const before = await settledCardBoxes(page);
  const climate = before.find((b) => b.id === "climate");
  if (!climate) throw new Error("no climate card on the page");

  // The card's title is its collapse trigger; its name carries the rooms'
  // temperature range after the title (0.131).
  await page.getByRole("button", { name: /^Climate\b/ }).first().click();
  await expect(page.getByText("Heating to 70°")).toBeHidden();
  const after = await settledCardBoxes(page);

  // The same cards, each in the column it was in.
  expect(after.map((b) => [b.id, b.left, b.right])).toEqual(
    before.map((b) => [b.id, b.left, b.right]),
  );
  const collapsed = after.find((b) => b.id === "climate")!;
  const shorter = climate.bottom - climate.top - (collapsed.bottom - collapsed.top);
  expect(shorter).toBeGreaterThan(0);

  for (const was of before) {
    const now = after.find((b) => b.id === was.id)!;
    const below = was.top >= climate.bottom;
    const within = was.left >= climate.left && was.right <= climate.right;
    const beside = was.right <= climate.left || was.left >= climate.right;
    if (below && within) {
      // Directly under it, in its columns: up by what the card lost (the
      // grid's 2px rows round it).
      expect(Math.abs(was.top - now.top - shorter)).toBeLessThanOrEqual(2);
    } else if (!below || beside) {
      // Above it, or in other columns: where it was. (No card here is wider
      // than its columns; one under both columns could carry its own up.)
      expect(now.top).toBe(was.top);
    } else {
      expect(now.top).toBeLessThanOrEqual(was.top);
    }
  }
});

test("a card casts the drop shadow the side navigation does", async ({ page, isMobile }) => {
  test.skip(isMobile, "a phone has the bottom bar, not the rail");
  await page.goto("/home");
  await expect(page.getByText("Solar covered today")).toBeVisible();
  const shadows = await page.evaluate(() => {
    const shadowOf = (el: Element | null) => el && getComputedStyle(el).boxShadow;
    return {
      rail: shadowOf(document.querySelector('[data-nav="rail"]')),
      card: shadowOf(document.querySelector('[data-card="energy"] > .home-card-body > *')),
    };
  });
  // Chromium reports it in color(srgb …) form; it is a shadow, and the same one.
  expect(shadows.rail).not.toBe("none");
  expect(shadows.card).toBe(shadows.rail);
});

// 0.139: the order a drag left is the order saved. The drop fired before
// React had committed the last move, so a card dragged across in one move
// showed in its new place and was saved in its old one — Done put it back.
test("a card dragged while arranging stays where it was dropped, through Done and a reload", async ({ page, isMobile }) => {
  test.skip(isMobile, "a phone's one column has no sideways drag");
  await page.goto("/home");
  const slots = page.locator("[data-card]");
  await expect(slots.first()).toBeVisible();
  // The mouse, unlike a click, doesn't wait for the launch splash to leave.
  await splashGone(page);
  const order = () => slots.evaluateAll((els) => els.filter((el) => (el as HTMLElement).offsetHeight > 0).map((el) => el.getAttribute("data-card")));
  const before = await order();
  expect(before.length).toBeGreaterThan(2);
  const [first, second] = before;
  // While arranging, cards with nothing to show stand in too; the order of
  // the cards that were on the page is what's compared.
  const placed = async () => (await order()).filter((id) => before.includes(id));
  const a = page.locator(`[data-card="${first}"]`);
  const b = page.locator(`[data-card="${second}"]`);
  // Press and hold enters arranging.
  const ab = (await a.boundingBox())!;
  await page.mouse.move(ab.x + ab.width / 2, ab.y + 40);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
  // One drag: the first card onto the second, in one move.
  const bb = (await b.boundingBox())!;
  await page.mouse.move(ab.x + ab.width / 2, ab.y + 40);
  await page.mouse.down();
  await page.mouse.move(ab.x + ab.width / 2 + 10, ab.y + 40);
  await page.mouse.move(bb.x + bb.width / 2, bb.y + 40, { steps: 3 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect.poll(placed).toEqual([second, first, ...before.slice(2)]);
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("button", { name: "Done" })).toHaveCount(0);
  expect(await placed()).toEqual([second, first, ...before.slice(2)]);
  await page.reload();
  await expect(slots.first()).toBeVisible();
  await expect.poll(placed).toEqual([second, first, ...before.slice(2)]);
  // Back as it was, for the specs after this one.
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("home-layout:")) localStorage.removeItem(k); });
});
