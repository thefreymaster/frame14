import { expect, test } from "@playwright/test";
import { pageErrors, resetStub } from "./helpers";

test.beforeEach(async ({ request }) => {
  await resetStub(request);
});

test("the home page comes up with live cards and no errors", async ({ page }) => {
  const errors = pageErrors(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/home$/);

  // The header, the climate card's tiles (named by climate_names, read live
  // from the stub), the energy card's figure.
  await expect(page.getByText("Frame14").first()).toBeVisible();
  await expect(page.getByText("1st Floor AC")).toBeVisible();
  await expect(page.getByText("Heating to 70°")).toBeVisible();
  await expect(page.getByText("Cooling to 72°")).toBeVisible();
  await expect(page.getByText("Solar covered today")).toBeVisible();

  expect(errors).toEqual([]);
});

test("the navigation reaches every main page", async ({ page }) => {
  await page.goto("/home");
  for (const [label, path] of [
    ["Lights", "/lights"],
    ["Climate", "/climate"],
    ["Settings", "/control"],
  ] as const) {
    await page.getByRole("tab", { name: label }).first().click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});
