import { expect, test } from "@playwright/test";
import { resetStub, splashGone } from "./helpers";

// The voice overlay is surfaceless since 0.163.0: no card — the orb and the
// words float on a wash of the page's own colour, frosted (16px) where a
// modal may blur (never on Android: the phone project's UA), and a tap
// anywhere, the words included, closes it. In portrait the words stop above
// the bottom bar. The browser here has no microphone, so a tap on the mic
// opens it on its error.
test.beforeEach(async ({ request }) => {
  await resetStub(request);
});

test("the voice overlay floats on a frosted wash, clear of the bottom bar, and a tap on its words closes it", async ({ page, isMobile }) => {
  await page.goto("/home");
  await splashGone(page);
  await page.getByRole("button", { name: "Ask the house" }).click();
  const overlay = page.locator("[data-voice-overlay]");
  const words = overlay.getByText("Tap anywhere to close");
  await expect(words).toBeVisible();
  await expect(overlay.locator("[data-voice-orb]")).toHaveAttribute("data-voice-orb", "error");
  // Settled: the sheet's slide and the dialog's scale-in finished.
  await overlay.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));

  const surface = await overlay.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { background: cs.backgroundColor, shadow: cs.boxShadow };
  });
  expect(surface).toEqual({ background: "rgba(0, 0, 0, 0)", shadow: "none" });
  const filter = await page.locator("[data-voice-backdrop]").evaluate((el) => getComputedStyle(el).backdropFilter);
  if (isMobile) expect(filter).toBe("none");
  else expect(filter).toContain("blur(16px)");

  if (isMobile) {
    const barTop = await page.locator('[data-nav="bar"]').evaluate((el) => el.getBoundingClientRect().top);
    expect((await words.boundingBox())!.y + (await words.boundingBox())!.height).toBeLessThan(barTop);
  }

  // A tap on the words is a tap on the backdrop.
  const box = (await words.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(overlay).toBeHidden();
});

// The frame, an Android tablet in Fully Kiosk: its WebView lagged under a
// full-screen backdrop-filter (0.135.1), so the overlay keeps it to the wash
// alone — no blur or filter anywhere in it — and moves only by compositor
// properties (the sheet's slide, the spinner's turn, fades).
test.describe("on the Android tablet", () => {
  test.use({
    viewport: { width: 1600, height: 2400 },
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; SM-X200 Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Safari/537.36",
    hasTouch: true,
  });

  test("the voice overlay has no blur or filter and animates only transforms and opacity", async ({ page, isMobile }) => {
    test.skip(isMobile, "the tablet is emulated once, in the desktop project");
    await page.addInitScript(() => localStorage.setItem("device-mode", "frame"));
    await page.goto("/home");
    await splashGone(page);
    expect(await page.evaluate(() => document.documentElement.hasAttribute("data-backdrop-blur"))).toBe(false);
    await page.getByRole("button", { name: "Ask the house" }).click();
    const overlay = page.locator("[data-voice-overlay]");
    await expect(overlay.getByText("Tap anywhere to close")).toBeVisible();

    const found = await page.evaluate(() => {
      const backdrop = document.querySelector("[data-voice-backdrop]")!;
      const content = document.querySelector("[data-voice-overlay]")!;
      const els = [backdrop, content, ...content.querySelectorAll("*")];
      const filtered = els
        .filter((el) => {
          const cs = getComputedStyle(el);
          return cs.backdropFilter !== "none" || cs.filter !== "none";
        })
        .map((el) => el.outerHTML.slice(0, 80));
      const COMPOSITED = new Set(["transform", "translate", "rotate", "scale", "opacity", "offset", "computedOffset", "easing", "composite"]);
      const painted = els
        .flatMap((el) => el.getAnimations())
        .flatMap((a) => (a.effect as KeyframeEffect).getKeyframes().flatMap((k) => Object.keys(k)))
        .filter((prop) => !COMPOSITED.has(prop));
      return { filtered, painted: [...new Set(painted)] };
    });
    expect(found).toEqual({ filtered: [], painted: [] });
  });
});
