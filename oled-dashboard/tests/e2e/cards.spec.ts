import { expect, test } from "@playwright/test";
import { resetStub } from "./helpers";

// Every card with a title has an icon beside it (0.127): the title's row —
// SectionTitle's HStack — holds an svg. A heading inside a card's body (Today
// and Tomorrow in the calendar card, Next hours in the forecast's) is a
// section of the card, not its title, so only the headers are looked at.
// Inactive tabs' cards (Weather's, a phone's Settings) are in the DOM too.
// /media isn't routed while the Media page is off (router.tsx).
const PAGES = [
  "/home",
  "/lights",
  "/climate",
  "/energy",
  "/energy?tab=circuits",
  "/weather",
  "/printer",
  "/vacuum",
  "/cameras",
  "/calendar",
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
