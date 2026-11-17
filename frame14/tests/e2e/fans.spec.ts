import { expect, test } from "@playwright/test";
import { dialReading, resetStub, stub } from "./helpers";

test.describe("the Fans card", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test("shows every fan with its speed", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByRole("button", { name: "Living Room Ceiling Fan: 50%" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Guest Room Fan: off" })).toBeVisible();
  });

  // 0.157.0: the keyframes the fan icons named went in 0.50.0, and none spun.
  test("a running fan's icon spins at its pace, the card's title with it, and none under reduced motion", async ({ page, request }) => {
    await page.goto("/home");
    const on = page.getByRole("button", { name: "Living Room Ceiling Fan: 50%" }).locator("[data-fan-icon]");
    const off = page.getByRole("button", { name: "Guest Room Fan: off" }).locator("[data-fan-icon]");
    const title = page.locator('[data-card="fan"] .chakra-card__header [data-fan-icon]');
    await expect(on).toHaveCSS("animation-name", "spin");
    // 50%: six seconds a turn (3s at full speed, 7.5s at a quarter).
    await expect(on).toHaveCSS("animation-duration", "6s");
    await expect(off).toHaveCSS("animation-name", "none");
    await expect(title).toHaveCSS("animation-name", "spin");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(on).toHaveCSS("animation-name", "none");
    await page.emulateMedia({ reducedMotion: "no-preference" });

    // Off in Home Assistant: the tile and the title stand still.
    await stub(request, "/_stub/state", { entity_id: "fan.living_room_ceiling_fan", state: "off" });
    await expect(page.getByRole("button", { name: "Living Room Ceiling Fan: off" })).toBeVisible();
    await expect(title).toHaveCSS("animation-name", "none");
  });

  // 0.173.0, the user: "Add a wind animation to the spinning fan icon that
  // is feathered like the light icon but make it feel like wind not light
  // … Use their respective colors".
  test("a running fan blows: feathered trails of wind in the fan's teal, swept round and thrown outwards at its pace, and none off or under reduced motion", async ({ page, request }) => {
    await page.goto("/home");
    const tile = page.getByRole("button", { name: "Living Room Ceiling Fan: 50%" });
    const title = page.locator('[data-card="fan"] .chakra-card__header');
    const wind = tile.locator("[data-fan-wind]");
    const gusts = wind.locator("[data-fan-gust]");
    await expect(gusts).toHaveCount(2);
    await expect(title.locator("[data-fan-wind] [data-fan-gust]")).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Guest Room Fan: off" }).locator("[data-fan-wind]")).toHaveCount(0);

    // At the fan's pace: a gust leaves in six tenths of a turn — 50% is six
    // seconds a turn, and the title's turns at the full pace, three.
    await expect(gusts.first()).toHaveCSS("animation-duration", "3.6s");
    await expect(title.locator("[data-fan-gust]").first()).toHaveCSS("animation-duration", "1.8s");
    // One gust half way out as the next leaves the blades.
    await expect(gusts.first()).toHaveCSS("animation-delay", "0s");
    await expect(gusts.last()).toHaveCSS("animation-delay", "-1.8s");

    // In the fan's colour — the lit tile's own teal —, the title's too,
    // whose glyph is the title's colour.
    const colour = (el: typeof wind) => el.evaluate((node) => getComputedStyle(node).color);
    const teal = await colour(tile.locator("[data-fan-icon]"));
    expect(await colour(wind)).toBe(teal);
    expect(await colour(title.locator("[data-fan-wind]"))).toBe(teal);
    expect(await colour(title.locator("[data-fan-icon]"))).not.toBe(teal);

    const gust = await gusts.first().evaluate((el) => {
      const cs = getComputedStyle(el);
      const [animation] = el.getAnimations();
      const frames = (animation.effect as KeyframeEffect).getKeyframes();
      const turn = (transform: string) => Number(/rotate\(([-\d.]+)deg\)/.exec(transform)?.[1]);
      const size = (transform: string) => Number(/scale\(([\d.]+)\)/.exec(transform)?.[1]);
      return {
        moved: [...new Set(frames.flatMap((f) => Object.keys(f)))].filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k)).sort(),
        turned: turn(String(frames.at(-1)!.transform)) - turn(String(frames[0].transform)),
        grew: size(String(frames.at(-1)!.transform)) / size(String(frames[0].transform)),
        ends: [frames[0].opacity, frames.at(-1)!.opacity],
        blur: cs.filter,
        trails: cs.backgroundImage,
        band: cs.maskImage || cs.webkitMaskImage,
        taps: getComputedStyle(el.parentElement!).pointerEvents,
        // Over the glyph's own box: it takes no room.
        box: [el.parentElement!.offsetWidth, el.parentElement!.offsetHeight],
        glyph: [(el.parentElement!.parentElement as HTMLElement).offsetWidth, (el.parentElement!.parentElement as HTMLElement).offsetHeight],
      };
    });
    // Moved by the compositor alone: nothing repaints, and the blur never changes.
    expect(gust.moved).toEqual(["opacity", "transform"]);
    // Swept on the way the blades turn, and thrown outwards, from nothing to nothing.
    expect(gust.turned).toBeGreaterThan(90);
    expect(gust.grew).toBeGreaterThan(1.5);
    expect(gust.ends).toEqual(["0", "0"]);
    // Feathered: soft-edged trails, each fading along its length.
    expect(gust.blur).toMatch(/^blur\([\d.]+px\)$/);
    expect(gust.trails).toContain("conic-gradient");
    expect(gust.band).toContain("radial-gradient");
    expect(gust.taps).toBe("none");
    expect(gust.box).toEqual(gust.glyph);

    // The fan stands still under reduced motion, and so does the air.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(wind).toBeHidden();
    await expect(title.locator("[data-fan-wind]")).toBeHidden();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(gusts.first()).toHaveCSS("animation-duration", "3.6s");

    // Off in Home Assistant: no wind, on the tile or the title.
    await stub(request, "/_stub/state", { entity_id: "fan.living_room_ceiling_fan", state: "off" });
    await expect(page.getByRole("button", { name: "Living Room Ceiling Fan: off" })).toBeVisible();
    await expect(page.locator('[data-card="fan"] [data-fan-wind]')).toHaveCount(0);
  });

  test("a tile opens the thermostat's dial for the speed, and its + steps it, sent once the taps stop", async ({ page }) => {
    await page.goto("/home");
    await page.getByRole("button", { name: "Living Room Ceiling Fan: 50%" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // The thermostat's arc, 0 to 100 (0.140), its reading and the mic's close button.
    const dial = dialog.getByRole("slider", { name: "Fan speed" });
    await expect(dial).toHaveAttribute("aria-valuemin", "0");
    await expect(dial).toHaveAttribute("aria-valuemax", "100");
    await expect(dial).toHaveAttribute("aria-valuenow", "50");
    await expect(dialog.getByText("Fan running")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close" })).toBeVisible();
    // No mode and no temperature: a fan has a speed.
    await expect(dialog.getByText("Heat", { exact: true })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: /target temperature/ })).toHaveCount(0);

    await dialog.getByRole("button", { name: "Raise the fan speed" }).click();
    await expect.poll(() => dialReading(dialog)).toBe("75%");
    await expect(dial).toHaveAttribute("aria-valuenow", "75");
    // Closed before the taps' send: it still reaches Home Assistant.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Living Room Ceiling Fan: 75%" })).toBeVisible();
  });

  test("stepped down to nothing, the fan is turned off", async ({ page }) => {
    await page.goto("/home");
    await page.getByRole("button", { name: "Living Room Ceiling Fan: 50%" }).click();
    const dialog = page.getByRole("dialog");
    const lower = dialog.getByRole("button", { name: "Lower the fan speed" });
    await lower.click();
    await lower.click();
    await expect.poll(() => dialReading(dialog)).toBe("0%");
    await expect(dialog.getByText("Fan off")).toBeVisible();
    await expect(lower).toBeDisabled();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Living Room Ceiling Fan: off" })).toBeVisible();
  });
});
