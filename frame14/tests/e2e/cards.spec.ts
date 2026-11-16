import { expect, test } from "@playwright/test";
import { resetStub, splashGone } from "./helpers";

// Every card with a title has an icon beside it (0.127): the title's row —
// SectionTitle's HStack — holds an svg. A heading inside a card's body (Today
// and Tomorrow in the calendar card, Next hours in the forecast's) is a
// section of the card, not its title, so only the headers are looked at.
// Inactive tabs' cards (Weather's, a phone's Settings) are in the DOM too.
const PAGES = [
  "/home",
  "/lights",
  "/climate",
  "/energy",
  "/energy/circuits",
  "/weather",
  "/weather/daily",
  "/printer",
  "/vacuum",
  "/cameras",
  "/unraid",
  "/calendar",
  "/speedtest",
  "/control",
];

test("every titled card has an icon", async ({ page, request }) => {
  await resetStub(request);
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.locator(".chakra-card__header h2").first()).toBeVisible();
    // The cards that arrive with their data (the printer's camera, a vacuum).
    await page.waitForTimeout(1500);
    const bare = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".chakra-card__header h2")]
        .filter((h) => !h.parentElement?.querySelector("svg"))
        .map((h) => h.textContent),
    );
    expect(bare, `${path}: titles without an icon`).toEqual([]);
  }
});

// A collapsible card's header is one tap target from end to end (Board: the
// title's button stretched over it). Collapsed, the arrow at its far end is
// turned, and a turned element paints over that stretch: a tap on the arrow
// itself opened nothing until 0.170.0.
test("a card folds and opens again from a tap on its arrow", async ({ page, request }) => {
  await resetStub(request);
  await page.goto("/lights");
  const card = page
    .locator(".chakra-card__root")
    .filter({ has: page.getByRole("heading", { name: "Living Room", exact: true }) })
    .first();
  const tile = card.locator("[data-light-entry]").first();
  await expect(tile).toBeVisible();
  // Where the arrow is, whatever is on top there: a locator's click would
  // wait for the arrow itself to take it.
  const arrow = card.locator(".chakra-card__header [data-part=indicator]");
  const tapArrow = async () => {
    const box = (await arrow.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  };
  await splashGone(page);
  await tapArrow();
  await expect(tile).toBeHidden();
  await tapArrow();
  await expect(tile).toBeVisible();
});
