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
