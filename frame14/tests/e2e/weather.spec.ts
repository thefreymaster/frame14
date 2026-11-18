import { expect, test, type Locator, type Page } from "@playwright/test";
import { pageErrors, resetStub } from "./helpers";

// 0.174.0, the user, of the Weather sheet: "These two should be concave also
// like the forecast" — the conditions and the hours' chart — "Add another
// concave area that has the current moon phase with an icon". The Now card's
// conditions and its moon, and the chart, are wells (how they are drawn, by
// theme, is embossed.spec's); this is what is in them and where they lie.
// The moon is the date's (lib/moon: Apple Weather, as Home Assistant passes
// it on, says nothing of it), so the browser's clock is fixed — only Date;
// the page's timers run.
test.use({ timezoneId: "America/New_York" });
/** The evening of the first quarter of November 17 2026 (11:48 UTC), a week before the full moon. */
const FIRST_QUARTER = new Date("2026-11-17T15:05:00-05:00");
/** Four days after November 24's full moon, eleven before December 8's new one. */
const WANING = new Date("2026-11-28T07:00:00-05:00");

const well = (scope: { locator(selector: string): Locator }, name: string) => scope.locator(`[data-weather-well="${name}"]`);

/** Where the moon's icon is lit: the middle of its filled part, as a share of the icon's width from its left. */
const litAt = (moon: Locator) =>
  moon.locator("[data-moon-icon]").evaluate((svg) => {
    const box = svg.getBoundingClientRect();
    const lit = svg.querySelector("path")!.getBoundingClientRect();
    return (lit.left + lit.width / 2 - box.left) / box.width;
  });

test.describe("the weather's Now card", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test("has the conditions in one well and the moon as it stands that day in another", async ({ page }) => {
    const errors = pageErrors(page);
    await page.clock.setFixedTime(FIRST_QUARTER);
    await page.goto("/weather");

    const conditions = well(page, "conditions");
    await expect(conditions).toBeVisible();
    // The stub's weather: every figure the entity reports, and nothing else.
    for (const label of ["Feels like", "Humidity", "Wind", "Pressure", "Visibility", "UV index"]) {
      await expect(conditions.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(conditions.getByText("29.75 inHg")).toBeVisible();

    const moon = well(page, "moon");
    await expect(moon).toBeVisible();
    await expect(moon).toHaveAttribute("data-moon", "first-quarter");
    await expect(moon.getByText("Moon", { exact: true })).toBeVisible();
    await expect(moon.getByText("First quarter")).toBeVisible();
    await expect(moon.getByText("53% lit · Full moon Nov 24")).toBeVisible();
    // Drawn half lit, at the right: the filled part is the disc's right half.
    const icon = moon.locator("[data-moon-icon]");
    await expect(icon).toBeVisible();
    const lit = await icon.evaluate((svg) => {
      const box = svg.getBoundingClientRect();
      const part = svg.querySelector("path")!.getBoundingClientRect();
      return { from: (part.left - box.left) / box.width, to: (part.right - box.left) / box.width, tall: part.height / box.height };
    });
    expect(lit.from).toBeGreaterThan(0.4);
    expect(lit.from).toBeLessThan(0.5);
    expect(lit.to).toBeGreaterThan(0.85);
    expect(lit.tall).toBeGreaterThan(0.75);

    // Days later it is on the wane: lit at the left, and looking to the new moon.
    await page.clock.setFixedTime(WANING);
    await page.reload();
    await expect(moon).toHaveAttribute("data-moon", "waning-gibbous");
    await expect(moon.getByText("Waning gibbous")).toBeVisible();
    await expect(moon.getByText("80% lit · New moon Dec 8")).toBeVisible();
    expect(await litAt(moon)).toBeLessThan(0.5);
    expect(errors).toEqual([]);
  });

  test("lies as the screen has room: a column, or on a desktop a band with the moon under the hero", async ({ page, isMobile }) => {
    await page.clock.setFixedTime(FIRST_QUARTER);
    await page.goto("/weather");
    const now = page.locator(".chakra-card__root").filter({ has: well(page, "moon") }).first();
    const box = async (part: Locator) => {
      await expect(part).toBeVisible();
      return (await part.boundingBox())!;
    };
    // The card has come in (PageTransition's scale-in draws every box short).
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null))));
    const hero = await box(now.getByText("Cloudy", { exact: true }));
    const conditions = await box(well(now, "conditions"));
    const moon = await box(well(now, "moon"));

    if (isMobile) {
      // A phone: the hero, the conditions, the moon, each the card's width.
      expect(conditions.y).toBeGreaterThan(hero.y + hero.height);
      expect(moon.y).toBeGreaterThanOrEqual(conditions.y + conditions.height);
      expect(Math.abs(moon.x - conditions.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(moon.width - conditions.width)).toBeLessThanOrEqual(1);
      return;
    }

    // A desktop at 1920: the moon under the hero at the left, the
    // conditions at the right, a well as tall as the two.
    expect(moon.y).toBeGreaterThan(hero.y + hero.height);
    expect(conditions.x).toBeGreaterThan(moon.x + moon.width);
    expect(conditions.x).toBeGreaterThan(hero.x + hero.width);
    // From the hero's top (its words are part-way down it) to the moon's foot.
    expect(conditions.y).toBeLessThan(hero.y);
    expect(Math.abs(conditions.y + conditions.height - (moon.y + moon.height))).toBeLessThanOrEqual(1);

    // A small window has no room for the band: a column, as a phone's.
    // (The page takes a moment to lay itself out again in the new window.)
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect.poll(async () => Math.abs((await box(well(now, "moon"))).x - (await box(well(now, "conditions"))).x)).toBeLessThanOrEqual(1);
    const narrow = { conditions: await box(well(now, "conditions")), moon: await box(well(now, "moon")) };
    expect(narrow.moon.y).toBeGreaterThanOrEqual(narrow.conditions.y + narrow.conditions.height);
    expect(Math.abs(narrow.moon.x - narrow.conditions.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(narrow.moon.width - narrow.conditions.width)).toBeLessThanOrEqual(1);
  });

  test("the hours' chart is in a well of its own over the strip of hours", async ({ page }) => {
    await page.goto("/weather/hourly");
    const chart = well(page, "chart");
    await expect(chart).toBeVisible();
    await expect(chart.getByText(/^Next 24 hours · high \d+° .+ · low \d+° .+$/)).toBeVisible();
    await expect(chart.locator("svg path")).toBeVisible();
    const hours = page.locator('[data-forecast="hourly"]');
    await expect(hours).toBeVisible();
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null))));
    const above = (await chart.boundingBox())!;
    const below = (await hours.boundingBox())!;
    expect(below.y).toBeGreaterThan(above.y + above.height);
    expect(Math.abs(below.x - above.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(below.width - above.width)).toBeLessThanOrEqual(1);
    // The strip is no part of the chart's well, nor the chart of the strip's.
    await expect(chart.locator("[data-forecast]")).toHaveCount(0);
    await expect(hours.locator("[data-weather-well]")).toHaveCount(0);
  });
});

// 0.176.0, the user: "Add the moon phase to the weather card on the home
// page". Home's first card — a phone's weather row, a desktop's Weather
// card, the frame's time and weather — has the moon in a line under the
// weather now: what the Now card's well says, from the same date.
test.describe("Home's weather card", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  /** The card's moon line, and that it lies inside its card under the weather now. */
  async function moonLine(page: Page) {
    const card = page.locator('[data-card="header"]');
    const line = card.locator("[data-moon-line]");
    await expect(line).toBeVisible();
    const [box, around] = [(await line.boundingBox())!, (await card.boundingBox())!];
    expect(box.x).toBeGreaterThanOrEqual(around.x);
    expect(box.x + box.width).toBeLessThanOrEqual(around.x + around.width);
    expect(box.y + box.height).toBeLessThanOrEqual(around.y + around.height);
    // One line: the icon, the name and the rest side by side — at any size
    // of type (the frame's is 28px), a line of it and not two.
    const root = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    expect(box.height).toBeLessThan(root * 2.2);
    return line;
  }

  test("has the moon as it stands that day in a line, on a phone and on a desktop", async ({ page, isMobile }) => {
    const errors = pageErrors(page);
    await page.clock.setFixedTime(FIRST_QUARTER);
    await page.goto("/home");
    const line = await moonLine(page);
    await expect(line).toHaveAttribute("data-moon-line", "first-quarter");
    await expect(line.getByText("First quarter")).toBeVisible();
    await expect(line.getByText("53% lit · Full moon Nov 24")).toBeVisible();
    await expect(line).toHaveAccessibleName("Moon: First quarter, 53% lit · Full moon Nov 24");
    // Drawn as it stands: lit at the right while it grows.
    await expect(line.locator("[data-moon-icon]")).toHaveAttribute("data-lit-side", "right");
    expect(await litAt(line)).toBeGreaterThan(0.5);
    // Under the temperature, which is the card's first line.
    const temperature = page.locator('[data-card="header"]').getByText(/^\d+°$/).first();
    expect((await line.boundingBox())!.y).toBeGreaterThan((await temperature.boundingBox())!.y);

    // A tap on the card still opens the Weather sheet, whose well says the same.
    await page.getByRole("button", { name: "Show the weather" }).click({ position: { x: 60, y: 40 } });
    const sheet = page.getByRole("dialog", { name: "Weather" });
    await expect(well(sheet, "moon")).toHaveAttribute("data-moon", "first-quarter");
    await expect(well(sheet, "moon").getByText("53% lit · Full moon Nov 24")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    // Days later it is on the wane: lit at the left, and looking to the new moon.
    await page.clock.setFixedTime(WANING);
    await page.reload();
    const later = await moonLine(page);
    await expect(later).toHaveAttribute("data-moon-line", "waning-gibbous");
    await expect(later.getByText("80% lit · New moon Dec 8")).toBeVisible();
    expect(await litAt(later)).toBeLessThan(0.5);
    // A phone's card is the narrowest it is drawn in: the name whole, the rest on the line with it.
    if (isMobile) await expect(later.getByText("Waning gibbous")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test.describe("on the frame", () => {
    test.use({
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; NXTPAPER 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      viewport: { width: 1600, height: 2400 },
    });

    test("has it under the clock and the temperature", async ({ page }) => {
      test.skip(test.info().project.name !== "desktop", "one run is enough; the phone project is the phone");
      await page.addInitScript(() => localStorage.setItem("device-mode", "frame"));
      await page.clock.setFixedTime(FIRST_QUARTER);
      await page.goto("/home");
      const line = await moonLine(page);
      await expect(line).toHaveAttribute("data-moon-line", "first-quarter");
      await expect(line.getByText("53% lit · Full moon Nov 24")).toBeVisible();
      // The frame's card: the date over the clock, the moon under both.
      const card = page.locator('[data-card="header"]');
      await expect(card).toContainText(/^\w+day, \w+ \d{1,2}/);
      const clock = card.getByText("pm", { exact: true }).or(card.getByText("am", { exact: true }));
      expect((await line.boundingBox())!.y).toBeGreaterThan((await clock.first().boundingBox())!.y);
    });
  });
});
