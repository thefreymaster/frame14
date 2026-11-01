import { expect, test } from "@playwright/test";

// 0.138: a page's tabs are its sub-routes (the user: "tabs should always be
// sub routes") — /energy/circuits, /weather/radar, /control/display — the
// page alone landing on its first tab where it has tabs, the old `?tab=` and
// the old pages (/power, /solar, /radar) taken to theirs, and the nav's
// selected entry the page's whichever tab is up.
test.describe("tabs as sub-routes", () => {
  test("Energy: the page lands on Solar, a tab is its address, and the old addresses land on theirs", async ({ page, isMobile }) => {
    await page.goto("/energy");
    await expect(page).toHaveURL(/\/energy\/solar$/);
    await expect(page.getByRole("tab", { name: "Solar" })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: "Circuits" }).click();
    await expect(page).toHaveURL(/\/energy\/circuits$/);
    await expect(page.getByRole("tab", { name: "Circuits" })).toHaveAttribute("aria-selected", "true");
    // The nav's Energy entry is selected on either tab (a remote's nav
    // starts without Energy, so the frame's project checks it).
    if (!isMobile) await expect(page.getByRole("tab", { name: "Energy" }).first()).toHaveAttribute("aria-selected", "true");
    // A reload keeps the tab.
    await page.reload();
    await expect(page).toHaveURL(/\/energy\/circuits$/);
    await expect(page.getByRole("tab", { name: "Circuits" })).toHaveAttribute("aria-selected", "true");
    for (const [from, to] of [
      ["/energy?tab=circuits", "/energy/circuits"],
      ["/power", "/energy/circuits"],
      ["/solar", "/energy/solar"],
      ["/energy/nonsense", "/energy/solar"],
    ] as const) {
      await page.goto(from);
      await expect(page, from).toHaveURL(new RegExp(`${to}$`));
    }
  });

  test("Weather: a tab is its address where there are tabs; a desktop keeps the page and reaches the radar", async ({ page, isMobile }) => {
    await page.goto("/radar");
    await expect(page).toHaveURL(/\/weather\/radar$/);
    await page.goto("/weather?tab=daily");
    await expect(page).toHaveURL(/\/weather\/daily$/);
    await page.goto("/weather");
    if (!isMobile) {
      // A desktop lays the page out whole: no tabs, the address stays.
      await expect(page).toHaveURL(/\/weather$/);
      await expect(page.getByRole("tab", { name: "Hourly" })).toHaveCount(0);
      await page.goto("/weather/nonsense");
      await expect(page).toHaveURL(/\/weather$/);
      return;
    }
    await expect(page).toHaveURL(/\/weather\/hourly$/);
    await page.getByRole("tab", { name: /-day|Daily/ }).click();
    await expect(page).toHaveURL(/\/weather\/daily$/);
    await page.reload();
    await expect(page.getByRole("tab", { name: /-day|Daily/ })).toHaveAttribute("aria-selected", "true");
  });

  test("Settings: a phone's tab is its address; a wider screen keeps the page whatever the address says", async ({ page, isMobile }) => {
    await page.goto("/control");
    if (!isMobile) {
      await expect(page).toHaveURL(/\/control$/);
      await page.goto("/control/device");
      await expect(page.getByRole("heading", { name: "Software" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Display" })).toBeVisible();
      return;
    }
    await expect(page).toHaveURL(/\/control\/views$/);
    await page.getByRole("tab", { name: "Display" }).click();
    await expect(page).toHaveURL(/\/control\/display$/);
    await expect(page.getByRole("heading", { name: "Screen", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("tab", { name: "Display" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tab", { name: "Settings" }).first()).toHaveAttribute("aria-selected", "true");
    await page.goto("/control/nonsense");
    await expect(page).toHaveURL(/\/control\/views$/);
  });
});
