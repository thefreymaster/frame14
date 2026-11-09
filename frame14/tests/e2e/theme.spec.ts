import { expect, test, type Page } from "@playwright/test";
import { splashGone } from "./helpers";

// 0.163.2, the user: "Bright mode isn't working on frame14 devices". The
// frames' browser — Android's WebView in Fully Kiosk — darkens a page itself
// while the tablet's system is dark (algorithmic darkening), unless the page
// says not to: the page was Bright, its colours light, and the screen dark.
// Chromium's forceDarkModeEnabled setting is that darkening; this file runs
// under it, on a dark system, as a frame.
test.use({
  colorScheme: "dark",
  launchOptions: { args: ["--blink-settings=forceDarkModeEnabled=true"] },
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("device-mode", "frame"));
});

/**
 * The colour on screen just inside the first card's top edge (its padding, so
 * nothing but the card's face), as [r, g, b]: what was painted, darkening and
 * all, not what the styles say.
 */
async function cardPaint(page: Page): Promise<number[]> {
  const box = await page.locator(".chakra-card__root").first().boundingBox();
  if (!box) return [];
  const png = await page.screenshot({
    clip: { x: box.x + box.width / 2, y: box.y + 4, width: 1, height: 1 },
    scale: "css",
  });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const g = canvas.getContext("2d")!;
    g.drawImage(img, 0, 0);
    return Array.from(g.getImageData(0, 0, 1, 1).data.slice(0, 3));
  }, png.toString("base64"));
}

const darkest = async (page: Page) => Math.min(...(await cardPaint(page)));
const lightest = async (page: Page) => Math.max(...(await cardPaint(page)));

test("Bright stays bright on a frame whose browser darkens pages itself (0.163.2)", async ({ page }) => {
  const display = page.locator(".chakra-card__root", { has: page.getByRole("heading", { name: "Display" }) });
  const theme = display.getByRole("radiogroup", { name: "Theme" });
  const html = page.locator("html");
  try {
    await page.goto("/control/display");
    await theme.getByText("Bright", { exact: true }).click();
    await expect(html).toHaveAttribute("data-theme-mode", "bright");

    // The cards white on screen, not darkened.
    await page.goto("/home");
    await splashGone(page);
    await expect.poll(() => darkest(page)).toBeGreaterThan(200);
    // And from the first paint: index.html's early script, before the bundle.
    await page.reload();
    await splashGone(page);
    await expect.poll(() => darkest(page)).toBeGreaterThan(200);

    // Dark is the page's own dark.
    await page.goto("/control/display");
    await theme.getByText("Dark", { exact: true }).click();
    await expect(html).toHaveAttribute("data-theme-mode", "dark");
    await page.goto("/home");
    await splashGone(page);
    await expect.poll(() => lightest(page)).toBeLessThan(60);
  } finally {
    // The add-on keeps the theme for every later page: back to Dark.
    await page.goto("/control/display");
    await theme.getByText("Dark", { exact: true }).click();
    await expect(theme.getByRole("radio", { name: "Dark" })).toBeChecked();
  }
});
