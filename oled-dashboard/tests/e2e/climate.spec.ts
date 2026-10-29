import { expect, test } from "@playwright/test";
import { resetStub } from "./helpers";

test.describe("the Climate page", () => {
  test.beforeEach(async ({ request }) => {
    await resetStub(request);
  });

  test("shows every thermostat with what it's doing", async ({ page }) => {
    await page.goto("/climate");
    await expect(page.getByRole("button", { name: /^1st Floor AC: 64°, Heating to 70°/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^2nd Floor AC: 68°, Off/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^3rd Floor AC: 75°, Cooling to 72°/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Master Room AC: 68°, Off/ })).toBeVisible();
  });

  test("a tile opens the dialog, and a new mode reaches Home Assistant", async ({ page }) => {
    await page.goto("/climate");
    await page.getByRole("button", { name: /^2nd Floor AC:/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("System off")).toBeVisible();

    await dialog.getByText("Heat", { exact: true }).click();
    await expect(dialog.getByText("Heat standby")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: /^2nd Floor AC: 68°, Heat, set to 68°/ })).toBeVisible();
  });

  test("a live change from Home Assistant updates the tile", async ({ page, request }) => {
    await page.goto("/climate");
    await expect(page.getByRole("button", { name: /^1st Floor AC: 64°, Heating to 70°/ })).toBeVisible();
    await request.post("http://127.0.0.1:8310/_stub/state", {
      data: { entity_id: "climate.samsung_airconditioner_1", state: "heat", attributes: { current_temperature: 70, hvac_action: "idle" } },
    });
    await expect(page.getByRole("button", { name: /^1st Floor AC: 70°, Heat, set to 70°/ })).toBeVisible();
  });
});
