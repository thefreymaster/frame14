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
