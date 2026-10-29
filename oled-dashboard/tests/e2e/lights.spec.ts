import { expect, test, type Page } from "@playwright/test";
import { lightTile, resetStub, stub } from "./helpers";

/** The board titled `title`, and the tiles in it. */
function board(page: Page, title: string) {
  return page
    .locator(".chakra-card__root")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) })
    .first();
}

test.describe("the Lights page", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test("groups the lights by Home Assistant's rooms", async ({ page }) => {
    await page.goto("/lights");
    // The configured rooms first, then the rooms the other lights are in,
    // then the switches in no room; nothing is left for "Other lights".
    for (const room of ["Living Room", "Kitchen", "Outside", "Aiden's Room", "Basement", "Evan's Office", "Primary Bedroom", "Switches"]) {
      await expect(page.getByRole("heading", { name: room, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Other lights" })).toHaveCount(0);

    // Living Room holds the three configured lights and the Floor Lamp the
    // room brought in; Outside the porch light, placed through its device.
    await expect(board(page, "Living Room").locator("[data-light-entry]")).toHaveCount(4);
    await expect(board(page, "Living Room").getByRole("button", { name: /^Floor Lamp:/ })).toBeVisible();
    await expect(board(page, "Kitchen").locator("[data-light-entry]")).toHaveCount(2);
    await expect(board(page, "Outside").getByRole("button", { name: /^Front Porch:/ })).toBeVisible();
    await expect(board(page, "Switches").locator("[data-light-entry]")).toHaveCount(1);
  });

  test("a tap turns a light off, and on again", async ({ page }) => {
    await page.goto("/lights");
    const tile = lightTile(page, "Living Room");
    await expect(tile).toHaveAttribute("aria-label", "Living Room: 80%");
    await expect(tile).toHaveAttribute("aria-pressed", "true");

    await tile.click();
    await expect(tile).toHaveAttribute("aria-label", "Living Room: Off");
    await expect(tile).toHaveAttribute("aria-pressed", "false");

    await tile.click();
    await expect(tile).toHaveAttribute("aria-label", "Living Room: 80%");
  });

  test("the tile spins until Home Assistant reports the change", async ({ page, request }) => {
    await stub(request, "/_stub/service", { delay_ms: 1500 });
    await page.goto("/lights");
    const tile = lightTile(page, "Living Room");
    await tile.click();
    await expect(tile).toHaveAttribute("aria-busy", "true");
    await expect(tile).toHaveAttribute("aria-busy", "false");
    await expect(tile).toHaveAttribute("aria-label", "Living Room: Off");
  });

  test("a call Home Assistant refuses shows an error toast and leaves the light as it was", async ({ page, request }) => {
    await stub(request, "/_stub/service", { fail: { "light.kitchen_main_lights": "The bulb isn't answering" } });
    await page.goto("/lights");
    const tile = lightTile(page, "Kitchen Main Lights");
    await expect(tile).toHaveAttribute("aria-label", "Kitchen Main Lights: Off");
    await tile.click();
    await expect(page.getByText("Couldn't turn on Kitchen Main Lights")).toBeVisible();
    await expect(page.getByText("The bulb isn't answering")).toBeVisible();
    await expect(tile).toHaveAttribute("aria-busy", "false");
    await expect(tile).toHaveAttribute("aria-label", "Kitchen Main Lights: Off");
  });

  test("All off turns off every light but the kid's hatch light", async ({ page }) => {
    await page.goto("/lights");
    const on = page.locator("[data-light-entry][aria-pressed=true]");
    await expect(on).toHaveCount(5);
    await page.getByRole("button", { name: "Turn off all lights" }).click();
    await expect(on).toHaveCount(1);
    await expect(on).toHaveAttribute("aria-label", /^Kid's Hatch Light: /);
    // With only the spared light on there is nothing left to turn off.
    await expect(page.getByRole("button", { name: "Turn off all lights" })).toHaveCount(0);
  });

  test("a light the registry moves to another room regroups live", async ({ page, request }) => {
    await page.goto("/lights");
    await expect(board(page, "Living Room").locator("[data-light-entry]")).toHaveCount(4);
    await stub(request, "/_stub/registry", { entity_id: "light.lady_lamp", area_id: "kitchen" });
    await expect(board(page, "Kitchen").getByRole("button", { name: /^Reading Nook:/ })).toBeVisible();
    await expect(board(page, "Living Room").locator("[data-light-entry]")).toHaveCount(3);
  });
});
